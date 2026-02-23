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

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * AI Notebooks backend plugin
 *
 * @public
 */
export const aiNotebooksPlugin = createBackendPlugin({
  pluginId: 'ai-notebooks',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        permissions: coreServices.permissions,
      },
      async init({
        logger,
        config,
        httpRouter,
        httpAuth,
        userInfo,
        permissions,
      }) {
        logger.info('Initializing AI Notebooks plugin');

        const router = await createRouter({
          logger,
          config,
          httpAuth,
          userInfo,
          permissions,
        });

        httpRouter.use(router);

        // Allow health endpoint without authentication for monitoring
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/v1/sessions',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
