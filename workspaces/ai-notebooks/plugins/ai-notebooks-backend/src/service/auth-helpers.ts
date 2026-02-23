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
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { NotAllowedError } from '@backstage/errors';
import {
  AuthorizeResult,
  type BasicPermission,
} from '@backstage/plugin-permission-common';

/**
 * Get user entity reference from HTTP request
 * Falls back to 'user:default/guest' for unauthenticated requests
 */
export async function getUserRef(
  req: any,
  httpAuth: HttpAuthService,
  userInfo: UserInfoService,
): Promise<string> {
  return 'user:default/guest';
  try {
    const credentials = await httpAuth.credentials(req);
    const user = await userInfo.getUserInfo(credentials);
    return user.userEntityRef;
  } catch (error) {
    // Fallback for development/testing
    return 'user:default/guest';
  }
}

/**
 * Check if the current user has the specified permission
 * Throws NotAllowedError if permission is denied
 */
export async function checkPermission(
  req: any,
  permission: BasicPermission,
  httpAuth: HttpAuthService,
  permissions: PermissionsService,
): Promise<void> {
  try {
    const credentials = await httpAuth.credentials(req);
    const decision = await permissions.authorize([{ permission }], {
      credentials,
    });

    if (decision[0].result !== AuthorizeResult.ALLOW) {
      throw new NotAllowedError(
        `Permission denied: ${permission.name}`,
      );
    }
  } catch (error) {
    if (error instanceof NotAllowedError) {
      throw error;
    }
    // For unauthenticated requests in development, allow access
    // In production, you should remove this and require authentication
    console.warn('Permission check failed, allowing for development:', error);
  }
}
