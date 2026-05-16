import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export type PlatformUserPayload = {
  sub?: string;
  userPermissions?: Set<string> | string[];
  [key: string]: unknown;
};

export type PlatformRequest = Request & {
  platformUser?: PlatformUserPayload;
};

export type PlatformContext = {
  accountId: string;
  actorId: string;
  permissions: Set<string>;
  isFullAdmin: boolean;
};

export function resolvePlatformContext(
  req: PlatformRequest,
  fullAccessPermission?: string,
): PlatformContext {
  const user = req.platformUser;
  if (!user?.sub) throw new UnauthorizedException();

  const permissions =
    user.userPermissions instanceof Set
      ? user.userPermissions
      : new Set(user.userPermissions ?? []);

  return {
    accountId: user.sub,
    actorId: user.sub,
    permissions,
    isFullAdmin: fullAccessPermission ? permissions.has(fullAccessPermission) : false,
  };
}
