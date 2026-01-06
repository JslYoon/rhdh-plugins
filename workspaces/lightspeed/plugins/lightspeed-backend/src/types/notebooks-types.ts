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

/**
 * Session metadata
 * @public
 */
export interface SessionMetadata {
  /** Tags for categorizing the session */
  tags?: string[];

  /** Category or type of session */
  category?: string;

  /** Project or team this session belongs to */
  project?: string;

  /** Custom key-value metadata */
  custom?: Record<string, string>;
}

/**
 * NotebookSession represents an AI Notebook session containing related documents
 * @public
 */
export interface NotebookSession {
  /** Unique session identifier */
  session_id: string;

  /** User who owns this session (e.g., "user:default/john-doe") */
  user_id: string;

  /** Human-readable session name */
  name: string;

  /** Optional description of the session */
  description?: string;

  /** Unique vector database ID for this session's RAG data */
  vector_db_id: string;

  /** ISO 8601 timestamp when session was created */
  created_at: string;

  /** ISO 8601 timestamp when session was last updated */
  updated_at: string;

  /** Optional metadata for categorization and filtering */
  metadata?: SessionMetadata;
}

/**
 * Response from creating a session
 * @public
 */
export interface SessionResponse {
  status: 'success';
  session: NotebookSession;
  message: string;
}

/**
 * Response from listing all sessions for a user
 * @public
 */
export interface SessionListResponse {
  status: 'success';
  sessions: NotebookSession[];
  count: number;
}

/**
 * Document metadata
 * @public
 */
export interface DocumentMetadata {
  /** File type/extension (pdf, md, txt, json, yaml, log) */
  fileType?: string;

  /** Original filename */
  fileName?: string;

  /** Original filename when uploaded (for file uploads) */
  originalFileName?: string;

  /** File size in bytes */
  fileSizeBytes?: number;

  /** Number of pages (for PDFs) */
  pageCount?: number;

  /** Timestamp when file was parsed */
  parseTimestamp?: string;

  /** Session metadata at time of document creation */
  sessionMetadata?: SessionMetadata;

  /** Custom key-value metadata */
  custom?: Record<string, any>;
}

/**
 * Document metadata within a session
 * @public
 */
export interface SessionDocument {
  /** Unique document identifier within the session (derived from title) */
  document_id: string;

  /** Human-readable document title (same as document_id) */
  title: string;

  /** Session this document belongs to */
  session_id: string;

  /** User who uploaded this document */
  user_id: string;

  /** Preview of document content (first 200 chars) */
  content_preview: string;

  /** Type of source document */
  source_type: 'text';

  /** ISO 8601 timestamp when document was uploaded */
  created_at: string;

  /** Document metadata including file info and session context */
  metadata?: DocumentMetadata;
}

/**
 * Response from upserting a document
 * @public
 */
export interface DocumentResponse {
  status: 'success';
  document_id: string;
  title: string;
  session_id: string;
  chunks_created: number;
  replaced?: boolean;
  message: string;
}

/**
 * Response from listing all documents in a session
 * @public
 */
export interface SessionDocumentListResponse {
  status: 'success';
  session_id: string;
  documents: SessionDocument[];
  count: number;
}
