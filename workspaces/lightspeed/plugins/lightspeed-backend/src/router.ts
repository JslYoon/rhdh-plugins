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

import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';

import express, { Router } from 'express';

import {
  lightspeedNotebooksDocumentManagePermission,
  lightspeedNotebooksSessionCreatePermission,
  lightspeedNotebooksSessionDeletePermission,
  lightspeedNotebooksSessionReadPermission,
  lightspeedNotebooksSessionUpdatePermission,
  lightspeedPermissions,
} from '@red-hat-developer-hub/backstage-plugin-lightspeed-common';

import { createLightspeedRouter } from './routes/lightspeed-router';
import { createNotebooksRouter } from './routes/notebooks-router';
import { DocumentService } from './service/notebooks/document-service';
import { SessionService } from './service/notebooks/session-service';
import { RouterOptions } from './types/lightspeed-types';

/**
 * @public
 * Creates the unified lightspeed router (chat + sessions/documents)
 */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, httpAuth, userInfo, permissions } = options;

  const router = Router();

  // Configure body parser with 20MB limit for file uploads
  router.use(express.json({ limit: '20mb' }));
  router.use(express.urlencoded({ limit: '20mb', extended: true }));

  const port = config.getOptionalNumber('lightspeed.servicePort') ?? 8080;
  const system_prompt = config.getOptionalString('lightspeed.systemPrompt');
  const notebook_system_prompt = config.getOptionalString(
    'lightspeed.notebookSystemPrompt',
  );
  // Only support one MCP server for now
  const mcpServerName = config
    .getOptionalConfigArray('lightspeed.mcpServers')?.[0]
    ?.getString('name');
  const mcpToken = config
    .getOptionalConfigArray('lightspeed.mcpServers')?.[0]
    ?.getString('token');

  // Get LlamaStack configuration for session/document management
  const llamaStackPort =
    config.getOptionalNumber('lightspeed.llamaStackPort') ?? 8321;
  const llamaStackUrl = `http://0.0.0.0:${llamaStackPort}`;

  // Initialize services for session/document management
  const sessionService = new SessionService(llamaStackUrl, logger);
  const documentService = new DocumentService(llamaStackUrl, logger);

  // Combine all permissions (chat + notebooks)
  const allPermissions = [
    ...lightspeedPermissions,
    lightspeedNotebooksSessionReadPermission,
    lightspeedNotebooksSessionCreatePermission,
    lightspeedNotebooksSessionUpdatePermission,
    lightspeedNotebooksSessionDeletePermission,
    lightspeedNotebooksDocumentManagePermission,
  ];

  const permissionIntegrationRouter = createPermissionIntegrationRouter({
    permissions: allPermissions,
  });
  router.use(permissionIntegrationRouter);

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  // ============================================================================
  // Mount Lightspeed Router - Developer Chat Endpoints
  // ============================================================================
  router.use(
    createLightspeedRouter({
      logger,
      httpAuth,
      userInfo,
      permissions,
      port,
      systemPrompt: system_prompt,
      mcpServerName,
      mcpToken,
    }),
  );

  // ============================================================================
  // Mount Notebooks Router - Session and Document Management
  // ============================================================================
  router.use(
    createNotebooksRouter({
      logger,
      httpAuth,
      userInfo,
      permissions,
      sessionService,
      documentService,
      port,
      notebookSystemPrompt: notebook_system_prompt,
      mcpServerName,
      mcpToken,
    }),
  );

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
