import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@schema/platform';
import { env } from '@config/env';

@Injectable()
export class PlatformDbService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private _db: ReturnType<typeof drizzle<typeof schema>>;

  onModuleInit() {
    this.pool = new Pool({
      connectionString: env.databaseUrl,
      options: `-c search_path="platform",public`,
    });
    this._db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  get db() {
    return this._db;
  }
}
