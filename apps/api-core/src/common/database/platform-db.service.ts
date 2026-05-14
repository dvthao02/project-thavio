import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
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

  async runWithActor<T>(accountId: string, fn: (db: typeof this._db) => Promise<T>): Promise<T> {
    return this._db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_account_id', ${accountId}, true)`);
      return fn(tx as unknown as typeof this._db);
    });
  }
}
