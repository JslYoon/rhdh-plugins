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

import { createPermission } from '@backstage/plugin-permission-common';

/**
 * Permission to use AI Notebooks feature
 *
 * This is a feature-level permission:
 * - Users either have access to AI Notebooks or they don't
 * - If they have access, they can use ALL features (create, read, update, delete, manage docs)
 * - Data isolation is handled at the application level (users only see their own sessions)
 *
 * @public
 */
export const aiNotebooksUsePermission = createPermission({
  name: 'ai.notebooks.use',
  attributes: {
    action: 'update',
  },
});

/**
 * All AI Notebooks permissions (single permission for feature access)
 * @public
 */
export const aiNotebooksPermissions = [aiNotebooksUsePermission];
