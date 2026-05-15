CREATE OR REPLACE FUNCTION platform.fn_platform_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_old      JSONB;
  v_new      JSONB;
  v_changed  TEXT[];
  v_actor    TEXT;
BEGIN
  v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k)
    INTO v_changed
    FROM jsonb_object_keys(v_old) k
    WHERE v_old->>k IS DISTINCT FROM v_new->>k;
  END IF;

  -- Use platform account ID if set by app, else fallback to DB user
  v_actor := NULLIF(current_setting('app.current_account_id', true), '');
  IF v_actor IS NULL THEN
    v_actor := current_user;
  END IF;

  INSERT INTO platform.platform_audit_log
    (table_name, operation, record_id, changed_by, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE((COALESCE(v_new, v_old)->>'id')::UUID, NULL),
    v_actor,
    v_old,
    v_new,
    v_changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
