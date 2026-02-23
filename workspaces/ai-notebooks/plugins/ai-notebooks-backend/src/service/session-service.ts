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
import { NotebookSession, SessionMetadata } from '../types';

const SESSION_METADATA_DOC_ID = '__session_metadata__';

/**
 * Service for managing notebook sessions with dedicated vector databases
 * - Session ID format: session-{sanitized_user_id}-{timestamp}-{random}
 * - Metadata stored as special chunk for persistence
 * - Uses ONLY Llama Stack APIs (no direct database access)
 */
export class SessionService {
  private logger: LoggerService;
  private client: LlamaStackClient;
  private embeddingModel: string;
  private embeddingDimension: number;
  private providerId: string;

  constructor(llamaStackUrl: string, logger: LoggerService, config?: Config) {
    this.client = new LlamaStackClient({ baseURL: llamaStackUrl });
    this.logger = logger;

    // Read from config or use Llama Stack 0.5 distribution defaults
    this.embeddingModel =
      config?.getOptionalString('aiNotebooks.llamaStack.embeddingModel') ||
      'granite-embedding-125m-english';

    this.embeddingDimension =
      config?.getOptionalNumber('aiNotebooks.llamaStack.embeddingDimension') ||
      768;

    this.providerId =
      config?.getOptionalString('aiNotebooks.llamaStack.vectorIo.providerId') ||
      'milvus';
  }

  private sanitizeUserId(userId: string): string {
    return userId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateSessionId(userId: string): string {
    const sanitized = this.sanitizeUserId(userId);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `session-${sanitized}-${timestamp}-${random}`;
  }

  private async storeMetadata(session: NotebookSession): Promise<void> {
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

  private async retrieveMetadata(
    vectorDbId: string,
  ): Promise<NotebookSession | null> {
    try {
      const result = await this.client.vectorIo.query({
        vector_db_id: vectorDbId,
        query: SESSION_METADATA_DOC_ID,
        params: { max_chunks: 10 },
      });

      // Filter for all session metadata chunks
      const metadataChunks = result.chunks?.filter(
        c => c.chunk_metadata?.chunk_id === SESSION_METADATA_DOC_ID,
      ) || [];

      if (metadataChunks.length === 0) return null;

      // Parse all metadata chunks and sort by updated_at to get the most recent
      const sessions = metadataChunks
        .map(chunk => {
          try {
            const content =
              typeof chunk.content === 'string'
                ? chunk.content
                : JSON.stringify(chunk.content);
            return JSON.parse(content) as NotebookSession;
          } catch (parseError) {
            this.logger.warn(`Failed to parse metadata chunk: ${parseError}`);
            return null;
          }
        })
        .filter((session): session is NotebookSession => session !== null)
        .sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

      // Return the most recent session metadata
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      this.logger.error(`Failed to retrieve session metadata: ${error}`);
      return null;
    }
  }

  async createSession(
    userId: string,
    name: string,
    description?: string,
    metadata?: SessionMetadata,
  ): Promise<NotebookSession> {
    const sessionId = this.generateSessionId(userId);
    const now = new Date().toISOString();

    this.logger.info(`Creating session ${sessionId} for user ${userId}`);

    // Register a new vector database for this session
    const vectorStore = await this.client.vectorStores.create({
      name: sessionId,
      embedding_model: this.embeddingModel,
      embedding_dimension: this.embeddingDimension,
      provider_id: this.providerId,
      metadata: {
        user_id: userId,
      },
    });

    const session: NotebookSession = {
      session_id: sessionId,
      user_id: userId,
      name,
      description: description || '',
      vector_db_id: vectorStore.id,
      created_at: now,
      updated_at: now,
      metadata,
    };

    // Store session metadata as a special chunk
    await this.storeMetadata(session);
    return session;
  }

  async readSession(
    vectorDbId: string,
    userId: string,
  ): Promise<NotebookSession> {
    const session = await this.retrieveMetadata(vectorDbId);
    if (!session) {
      throw new Error(`Session ${vectorDbId} not found`);
    }

    // Verify ownership
    if (session.user_id !== userId) {
      throw new Error(
        `User ${userId} does not have access to session ${vectorDbId}`,
      );
    }

    return session;
  }

  async updateSession(
    vectorDbId: string,
    userId: string,
    name?: string,
    description?: string,
    metadata?: SessionMetadata,
  ): Promise<NotebookSession> {
    const existing = await this.readSession(vectorDbId, userId);

    const updated: NotebookSession = {
      ...existing,
      name: name || existing.name,
      description:
        description !== undefined ? description : existing.description,
      metadata: metadata !== undefined ? metadata : existing.metadata,
      updated_at: new Date().toISOString(),
    };

    await this.storeMetadata(updated);
    return updated;
  }

  async deleteSession(vectorDbId: string, userId: string): Promise<void> {
    // Verify ownership before deletion
    const session = await this.readSession(vectorDbId, userId);

    // Unregister the vector database
    await this.client.vectorStores.delete(session.vector_db_id);
    this.logger.info(`Session ${vectorDbId} deleted`);
  }

  async listSessions(userId: string): Promise<NotebookSession[]> {
    const vectorDbs = (await this.client.vectorStores.list()).data;
    const sessions: NotebookSession[] = [];
    for (const db of vectorDbs) {
      const session_user_id = db.metadata?.user_id as string || '';
      // Filter by user's session prefix
      if (session_user_id === userId) {
        const session = await this.retrieveMetadata(db.id);
        if (session?.user_id === userId) {
          sessions.push(session);
        }
      }
    }

    // Sort by created_at descending (newest first)
    return sessions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
