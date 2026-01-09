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
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';

import {
  lightspeedChatCreatePermission,
  lightspeedChatDeletePermission,
  lightspeedChatReadPermission,
} from '@red-hat-developer-hub/backstage-plugin-lightspeed-common';

import { checkPermission, getUserRef } from '../service/auth-helpers';
import { validateCompletionsRequest } from '../service/validation';
import {
  DEFAULT_HISTORY_LENGTH,
  QueryRequestBody,
  STATIC_VECTOR_DB_ID,
} from '../types/lightspeed-types';

export interface LightspeedRouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions: PermissionsService;
  port: number;
  systemPrompt?: string;
  mcpServerName?: string;
  mcpToken?: string;
}

export function createLightspeedRouter(
  options: LightspeedRouterOptions,
): Router {
  const {
    logger,
    httpAuth,
    userInfo,
    permissions,
    port,
    systemPrompt,
    mcpServerName,
    mcpToken,
  } = options;

  const router = Router();

  // ============================================================================
  // Proxy Middleware - Routes all other requests to lightspeed-core server
  // ============================================================================
  router.use('/', async (req, res, next) => {
    const passthroughPaths = ['/v1/query', '/v1/feedback'];
    const sessionsPathPattern = /^\/v1\/sessions/;
    if (
      passthroughPaths.includes(req.path) ||
      req.method === 'PUT' ||
      sessionsPathPattern.test(req.path)
    ) {
      return next(); // This will skip proxying and go to POST/DELETE/GET endpoints
    }
    // TODO: parse server_id from req.body and get URL and token when multi-server is supported
    try {
      const userEntity = await getUserRef(req, httpAuth, userInfo);
      logger.info(`receives call from user: ${userEntity}`);

      if (req.method === 'GET') {
        await checkPermission(
          req,
          lightspeedChatReadPermission,
          httpAuth,
          permissions,
        );
      } else if (req.method === 'DELETE') {
        await checkPermission(
          req,
          lightspeedChatDeletePermission,
          httpAuth,
          permissions,
        );
      }

      // Proxy middleware configuration
      const apiProxy = createProxyMiddleware({
        target: `http://0.0.0.0:${port}`,
        changeOrigin: true,
        pathRewrite: (path, _) => {
          // Add user query parameter from the authenticated user
          const userQueryParam = `user_id=${encodeURIComponent(userEntity)}`;
          // Check if there are already query parameters
          let newPath = path.includes('?')
            ? `${path}&${userQueryParam}`
            : `${path}?${userQueryParam}`;
          if (
            !path.includes('history_length') &&
            path.includes('conversation_id')
          ) {
            const historyLengthQuery = `history_length=${DEFAULT_HISTORY_LENGTH}`;
            newPath = `${newPath}&${historyLengthQuery}`;
          }
          logger.info(`Rewriting path from ${path} to ${newPath}`);
          return newPath;
        },
      });
      return apiProxy(req, res, next);
    } catch (error) {
      if (error instanceof NotAllowedError) {
        logger.error(error.message);
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }
  });

  // ============================================================================
  // Chat Endpoints - Developer Lightspeed Conversations
  // ============================================================================

  /**
   * POST /v1/feedback
   * Submit user feedback for a conversation
   */
  router.post('/v1/feedback', async (request, response) => {
    try {
      const user_id = await getUserRef(request, httpAuth, userInfo);
      logger.info(`/v1/feedback receives call from user: ${user_id}`);

      await checkPermission(
        request,
        lightspeedChatCreatePermission,
        httpAuth,
        permissions,
      );

      const userQueryParam = `user_id=${encodeURIComponent(user_id)}`;
      const requestBody = JSON.stringify(request.body);
      const fetchResponse = await fetch(
        `http://0.0.0.0:${port}/v1/feedback?${userQueryParam}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        },
      );

      if (!fetchResponse.ok) {
        // Read the error body
        const errorBody = await fetchResponse.json();
        const errormsg = `Error from lightspeed-core server: ${errorBody.error?.message || errorBody?.detail?.cause || 'Unknown error'}`;
        logger.error(errormsg);

        // Return a 500 status for any upstream error
        response.status(500).json({
          error: errormsg,
        });
        return;
      }

      const data = await fetchResponse.json();
      response.status(fetchResponse.status).json(data);
    } catch (error) {
      const errormsg = `Error while sending feedback: ${error}`;
      logger.error(errormsg);

      if (error instanceof NotAllowedError) {
        response.status(403).json({ error: error.message });
      } else {
        response.status(500).json({ error: errormsg });
      }
    }
  });

  /**
   * POST /v1/query
   * Send a query to the AI assistant for developer lightspeed conversations
   * Uses developer-specific system prompts and only static RHDH knowledge base
   */
  router.post(
    '/v1/query',
    validateCompletionsRequest,
    async (request, response) => {
      const { provider }: Pick<QueryRequestBody, 'provider'> = request.body;
      try {
        const user_id = await getUserRef(request, httpAuth, userInfo);
        logger.info(
          `/v1/query (developer) receives call from user: ${user_id}`,
        );

        await checkPermission(
          request,
          lightspeedChatCreatePermission,
          httpAuth,
          permissions,
        );

        const userQueryParam = `user_id=${encodeURIComponent(user_id)}`;
        request.body.media_type = 'application/json'; // set media_type to receive start and end event

        // Apply developer lightspeed system prompt
        if (systemPrompt && systemPrompt.trim().length > 0) {
          request.body.system_prompt = systemPrompt;
        }

        // Developer lightspeed only uses static RHDH knowledge base
        const requestBodyTyped = request.body as QueryRequestBody;
        requestBodyTyped.vector_store_ids = [STATIC_VECTOR_DB_ID];

        const requestBody = JSON.stringify(request.body);
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
          // Read the error body
          const errorBody = await fetchResponse.json();
          const errormsg = `Error from lightspeed-core server: ${errorBody.error?.message || errorBody?.detail?.cause || 'Unknown error'}`;
          logger.error(errormsg);

          // Return a 500 status for any upstream error
          response.status(500).json({
            error: errormsg,
          });
          return;
        }

        // Pipe the response back to the original response
        fetchResponse.body.pipe(response);
      } catch (error) {
        const errormsg = `Error fetching completions from ${provider}: ${error}`;
        logger.error(errormsg);

        if (error instanceof NotAllowedError) {
          response.status(403).json({ error: error.message });
        } else {
          response.status(500).json({ error: errormsg });
        }
      }
    },
  );

  /**
   * PUT /v2/conversations/:conversation_id
   * Update conversation metadata (e.g., topic summary)
   */
  router.put(
    '/v2/conversations/:conversation_id',
    async (request, response) => {
      try {
        const user_id = await getUserRef(request, httpAuth, userInfo);
        const conversation_id = request.params.conversation_id;

        await checkPermission(
          request,
          lightspeedChatCreatePermission,
          httpAuth,
          permissions,
        );

        const requestBody = JSON.stringify(request.body);
        const userQueryParam = `user_id=${encodeURIComponent(user_id)}`;
        const fetchResponse = await fetch(
          `http://0.0.0.0:${port}/v2/conversations/${conversation_id}?${userQueryParam}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: requestBody,
          },
        );

        if (!fetchResponse.ok) {
          // Read the error body
          const errorBody = await fetchResponse.json();
          const errormsg = `Error from lightspeed-core server: ${errorBody.error?.message || errorBody?.detail?.cause || 'Unknown error'}`;
          logger.error(errormsg);

          // Return a 500 status for any upstream error
          response.status(500).json({
            error: errormsg,
          });
          return;
        }

        const data = await fetchResponse.json();
        response.status(fetchResponse.status).json(data);
      } catch (error) {
        const errormsg = `Error while updating topic summary: ${error}`;
        logger.error(errormsg);

        if (error instanceof NotAllowedError) {
          response.status(403).json({ error: error.message });
        } else {
          response.status(500).json({ error: errormsg });
        }
      }
    },
  );

  return router;
}
