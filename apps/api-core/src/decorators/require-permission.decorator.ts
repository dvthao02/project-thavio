import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'platform_permission';
export const RequirePermission = (permissionKey: string) =>
  SetMetadata(PERMISSION_KEY, permissionKey);
