import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { env } from '@config/env';

@Injectable()
export class BusinessDbService implements OnModuleDestroy {
  private readonly pools = new Map<string, Pool>();

  getPool(schemaName: string): Pool {
    if (!this.pools.has(schemaName)) {
      const pool = new Pool({
        connectionString: env.databaseUrl,
        options: `-c search_path="${schemaName}",public`,
      });
      this.pools.set(schemaName, pool);
    }
    return this.pools.get(schemaName)!;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.pools.values()].map((p) => p.end()));
  }
}
