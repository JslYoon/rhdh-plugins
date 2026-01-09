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

import { LlamaStackClient } from 'llama-stack-client';

import { SessionDocument } from '../../types/notebooks-types';

interface UpsertResult {
  document_id: string;
  chunks_created: number;
  replaced: boolean;
}

/**
 * Service for managing documents within notebook sessions
 * Each session has its own dedicated vector database, so no metadata filtering is needed
 */
export class DocumentService {
  private logger: LoggerService;
  private llamaStackUrl: string;
  private chunkSize: number = 512;

  constructor(llamaStackUrl: string, logger: LoggerService) {
    this.llamaStackUrl = llamaStackUrl;
    this.logger = logger;
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
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled'
    );
  }

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

  async upsertDocument(
    vectorDbId: string,
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<UpsertResult> {
    const documentId = this.sanitizeTitle(title);

    const client = new LlamaStackClient({ baseURL: this.llamaStackUrl });

    const existingQuery = await client.vectorIo.query({
      vector_db_id: vectorDbId,
      query: documentId,
      params: {
        max_chunks: 100,
      },
    });

    const replaced = existingQuery.chunks && existingQuery.chunks.length > 0;

    // Chunks with the same chunk_id will be overwritten on insert
    const contentChunks = this.chunkContent(content);
    this.logger.info(`Split content into ${contentChunks.length} chunks`);

    const chunks = contentChunks.map((chunkContent, index) => {
      const chunkId = `${documentId}#chunk-${index}`;
      return {
        content: chunkContent,
        metadata: {
          document_id: documentId,
          ...(metadata || {}),
        },
        chunk_metadata: {
          chunk_id: chunkId,
          document_id: documentId,
        },
      };
    });

    await client.vectorIo.insert({
      vector_db_id: vectorDbId,
      chunks,
    });

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
    sessionId: string,
    userId: string,
    vectorDbId: string,
  ): Promise<SessionDocument[]> {
    this.logger.info(`Listing documents for session ${sessionId}`);

    const client = new LlamaStackClient({ baseURL: this.llamaStackUrl });

    const result = await client.vectorIo.query({
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
    const documentMap = new Map<string, SessionDocument>();

    for (const chunk of result.chunks) {
      const docId = chunk.chunk_metadata?.document_id;

      // Skip session metadata chunk
      if (!docId || docId === '__session_metadata__') continue;

      if (!documentMap.has(docId)) {
        documentMap.set(docId, {
          document_id: docId,
          title: docId,
          session_id: sessionId,
          user_id: userId,
          content_preview:
            typeof chunk.content === 'string'
              ? chunk.content.substring(0, 200)
              : '',
          source_type: 'text',
          created_at: new Date().toISOString(),
          metadata: {},
        });
      }
    }

    const documents = Array.from(documentMap.values());
    this.logger.info(
      `Found ${documents.length} documents in session ${sessionId}`,
    );
    return documents;
  }
}
