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

import type {
  HttpAuthService,
  LoggerService,
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { NotAllowedError } from '@backstage/errors';

import { Router } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';

import {
  lightspeedChatCreatePermission,
  lightspeedNotebooksDocumentManagePermission,
  lightspeedNotebooksSessionCreatePermission,
  lightspeedNotebooksSessionDeletePermission,
  lightspeedNotebooksSessionReadPermission,
  lightspeedNotebooksSessionUpdatePermission,
} from '@red-hat-developer-hub/backstage-plugin-lightspeed-common';

import { checkPermission, getUserRef } from '../service/auth-helpers';
import { DocumentService } from '../service/notebooks/document-service';
import {
  isValidFileSize,
  isValidFileType,
  parseFile,
} from '../service/notebooks/fileParser';
import { SessionService } from '../service/notebooks/session-service';
import {
  QueryRequestBody,
  STATIC_VECTOR_DB_ID,
} from '../types/lightspeed-types';
import {
  DocumentResponse,
  SessionDocumentListResponse,
  SessionListResponse,
  SessionResponse,
} from '../types/notebooks-types';

export interface NotebooksRouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions: PermissionsService;
  sessionService: SessionService;
  documentService: DocumentService;
  port: number;
  notebookSystemPrompt?: string;
  mcpServerName?: string;
  mcpToken?: string;
}

