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

import type { Request } from 'express';

/**
 * Get the user entity reference from the request
 * @param req - Express request object
 * @param httpAuth - HTTP authentication service
 * @param userInfo - User info service
 * @returns User entity reference string
 */
export async function getUserRef(
  req: Request,
  httpAuth: HttpAuthService,
  userInfo: UserInfoService,
): Promise<string> {
  try {
    const credentials = await httpAuth.credentials(req);
    const user = await userInfo.getUserInfo(credentials);
    return user.userEntityRef;
  } catch (error) {
    return 'user:default/guest';
  }
}

/**
 * Check if the user has the specified permission
 * @param req - Express request object
 * @param permission - Permission to check
 * @param httpAuth - HTTP authentication service
 * @param permissions - Permissions service
 * @throws NotAllowedError if user doesn't have permission
 */
export async function checkPermission(
  req: Request,
  permission: BasicPermission,
  httpAuth: HttpAuthService,
  permissions: PermissionsService,
): Promise<void> {
  const credentials = await httpAuth.credentials(req);
  const decision = await permissions.authorize([{ permission }], {
    credentials,
  });

  if (decision[0].result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError('Unauthorized');
  }
}
