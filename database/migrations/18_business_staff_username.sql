-- Migration 18: Add username login identifier to every business staff table.
-- Global uniqueness across platform accounts and all business schemas is enforced
-- by the API because PostgreSQL cannot create a single unique index across schemas.

DO $$
DECLARE
  target_schema TEXT;
BEGIN
  FOR target_schema IN
    SELECT 'business_template'
    UNION
    SELECT schema_name
    FROM platform.businesses
    WHERE schema_name IS NOT NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.staff_members ADD COLUMN IF NOT EXISTS username VARCHAR(80)',
      target_schema
    );

    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS staff_members_username_unique ON %I.staff_members (LOWER(username)) WHERE username IS NOT NULL',
      target_schema
    );
  END LOOP;
END $$;
