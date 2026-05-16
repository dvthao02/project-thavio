-- Migration 17: Enforce unique legal business identity fields.
-- Run the duplicate checks first so the migration fails with a clear reason
-- instead of creating a partial constraint on dirty data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM platform.businesses
    WHERE tax_code IS NOT NULL
    GROUP BY LOWER(tax_code)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate platform.businesses.tax_code values exist. Clean them before applying unique index.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_tax_code_unique
  ON platform.businesses (LOWER(tax_code))
  WHERE tax_code IS NOT NULL;
