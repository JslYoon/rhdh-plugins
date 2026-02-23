/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { LlamaStackClient } from 'llama-stack-client';
import { SessionDocument, NotebookSession } from '../types';

interface UpsertResult {
  document_id: string;
  chunks_created: number;
  replaced: boolean;
}

const SESSION_METADATA_DOC_ID = '__session_metadata__';

/**
 * Service for managing documents within notebook sessions
 * Each session has its own dedicated vector database
 * Uses ONLY Llama Stack APIs (no direct database access)
 */
export class DocumentService {
  private logger: LoggerService;
  private client: LlamaStackClient;
  private chunkSize: number = 512;

  constructor(llamaStackUrl: string, logger: LoggerService, config?: Config) {
    this.client = new LlamaStackClient({ baseURL: llamaStackUrl });
    this.logger = logger;
    // config parameter added for consistency with SessionService
    // DocumentService uses vectorIo API which doesn't require provider_id
  }

  /**
   * Sanitize title to create a valid document ID
   * Converts title to lowercase, replaces spaces/special chars with hyphens
   * Public so it can be used by router for delete operations
   */
  sanitizeTitle(title: string): string {
    return (
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled'
    );
  }

  /**
   * Retrieve session metadata from vector DB
   */
  private async retrieveSessionMetadata(
    vectorDbId: string,
  ): Promise<NotebookSession | null> {
    try {
      const result = await this.client.vectorIo.query({
        vector_db_id: vectorDbId,
        query: SESSION_METADATA_DOC_ID,
        params: { max_chunks: 1 },
      });

      const chunk = result.chunks?.find(
        c => c.chunk_metadata?.chunk_id === SESSION_METADATA_DOC_ID,
      );

      if (!chunk) return null;

      const content =
        typeof chunk.content === 'string'
          ? chunk.content
          : JSON.stringify(chunk.content);

      return JSON.parse(content) as NotebookSession;
    } catch (error) {
      this.logger.error(`Failed to retrieve session metadata: ${error}`);
      return null;
    }
  }

  /**
   * Store session metadata in vector DB
   */
  private async storeSessionMetadata(
    session: NotebookSession,
  ): Promise<void> {
    await this.client.vectorIo.insert({
      vector_db_id: session.vector_db_id,
      chunks: [
        {
          content: JSON.stringify(session),
          metadata: {
            type: 'session_metadata',
            document_id: SESSION_METADATA_DOC_ID,
          },
          chunk_metadata: {
            chunk_id: SESSION_METADATA_DOC_ID,
            document_id: SESSION_METADATA_DOC_ID,
          },
        },
      ],
    });
  }

  /**
   * Split content into chunks of approximately 512 words
   */
  private chunkContent(content: string): string[] {
    const chunks: string[] = [];
    const words = content.split(/\s+/);

    for (let i = 0; i < words.length; i += this.chunkSize) {
      const chunk = words.slice(i, i + this.chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks.length > 0 ? chunks : [content];
  }

  async uploadDocument(
    vectorDbId: string,
    sessionId: string,
    userId: string,
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<UpsertResult> {
    const documentId = this.sanitizeTitle(title);

    // Check if document already exists
    const existingQuery = await this.client.vectorIo.query({
      vector_db_id: vectorDbId,
      query: documentId,
      params: {
        max_chunks: 100,
      },
    });

    const replaced = existingQuery.chunks && existingQuery.chunks.length > 0;

    // Chunk the content
    const contentChunks = this.chunkContent(content);
    this.logger.info(`Split content into ${contentChunks.length} chunks`);

    const now = Date.now();

    // Create chunks for insertion with ordering
    const chunks = contentChunks.map((chunkContent, index) => {
      const chunkId = `${documentId}#chunk-${index}`;
      return {
        content: chunkContent,
        metadata: {
          user_id: userId,
          document_id: documentId,
          title: title,
          chunk_index: index, // Track chunk order
          ...(metadata || {}),
        },
        chunk_metadata: {
          chunk_id: chunkId,
          document_id: documentId,
          created_timestamp: now,
          updated_timestamp: now,
        },
      };
    });

    // Insert chunks
    await this.client.vectorIo.insert({
      vector_db_id: vectorDbId,
      chunks,
    });

    // Update session metadata with document list
    const session = await this.retrieveSessionMetadata(vectorDbId);
    if (session) {
      const documentIds = session.metadata?.document_ids || [];
      if (!documentIds.includes(documentId)) {
        documentIds.push(documentId);
        session.metadata = {
          ...session.metadata,
          document_ids: documentIds,
          document_count: documentIds.length,
        };
        session.updated_at = new Date().toISOString();
        await this.storeSessionMetadata(session);
      }
    }

    this.logger.info(
      `Document "${title}" (ID: ${documentId}) ${replaced ? 'updated' : 'created'} with ${chunks.length} chunks`,
    );

    return {
      document_id: documentId,
      chunks_created: chunks.length,
      replaced,
    };
  }

  async listDocuments(
    vectorDbId: string,
    sessionId: string,
    userId: string,
    fileTypeFilter?: string,
  ): Promise<SessionDocument[]> {
    this.logger.info(`Listing documents for session ${sessionId}`);

    // Query for all documents
    const result = await this.client.vectorIo.query({
      vector_db_id: vectorDbId,
      query: 'document',
      params: {
        max_chunks: 1000,
      },
    });

    if (!result.chunks || result.chunks.length === 0) {
      return [];
    }

    // Group chunks by document_id to get unique documents
    const documentMap = new Map<
      string,
      { doc: SessionDocument; chunkCount: number }
    >();

    for (const chunk of result.chunks) {
      const docId = chunk.chunk_metadata?.document_id;

      // Skip session metadata chunk
      if (!docId || docId === SESSION_METADATA_DOC_ID) continue;

      // Apply file type filter if provided
      if (fileTypeFilter && chunk.metadata?.fileType !== fileTypeFilter) {
        continue;
      }

      if (!documentMap.has(docId)) {
        const metadata = chunk.metadata as Record<string, any>;
        const createdTimestamp = chunk.chunk_metadata?.created_timestamp;

        documentMap.set(docId, {
          doc: {
            document_id: docId,
            title: (metadata?.title as string) || docId,
            session_id: sessionId,
            user_id: userId,
            content_preview:
              typeof chunk.content === 'string'
                ? chunk.content.substring(0, 200)
                : '',
            source_type:
              (metadata?.fileType as SessionDocument['source_type']) || 'text',
            created_at: createdTimestamp
              ? new Date(createdTimestamp).toISOString()
              : new Date().toISOString(),
            chunk_count: 0,
            metadata: metadata || {},
          },
          chunkCount: 0,
        });
      }

      // Increment chunk count
      const entry = documentMap.get(docId)!;
      entry.chunkCount++;
      entry.doc.chunk_count = entry.chunkCount;
    }

    const documents = Array.from(documentMap.values()).map(entry => entry.doc);
    this.logger.info(
      `Found ${documents.length} documents in session ${sessionId}`,
    );
    return documents;
  }

  async query(
    sessionId: string,
    query: string,
    topK: number = 5,
  ): Promise<any[]> {
    // ✅ Use Llama Stack API for vector search
    // Llama Stack queries SQLite automatically
    const result = await this.client.vectorIo.query({
      vector_db_id: sessionId,
      query: query,
      params: {
        max_chunks: topK,
      },
    });

    return result.chunks || [];
  }
}
