import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { env } from '@config/env';

const MAX_SCHEMA_POOLS = 50;
const SAFE_SCHEMA_RE = /^[a-zA-Z0-9_]+$/;

@Injectable()
export class BusinessDbService implements OnModuleDestroy {
  private readonly pools = new Map<string, Pool>();

  getPool(schemaName: string): Pool {
    if (!SAFE_SCHEMA_RE.test(schemaName)) {
      throw new Error(`Invalid business schema name: ${schemaName}`);
    }

    const existing = this.pools.get(schemaName);
    if (existing) {
      this.pools.delete(schemaName);
      this.pools.set(schemaName, existing);
      return existing;
    }

    this.evictIdlePoolIfNeeded();

    const pool = new Pool({
      connectionString: env.databaseUrl,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      options: `-c search_path="${schemaName}",public`,
    });
    this.pools.set(schemaName, pool);
    return pool;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.pools.values()].map((p) => p.end()));
  }

  private evictIdlePoolIfNeeded(): void {
    if (this.pools.size < MAX_SCHEMA_POOLS) return;

    for (const [schemaName, pool] of this.pools) {
      if (pool.waitingCount === 0 && pool.totalCount === pool.idleCount) {
        this.pools.delete(schemaName);
        void pool.end().catch(() => undefined);
        return;
      }
    }
  }
}