export function createNotebooksRouter(options: NotebooksRouterOptions): Router {
  const {
    logger,
    httpAuth,
    userInfo,
    permissions,
    sessionService,
    documentService,
    port,
    notebookSystemPrompt,
    mcpServerName,
    mcpToken,
  } = options;

  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024,
    },
  });

  const handleError = (res: any, error: unknown, message: string) => {
    const errormsg = `${message}: ${error}`;
    logger.error(errormsg);

    if (error instanceof NotAllowedError) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: errormsg });
    }
  };

  /**
   * POST /v1/sessions
   * Create a new session
   */
  router.post('/v1/sessions', async (req, res) => {
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);

      await checkPermission(
        req,
        lightspeedNotebooksSessionCreatePermission,
        httpAuth,
        permissions,
      );

      const { name, description, metadata } = req.body;

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const session = await sessionService.createSession(
        userId,
        name,
        description,
        metadata,
      );

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session created successfully',
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error creating session');
    }
  });

  /**
   * GET /v1/sessions/:sessionId
   * Get a single session by ID
   */
  router.get('/v1/sessions/:sessionId', async (req, res) => {
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      await checkPermission(
        req,
        lightspeedNotebooksSessionReadPermission,
        httpAuth,
        permissions,
      );

      const session = await sessionService.readSession(sessionId, userId);

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session retrieved successfully',
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error reading session');
    }
  });

  /**
   * PUT /v1/sessions/:sessionId
   * Update an existing session
   */
  router.put('/v1/sessions/:sessionId', async (req, res) => {
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      await checkPermission(
        req,
        lightspeedNotebooksSessionUpdatePermission,
        httpAuth,
        permissions,
      );

      const { name, description, metadata } = req.body;

      const session = await sessionService.updateSession(
        sessionId,
        userId,
        name,
        description,
        metadata,
      );

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session updated successfully',
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error updating session');
    }
  });

  /**
   * DELETE /v1/sessions/:sessionId
   * Delete a session and all its documents
   */
  router.delete('/v1/sessions/:sessionId', async (req, res) => {
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      await checkPermission(
        req,
        lightspeedNotebooksSessionDeletePermission,
        httpAuth,
        permissions,
      );

      const session = await sessionService.readSession(sessionId, userId);
      await sessionService.deleteSession(sessionId, userId);

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session deleted successfully',
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error deleting session');
    }
  });

  /**
   * GET /v1/sessions
   * List all sessions for the authenticated user
   */
  router.get('/v1/sessions', async (req, res) => {
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);
      const allSessions = await sessionService.listSessions(userId);

      const category = req.query.category as string | undefined;
      const tagsParam = req.query.tags as string | undefined;
      const project = req.query.project as string | undefined;

      let filteredSessions = allSessions;

      if (category) {
        filteredSessions = filteredSessions.filter(
          session => session.metadata?.category === category,
        );
      }

      if (tagsParam) {
        const requestedTags = tagsParam.split(',').map(t => t.trim());
        filteredSessions = filteredSessions.filter(session => {
          if (!session.metadata?.tags) return false;
          return requestedTags.some(tag =>
            session.metadata!.tags!.includes(tag),
          );
        });
      }

      if (project) {
        filteredSessions = filteredSessions.filter(
          session => session.metadata?.project === project,
        );
      }

      const response: SessionListResponse = {
        status: 'success',
        sessions: filteredSessions,
        count: filteredSessions.length,
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error listing sessions');
    }
  });

  /**
   * POST /v1/sessions/:sessionId/query
   * Send a query to the AI assistant for notebook/session conversations
   * Uses session-specific vector DB with uploaded documents and notebook system prompts
   */
  router.post('/v1/sessions/:sessionId/query', async (req, res) => {
    const { provider }: Pick<QueryRequestBody, 'provider'> = req.body;
    try {
      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      logger.info(
        `/sessions/${sessionId}/query (notebook) receives call from user: ${userId}`,
      );

      await checkPermission(
        req,
        lightspeedChatCreatePermission,
        httpAuth,
        permissions,
      );

      const session = await sessionService.readSession(sessionId, userId);

      const userQueryParam = `user_id=${encodeURIComponent(userId)}`;
      req.body.media_type = 'application/json';

      if (notebookSystemPrompt && notebookSystemPrompt.trim().length > 0) {
        req.body.system_prompt = notebookSystemPrompt;
      }

      const requestBodyTyped = req.body as QueryRequestBody;
      requestBodyTyped.vector_store_ids = [
        session.vector_db_id,
        STATIC_VECTOR_DB_ID,
      ];

      // Prefix conversation_id with "nb-" to separate notebook from developer conversations
      if (requestBodyTyped.conversation_id) {
        if (!requestBodyTyped.conversation_id.startsWith('nb-')) {
          requestBodyTyped.conversation_id = `nb-${requestBodyTyped.conversation_id}`;
        }
      }

      requestBodyTyped.input_shields = ['notebook_question_validation'];

      const requestBody = JSON.stringify(req.body);
      const mcpHeaders = mcpToken
        ? `{"${mcpServerName}": {"Authorization": "Bearer ${mcpToken}"}}`
        : '';
      const fetchResponse = await fetch(
        `http://0.0.0.0:${port}/v1/streaming_query?${userQueryParam}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'MCP-HEADERS': mcpHeaders,
          },
          body: requestBody,
        },
      );

      if (!fetchResponse.ok) {
        const errorBody = await fetchResponse.json();
        const errormsg = `Error from lightspeed-core server: ${errorBody.error?.message || errorBody?.detail?.cause || 'Unknown error'}`;
        logger.error(errormsg);

        res.status(500).json({
          error: errormsg,
        });
        return;
      }

      fetchResponse.body.pipe(res);
    } catch (error) {
      const errormsg = `Error fetching notebook completions from ${provider}: ${error}`;
      logger.error(errormsg);

      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: errormsg });
      }
    }
  });

  /**
   * GET /v1/sessions/:sessionId/documents
   * List all documents in a session
   */
  router.get('/v1/sessions/:sessionId/documents', async (req, res) => {
    try {
      await checkPermission(
        req,
        lightspeedNotebooksSessionReadPermission,
        httpAuth,
        permissions,
      );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      const session = await sessionService.readSession(sessionId, userId);

      const allDocuments = await documentService.listDocuments(
        sessionId,
        userId,
        session.vector_db_id,
      );

      const fileType = req.query.fileType as string | undefined;

      let filteredDocuments = allDocuments;

      if (fileType) {
        filteredDocuments = filteredDocuments.filter(
          doc => doc.metadata?.fileType === fileType,
        );
      }

      const response: SessionDocumentListResponse = {
        status: 'success',
        session_id: sessionId,
        documents: filteredDocuments,
        count: filteredDocuments.length,
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error listing documents');
    }
  });

  /**
   * DELETE /v1/sessions/:sessionId/documents/:documentId
   * Delete a specific document from a session
   * Note: Currently not supported by llama-stack 0.2.x
   */
  router.delete(
    '/v1/sessions/:sessionId/documents/:documentId',
    async (req, res) => {
      try {
        await checkPermission(
          req,
          lightspeedNotebooksDocumentManagePermission,
          httpAuth,
          permissions,
        );

        const userId = await getUserRef(req, httpAuth, userInfo);
        const { sessionId } = req.params;

        await sessionService.readSession(sessionId, userId);

        res.status(501).json({
          error:
            'Document deletion is not currently supported by llama-stack 0.2.x',
        });
      } catch (error) {
        handleError(res, error, 'Error deleting document');
      }
    },
  );

  /**
   * POST /v1/sessions/:sessionId/documents/upload
   * Upload and parse a document file (md, txt, pdf, json, yaml, yml, log) or URL
   */
  router.post(
    '/v1/sessions/:sessionId/documents/upload',
    upload.single('file'),
    async (req, res) => {
      try {
        await checkPermission(
          req,
          lightspeedNotebooksDocumentManagePermission,
          httpAuth,
          permissions,
        );

        const userId = await getUserRef(req, httpAuth, userInfo);
        const { sessionId } = req.params;
        const fileType = req.body.fileType as string;
        const customTitle = req.body.title as string | undefined;

        if (!fileType || !isValidFileType(fileType)) {
          res.status(400).json({
            error: `Unsupported file type: ${fileType}. Supported types: md, txt, pdf, json, yaml, yml, log, url`,
          });
          return;
        }

        const session = await sessionService.readSession(sessionId, userId);

        let parsedDocument;
        let documentTitle;

        if (fileType === 'url') {
          const url = req.body.file as string | undefined;

          if (!url) {
            res
              .status(400)
              .json({ error: 'file field is required for URL type' });
            return;
          }

          logger.info(
            `Fetching URL ${url} (${fileType}) for session ${sessionId}`,
          );

          parsedDocument = await parseFile(Buffer.from(''), url, fileType);
          documentTitle = customTitle || parsedDocument.metadata.fileName;
        } else {
          if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
          }

          if (!isValidFileSize(req.file.size)) {
            res.status(400).json({
              error: 'File size exceeds 20MB limit',
            });
            return;
          }

          logger.info(
            `Parsing file ${req.file.originalname} (${fileType}) for session ${sessionId}`,
          );

          parsedDocument = await parseFile(
            req.file.buffer,
            req.file.originalname,
            fileType,
          );
          documentTitle =
            customTitle ||
            parsedDocument.metadata.fileName.replace(/\.[^/.]+$/, '');
        }

        logger.info(`Upserting document with title: ${documentTitle}`);

        const result = await documentService.upsertDocument(
          session.vector_db_id,
          documentTitle,
          parsedDocument.content,
          parsedDocument.metadata,
        );

        const response: DocumentResponse = {
          status: 'success',
          document_id: result.document_id,
          title: documentTitle,
          session_id: sessionId,
          chunks_created: result.chunks_created,
          replaced: result.replaced,
          message: result.replaced
            ? 'Document updated successfully'
            : 'Document created successfully',
        };

        res.json(response);
      } catch (error) {
        handleError(res, error, 'Error uploading document');
      }
    },
  );

  return router;
}
