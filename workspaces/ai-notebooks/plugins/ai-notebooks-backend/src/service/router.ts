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
import { Config } from '@backstage/config';
import { NotAllowedError } from '@backstage/errors';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';
import express, { Router } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { SessionService } from './session-service';
import { DocumentService } from './document-service';
import { checkPermission, getUserRef } from './auth-helpers';
import {
  aiNotebooksPermissions,
  aiNotebooksUsePermission,
} from './permissions';
import {
  SessionResponse,
  SessionListResponse,
  DocumentResponse,
  DocumentListResponse,
  QueryResponse,
} from '../types';
import {
  isValidFileSize,
  isValidFileType,
  parseFile,
} from './fileParser';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions: PermissionsService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<Router> {
  const { logger, config, httpAuth, userInfo, permissions } = options;
  const router = Router();
  router.use(express.json());

  const llamaStackUrl =
    config.getOptionalString('aiNotebooks.llamaStack.url') ||
    'http://0.0.0.0:8321';
  const notebookSystemPrompt = config.getOptionalString(
    'aiNotebooks.systemPrompt',
  );

  // Extract port from Llama Stack URL
  const urlMatch = llamaStackUrl.match(/:(\d+)/);
  const port = urlMatch ? parseInt(urlMatch[1], 10) : 8321;

  logger.info(`AI Notebooks connecting to Llama Stack at ${llamaStackUrl}`);

  const sessionService = new SessionService(llamaStackUrl, logger, config);
  const documentService = new DocumentService(llamaStackUrl, logger, config);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
    },
  });

  const handleError = (res: any, error: unknown, message: string) => {
    const errormsg = `${message}: ${error}`;
    logger.error(errormsg);

    if (error instanceof NotAllowedError) {
      res.status(403).json({ status: 'error', error: error.message });
    } else {
      res.status(500).json({ status: 'error', error: errormsg });
    }
  };

  const permissionIntegrationRouter = createPermissionIntegrationRouter({
    permissions: aiNotebooksPermissions,
  });
  router.use(permissionIntegrationRouter);

  // Health check endpoint
  router.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * POST /v1/sessions
   * Create a new session
   */
  router.post('/v1/sessions', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const { name, description, metadata } = req.body;
    
      if (!name) {
        res.status(400).json({ status: 'error', error: 'name is required' });
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
    } catch (error: any) {
      logger.error(`Error creating session: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: error.message });
      }
    }
  });

  /**
   * GET /v1/sessions
   * List all sessions
   */
  router.get('/v1/sessions', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const sessions = await sessionService.listSessions(userId);

      // Optional filtering
      let filteredSessions = sessions;
      const category = req.query.category as string | undefined;
      if (category) {
        filteredSessions = filteredSessions.filter(
          s => s.metadata?.category === category,
        );
      }

      const tagsParam = req.query.tags as string | undefined;
      if (tagsParam) {
        const requestedTags = tagsParam.split(',').map(t => t.trim());
        filteredSessions = filteredSessions.filter(session => {
          if (!session.metadata?.tags) return false;
          return requestedTags.some(tag =>
            session.metadata!.tags!.includes(tag),
          );
        });
      }

      const project = req.query.project as string | undefined;
      if (project) {
        filteredSessions = filteredSessions.filter(
          s => s.metadata?.project === project,
        );
      }

      const response: SessionListResponse = {
        status: 'success',
        sessions: filteredSessions,
        count: filteredSessions.length,
      };

      res.json(response);
    } catch (error: any) {
      logger.error(`Error listing sessions: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: error.message });
      }
    }
  });

  /**
   * GET /v1/sessions/:sessionId
   * Get a single session by ID
   */
  router.get('/v1/sessions/:sessionId', async (req, res) => {
    try {
      await checkPermission(
        req,
        aiNotebooksUsePermission,
        httpAuth,
        permissions,
      );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      const session = await sessionService.readSession(sessionId, userId);

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session retrieved successfully',
      };

      res.json(response);
    } catch (error: any) {
      logger.error(`Error reading session: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: error.message });
      }
    }
  });

  /**
   * PUT /v1/sessions/:sessionId
   * Update an existing session
   */
  router.put('/v1/sessions/:sessionId', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;
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
    } catch (error: any) {
      logger.error(`Error updating session: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: error.message });
      }
    }
  });

  /**
   * DELETE /v1/sessions/:sessionId
   * Delete a session and all its documents
   */
  router.delete('/v1/sessions/:sessionId', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const { sessionId } = req.params;

      const session = await sessionService.readSession(sessionId, userId);
      await sessionService.deleteSession(sessionId, userId);

      const response: SessionResponse = {
        status: 'success',
        session,
        message: 'Session deleted successfully',
      };

      res.json(response);
    } catch (error: any) {
      logger.error(`Error deleting session: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: error.message });
      }
    }
  });

  /**
   * POST /v1/sessions/:sessionId/documents/upload
   * Upload and parse a document file (md, txt, pdf, json, yaml, yml, log) or URL
   */
  router.post(
    '/v1/sessions/:sessionId/documents/upload',
    upload.single('file'),
    async (req, res) => {
      try {
        // await checkPermission(
        //   req,
        //   aiNotebooksUsePermission,
        //   httpAuth,
        //   permissions,
        // );

        const userId = await getUserRef(req, httpAuth, userInfo);
        const vectorDbId = req.params.vectorDbId as string;
        const fileType = req.body.fileType as string;
        const customTitle = req.body.title as string | undefined;

        if (!fileType || !isValidFileType(fileType)) {
          res.status(400).json({
            status: 'error',
            error: `Unsupported file type: ${fileType}. Supported types: md, txt, pdf, json, yaml, yml, log, url`,
          });
          return;
        }

        const session = await sessionService.readSession(vectorDbId, userId);

        let parsedDocument;
        let documentTitle;

        if (fileType === 'url') {
          const url = req.body.file as string | undefined;

          if (!url) {
            res.status(400).json({
              status: 'error',
              error: 'file field is required for URL type',
            });
            return;
          }

          logger.info(
            `Fetching URL ${url} (${fileType}) for session ${vectorDbId}`,
          );

          parsedDocument = await parseFile(Buffer.from(''), url, fileType);
          documentTitle = customTitle || parsedDocument.metadata.fileName;
        } else {
          if (!req.file) {
            res
              .status(400)
              .json({ status: 'error', error: 'No file uploaded' });
            return;
          }

          if (!isValidFileSize(req.file.size)) {
            res.status(400).json({
              status: 'error',
              error: 'File size exceeds 20MB limit',
            });
            return;
          }

          logger.info(
            `Parsing file ${req.file.originalname} (${fileType}) for session ${vectorDbId}`,
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

        const result = await documentService.uploadDocument(
          session.vector_db_id,
          vectorDbId,
          userId,
          documentTitle,
          parsedDocument.content,
          parsedDocument.metadata,
        );

        const response: DocumentResponse = {
          status: 'success',
          document_id: result.document_id,
          title: documentTitle,
          session_id: vectorDbId,
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

  /**
   * GET /v1/sessions/:sessionId/documents
   * List all documents in a session
   */
  router.get('/v1/sessions/:sessionId/documents', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const vectorDbId = req.params.vectorDbId as string;
      const fileType = req.query.fileType as string | undefined;

      const session = await sessionService.readSession(vectorDbId, userId);

      const documents = await documentService.listDocuments(
        session.vector_db_id,
        vectorDbId,
        userId,
        fileType,
      );

      const response: DocumentListResponse = {
        status: 'success',
        session_id: vectorDbId,
        documents,
        count: documents.length,
      };

      res.json(response);
    } catch (error) {
      handleError(res, error, 'Error listing documents');
    }
  });

  /**
   * POST /v1/sessions/:sessionId/query
   * Send a query to the AI assistant for notebook/session conversations
   * Uses session-specific vector store with uploaded documents and notebook system prompts
   */
  router.post('/v1/sessions/:sessionId/query', async (req, res) => {
    try {
      // await checkPermission(
      //   req,
      //   aiNotebooksUsePermission,
      //   httpAuth,
      //   permissions,
      // );

      const userId = await getUserRef(req, httpAuth, userInfo);
      const vectorDbId = req.params.sessionId as string;
      const { provider, query } = req.body;

      if (!query) {
        res.status(400).json({ status: 'error', error: 'query is required' });
        return;
      }

      logger.info(
        `/sessions/${vectorDbId}/query (notebook) receives call from user: ${userId} for vectorDbId: ${vectorDbId}`,
      );
      console.log("vectorDbId asdf", vectorDbId);
      // Verify session exists and user has access
      // const session = await sessionService.readSession(vectorDbId, userId);

      // console.log("session asdf", session);
      // const userQueryParam = `user_id=${encodeURIComponent(userId)}`;
      // req.body.media_type = 'application/json';

      // // Apply notebook system prompt if configured
      // if (notebookSystemPrompt && notebookSystemPrompt.trim().length > 0) {
      //   req.body.system_prompt = notebookSystemPrompt;
      // }

      // // Add vector store IDs for RAG
      req.body.vector_store_ids = [vectorDbId];

      // Prefix conversation_id with "nb-" to separate notebook from other conversations
      if (req.body.conversation_id) {
        if (!req.body.conversation_id.startsWith('nb-')) {
          req.body.conversation_id = `nb-${req.body.conversation_id}`;
        }
      }

      // Add input shields for safety filtering
      req.body.input_shields = ['notebook_question_validation'];

      const requestBody = JSON.stringify(req.body);
      const fetchResponse = await fetch(
        `http://0.0.0.0:8080/v1/streaming_query?${userQueryParam}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        },
      );

      if (!fetchResponse.ok) {
        const errorBody = await fetchResponse.json();
        const errormsg = `Error from Llama Stack server: ${errorBody.error?.message || errorBody?.detail?.cause || 'Unknown error'}`;
        logger.error(errormsg);

        res.status(500).json({
          status: 'error',
          error: errormsg,
        });
        return;
      }

      // Stream the response back to the client
      fetchResponse.body.pipe(res);
    } catch (error: any) {
      const errormsg = `Error fetching notebook completions from ${req.body.provider}: ${error.message}`;
      logger.error(errormsg);

      if (error instanceof NotAllowedError) {
        res.status(403).json({ status: 'error', error: error.message });
      } else {
        res.status(500).json({ status: 'error', error: errormsg });
      }
    }
  });

  return router;
}
