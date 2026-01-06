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

import { NotebookSession, SessionMetadata } from '../../types/notebooks-types';

const SESSION_METADATA_DOC_ID = '__session_metadata__';

/**
 * Service for managing notebook sessions with dedicated vector databases
 * - Session ID format: session-{sanitized_user_id}-{timestamp}-{random}
 * - Metadata stored as special chunk for persistence
 */
export class SessionService {
  private logger: LoggerService;
  private client: LlamaStackClient;
  private embeddingModel = 'sentence-transformers/all-mpnet-base-v2';
  private embeddingDimension = 768;

  constructor(llamaStackUrl: string, logger: LoggerService) {
    this.client = new LlamaStackClient({ baseURL: llamaStackUrl });
    this.logger = logger;
  }

  private sanitizeUserId(userId: string): string {
    return userId
      .trim()
      .toLocaleLowerCase('en-US')
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

  async createSession(
    userId: string,
    name: string,
    description?: string,
    metadata?: SessionMetadata,
  ): Promise<NotebookSession> {
    const sessionId = this.generateSessionId(userId);
    const now = new Date().toISOString();

    this.logger.info(`Creating session ${sessionId} for user ${userId}`);

    await this.client.vectorDBs.register({
      vector_db_id: sessionId,
      embedding_model: this.embeddingModel,
      embedding_dimension: this.embeddingDimension,
    });

    const session: NotebookSession = {
      session_id: sessionId,
      user_id: userId,
      name,
      description: description || '',
      vector_db_id: sessionId,
      created_at: now,
      updated_at: now,
      metadata,
    };

    await this.storeMetadata(session);
    return session;
  }

  async readSession(
    sessionId: string,
    userId: string,
  ): Promise<NotebookSession> {
    const session = await this.retrieveMetadata(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.user_id !== userId) {
      throw new Error(
        `User ${userId} does not have access to session ${sessionId}`,
      );
    }

    return session;
  }

  async updateSession(
    sessionId: string,
    userId: string,
    name?: string,
    description?: string,
    metadata?: SessionMetadata,
  ): Promise<NotebookSession> {
    const existing = await this.readSession(sessionId, userId);

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

  async deleteSession(sessionId: string, userId: string): Promise<number> {
    const session = await this.readSession(sessionId, userId);
    await this.client.vectorDBs.unregister(session.vector_db_id);
    this.logger.info(`Session ${sessionId} deleted`);
    return 0;
  }

  async listSessions(userId: string): Promise<NotebookSession[]> {
    const prefix = `session-${this.sanitizeUserId(userId)}-`;
    const vectorDbs = await this.client.vectorDBs.list();

    const sessions: NotebookSession[] = [];

    for (const db of vectorDbs) {
      const dbId = typeof db === 'string' ? db : (db as any).identifier;

      if (dbId?.startsWith(prefix)) {
        const session = await this.retrieveMetadata(dbId);
        if (session?.user_id === userId) {
          sessions.push(session);
        }
      }
    }

    return sessions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
