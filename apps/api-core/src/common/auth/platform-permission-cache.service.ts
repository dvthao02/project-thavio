import { Injectable } from '@nestjs/common';

type PermissionCacheEntry = {
  permissions: Set<string>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60_000;

@Injectable()
export class PlatformPermissionCacheService {
  private static readonly cache = new Map<string, PermissionCacheEntry>();

  get(accountId: string): Set<string> | null {
    const entry = PlatformPermissionCacheService.cache.get(accountId);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      PlatformPermissionCacheService.cache.delete(accountId);
      return null;
    }

    return new Set(entry.permissions);
  }

  set(accountId: string, permissions: Iterable<string>, ttlMs = DEFAULT_TTL_MS): Set<string> {
    const permissionSet = new Set(permissions);
    PlatformPermissionCacheService.cache.set(accountId, {
      permissions: permissionSet,
      expiresAt: Date.now() + ttlMs,
    });
    return new Set(permissionSet);
  }

  delete(accountId: string): void {
    PlatformPermissionCacheService.cache.delete(accountId);
  }

  clear(): void {
    PlatformPermissionCacheService.cache.clear();
  }
}
