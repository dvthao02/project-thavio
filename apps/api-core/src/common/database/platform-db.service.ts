import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@schema/platform';
import { env } from '@config/env';

@Injectable()
export class PlatformDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformDbService.name);
  private pool: Pool;
  private _db: ReturnType<typeof drizzle<typeof schema>>;

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: env.databaseUrl,
      options: `-c search_path="platform",public`,
    });
    this._db = drizzle(this.pool, { schema });
    await this.ensurePlatformDataAuditTriggers();
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

  private async ensurePlatformDataAuditTriggers() {
    await this._db.execute(sql.raw(`
CREATE OR REPLACE FUNCTION platform.capture_platform_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor text;
  v_record_source jsonb;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_changed_fields text[];
BEGIN
  IF TG_TABLE_SCHEMA <> 'platform' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'platform_audit_log' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_old := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_record_source := COALESCE(v_new, v_old, '{}'::jsonb);

  v_actor := NULLIF(current_setting('app.current_account_id', true), '');
  IF v_actor IS NULL THEN
    v_actor := NULLIF(v_record_source ->> 'updated_by', '');
  END IF;
  IF v_actor IS NULL THEN
    v_actor := NULLIF(v_record_source ->> 'created_by', '');
  END IF;
  IF v_actor IS NULL THEN
    v_actor := NULLIF(v_record_source ->> 'account_id', '');
  END IF;
  IF v_actor IS NULL THEN
    v_actor := current_user;
  END IF;

  v_record_id := NULL;
  IF v_record_source ? 'id' THEN
    BEGIN
      v_record_id := (v_record_source ->> 'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_record_id := NULL;
    END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
      INTO v_changed_fields
    FROM jsonb_object_keys(COALESCE(v_new, '{}'::jsonb)) AS key;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
      INTO v_changed_fields
    FROM jsonb_object_keys(COALESCE(v_old, '{}'::jsonb)) AS key;
  ELSE
    SELECT COALESCE(array_agg(keys.key ORDER BY keys.key), ARRAY[]::text[])
      INTO v_changed_fields
    FROM (
      SELECT jsonb_object_keys(COALESCE(v_old, '{}'::jsonb)) AS key
      UNION
      SELECT jsonb_object_keys(COALESCE(v_new, '{}'::jsonb)) AS key
    ) AS keys
    WHERE COALESCE(v_old -> keys.key, 'null'::jsonb) IS DISTINCT FROM COALESCE(v_new -> keys.key, 'null'::jsonb);

    IF cardinality(v_changed_fields) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO platform.platform_audit_log (table_name, operation, record_id, changed_by, old_data, new_data, changed_fields)
  VALUES (TG_TABLE_NAME, TG_OP, v_record_id, v_actor, v_old, v_new, v_changed_fields);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  table_row record;
BEGIN
  FOR table_row IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'platform'
      AND tablename <> 'platform_audit_log'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_platform_audit_row_change ON platform.%I', table_row.tablename);
    EXECUTE format(
      'CREATE TRIGGER trg_platform_audit_row_change
       AFTER INSERT OR UPDATE OR DELETE ON platform.%I
       FOR EACH ROW
       EXECUTE FUNCTION platform.capture_platform_audit_row_change()',
      table_row.tablename
    );
  END LOOP;
END
$$;
    `));

    this.logger.log('Platform data-audit triggers ensured for schema "platform".');
  }
}
