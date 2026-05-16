-- Migration 18: split business login identity from staff profile.
-- Each business schema owns its own accounts table, so email/phone/username are
-- unique per doanh nghiệp. Platform accounts remain separate in platform.accounts.

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
    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.accounts (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_code   VARCHAR(30),
        username       VARCHAR(80),
        email          VARCHAR(255),
        phone          VARCHAR(30),
        password_hash  VARCHAR(255) NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'active',
        last_login_at  TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_accounts_status CHECK (status = ANY(ARRAY['active','locked','disabled']))
      )
    $sql$, target_schema);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_unique ON %I.accounts (LOWER(username)) WHERE username IS NOT NULL', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON %I.accounts (LOWER(email)) WHERE email IS NOT NULL', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS accounts_phone_unique ON %I.accounts (phone) WHERE phone IS NOT NULL', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_code_unique ON %I.accounts (account_code) WHERE account_code IS NOT NULL', target_schema);

    EXECUTE format('ALTER TABLE %I.staff_members ADD COLUMN IF NOT EXISTS account_id UUID', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS staff_members_account_id_unique ON %I.staff_members (account_id) WHERE account_id IS NOT NULL', target_schema);

    EXECUTE format($sql$
      INSERT INTO %I.accounts (username, email, phone, password_hash, status, last_login_at, created_at, updated_at)
      SELECT
        LOWER(staff_code),
        LOWER(email),
        phone,
        password_hash,
        CASE WHEN is_active AND employment_status = 'active' THEN 'active' ELSE 'disabled' END,
        last_login_at,
        created_at,
        updated_at
      FROM %I.staff_members
      WHERE account_id IS NULL
        AND password_hash IS NOT NULL
      ON CONFLICT DO NOTHING
    $sql$, target_schema, target_schema);

    EXECUTE format($sql$
      UPDATE %I.staff_members sm
      SET account_id = a.id
      FROM %I.accounts a
      WHERE sm.account_id IS NULL
        AND LOWER(sm.staff_code) = a.username
    $sql$, target_schema, target_schema);
  END LOOP;
END $$;
