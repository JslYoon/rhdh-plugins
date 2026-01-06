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

/** This permission is used to access the lightspeed read conversations endpoint
 * @public
 */
export const lightspeedChatReadPermission = createPermission({
  name: 'lightspeed.chat.read',
  attributes: {
    action: 'read',
  },
});

/** This permission is used to access the lightspeed create conversations endpoint
 * @public
 */
export const lightspeedChatCreatePermission = createPermission({
  name: 'lightspeed.chat.create',
  attributes: {
    action: 'create',
  },
});

/** This permission is used to access the lightspeed delete endpoint
 * @public
 */
export const lightspeedChatDeletePermission = createPermission({
  name: 'lightspeed.chat.delete',
  attributes: {
    action: 'delete',
  },
});

/** This permission is used to access the lightspeed update endpoint
 * @public
 */
export const lightspeedChatUpdatePermission = createPermission({
  name: 'lightspeed.chat.update',
  attributes: {
    action: 'update',
  },
});
/**
 * Permission to read AI Notebook sessions
 * @public
 */
export const lightspeedNotebooksSessionReadPermission = createPermission({
  name: 'lightspeed.notebooks.session.read',
  attributes: {
    action: 'read',
  },
});

/**
 * Permission to create AI Notebook sessions
 * @public
 */
export const lightspeedNotebooksSessionCreatePermission = createPermission({
  name: 'lightspeed.notebooks.session.create',
  attributes: {
    action: 'create',
  },
});

/**
 * Permission to update AI Notebook sessions
 * @public
 */
export const lightspeedNotebooksSessionUpdatePermission = createPermission({
  name: 'lightspeed.notebooks.session.update',
  attributes: {
    action: 'update',
  },
});

/**
 * Permission to delete AI Notebook sessions
 * @public
 */
export const lightspeedNotebooksSessionDeletePermission = createPermission({
  name: 'lightspeed.notebooks.session.delete',
  attributes: {
    action: 'delete',
  },
});

/**
 * Permission to manage documents within AI Notebook sessions
 * @public
 */
export const lightspeedNotebooksDocumentManagePermission = createPermission({
  name: 'lightspeed.notebooks.document.manage',
  attributes: {
    action: 'update',
  },
});

/**
 * List of all permissions on permission polices.
 *
 * @public
 */
export const lightspeedPermissions = [
  lightspeedChatReadPermission,
  lightspeedChatCreatePermission,
  lightspeedChatDeletePermission,
  lightspeedChatUpdatePermission,
  lightspeedNotebooksSessionReadPermission,
  lightspeedNotebooksSessionCreatePermission,
  lightspeedNotebooksSessionUpdatePermission,
  lightspeedNotebooksSessionDeletePermission,
  lightspeedNotebooksDocumentManagePermission,
];

/**
 * List of all permissions on permission polices for AI Notebooks.
 *
 * @public
 */
export const lightspeedNotebooksPermissions = [
  lightspeedNotebooksSessionReadPermission,
  lightspeedNotebooksSessionCreatePermission,
  lightspeedNotebooksSessionUpdatePermission,
  lightspeedNotebooksSessionDeletePermission,
  lightspeedNotebooksDocumentManagePermission,
];
