-- =====================================================================
-- 0091 Platform SuperAdmin Complete
-- Bổ sung các bảng, hàm còn thiếu để SuperAdmin đầy đủ production.
-- Idempotent: an toàn chạy nhiều lần.
-- =====================================================================
SET search_path TO platform, public;

-- ─────────────────────────────────────────────────────────────────────
-- 1. WEBHOOK DELIVERY LOGS
--    Ghi lại từng lần gửi webhook: HTTP status, body, retry, timing.
--    Thiếu bảng này → không biết webhook thành công hay thất bại.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.webhook_delivery_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID        REFERENCES platform.webhook_endpoints(id) ON DELETE CASCADE,
  event_type          VARCHAR(100) NOT NULL,
  payload             JSONB       NOT NULL DEFAULT '{}',
  attempt_number      SMALLINT    NOT NULL DEFAULT 1,
  http_status         SMALLINT,
  response_body       TEXT,
  duration_ms         INTEGER,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  delivered_at        TIMESTAMPTZ,
  next_retry_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_wdl_status CHECK (status = ANY(ARRAY['pending','delivered','failed','exhausted']))
);
CREATE INDEX IF NOT EXISTS idx_wdl_endpoint
  ON platform.webhook_delivery_logs(webhook_endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wdl_retry
  ON platform.webhook_delivery_logs(status, next_retry_at)
  WHERE status IN ('pending','failed');

-- ─────────────────────────────────────────────────────────────────────
-- 2. SUPPORT TICKETS
--    Permission platform.support_ticket.* đã có trong RBAC nhưng
--    không có bảng. SUPPORT_ADMIN không có chỗ lưu ticket.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.support_tickets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code   VARCHAR(30) NOT NULL UNIQUE,
  business_id     UUID        REFERENCES platform.businesses(id),
  opened_by     UUID        REFERENCES platform.accounts(id),
  assigned_to   UUID        REFERENCES platform.accounts(id),
  category      VARCHAR(50) NOT NULL DEFAULT 'general',
  priority      VARCHAR(20) NOT NULL DEFAULT 'medium',
  subject       VARCHAR(500) NOT NULL,
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'open',
  resolved_at   TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ticket_priority CHECK (priority = ANY(ARRAY['low','medium','high','urgent'])),
  CONSTRAINT chk_ticket_status   CHECK (status   = ANY(ARRAY['open','in_progress','waiting','resolved','closed']))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant
  ON platform.support_tickets(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
  ON platform.support_tickets(assigned_to, status)
  WHERE status NOT IN ('closed','resolved');

CREATE TABLE IF NOT EXISTS platform.support_ticket_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES platform.support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID        REFERENCES platform.accounts(id),
  message     TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
  attachments JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stm_ticket
  ON platform.support_ticket_messages(ticket_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- 3. IMPERSONATION SESSIONS
--    Audit trail khi SUPPORT_ADMIN vào business để hỗ trợ.
--    Thiếu bảng này → không audit được ai vào business nào, lúc nào, làm gì.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.impersonation_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  support_account_id UUID        NOT NULL REFERENCES platform.accounts(id),
  business_id          UUID        NOT NULL REFERENCES platform.businesses(id),
  support_ticket_id  UUID        REFERENCES platform.support_tickets(id),
  reason             TEXT        NOT NULL,
  ip_address         VARCHAR(100),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ,
  duration_minutes   INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
  ) STORED,
  actions_log        JSONB       NOT NULL DEFAULT '[]',
  status             VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT chk_impersonation_status CHECK (status = ANY(ARRAY['active','ended','force_ended']))
);
CREATE INDEX IF NOT EXISTS idx_impersonation_support
  ON platform.impersonation_sessions(support_account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant
  ON platform.impersonation_sessions(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON platform.impersonation_sessions(status)
  WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────
-- 4. PLATFORM ANNOUNCEMENTS
--    Thông báo bảo trì, tính năng mới, cảnh báo đến toàn bộ / một số business.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.platform_announcements (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(500) NOT NULL,
  body                TEXT        NOT NULL,
  announcement_type   VARCHAR(30) NOT NULL DEFAULT 'info',
  target_plans        TEXT[]      NOT NULL DEFAULT '{}',    -- empty = tất cả plans
  target_business_ids   UUID[]      NOT NULL DEFAULT '{}',    -- empty = tất cả business
  publish_at          TIMESTAMPTZ,
  expire_at           TIMESTAMPTZ,
  is_pinned           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by          UUID        REFERENCES platform.accounts(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_announcement_type CHECK (
    announcement_type = ANY(ARRAY['info','maintenance','feature','warning','critical'])
  )
);
CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON platform.platform_announcements(publish_at, expire_at)
  WHERE publish_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 5. SYSTEM SETTINGS
--    Permission platform.system_setting.* đã có trong RBAC nhưng
--    không có bảng lưu config. Hiện tại không có cách nào thay đổi
--    cấu hình hệ thống mà không cần deploy lại code.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.system_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   VARCHAR(150) NOT NULL UNIQUE,
  setting_value TEXT,
  value_type    VARCHAR(20) NOT NULL DEFAULT 'string',
  description   TEXT,
  is_secret     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by    UUID        REFERENCES platform.accounts(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_setting_value_type CHECK (
    value_type = ANY(ARRAY['string','integer','boolean','json'])
  )
);

INSERT INTO platform.system_settings(setting_key, setting_value, value_type, description) VALUES
  ('trial_period_days',          '14',    'integer', 'Số ngày dùng thử miễn phí'),
  ('past_due_grace_days',        '7',     'integer', 'Ngày ân hạn trước khi suspend khi quá hạn thanh toán'),
  ('max_login_attempts',         '5',     'integer', 'Số lần sai mật khẩu tối đa trước khi lock tài khoản'),
  ('session_timeout_minutes',    '480',   'integer', 'Thời gian timeout phiên đăng nhập (phút)'),
  ('support_access_max_hours',   '8',     'integer', 'Thời gian tối đa 1 phiên impersonation (giờ)'),
  ('webhook_retry_backoff_base', '60',    'integer', 'Webhook retry base delay (giây, tăng theo exponential)'),
  ('webhook_max_retries',        '5',     'integer', 'Số lần retry webhook tối đa'),
  ('max_tenants_per_instance',   '1000',  'integer', 'Số business tối đa trên 1 instance DB'),
  ('maintenance_mode',           'false', 'boolean', 'Bật maintenance mode toàn hệ thống'),
  ('platform_support_email',     '',      'string',  'Email hỗ trợ hiển thị cho business'),
  ('platform_support_phone',     '',      'string',  'Hotline hỗ trợ hiển thị cho business'),
  ('min_password_length',        '8',     'integer', 'Độ dài mật khẩu tối thiểu'),
  ('require_mfa_platform_admin', 'true',  'boolean', 'Bắt buộc MFA với tài khoản platform admin')
ON CONFLICT (setting_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 6. TENANT MODULES
--    Permission platform.module.* đã có nhưng không có bảng.
--    Cần bảng này để bật/tắt từng module cho từng business theo plan.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.business_modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES platform.businesses(id) ON DELETE CASCADE,
  module_key  VARCHAR(80) NOT NULL,
  is_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  enabled_at  TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  enabled_by  UUID        REFERENCES platform.accounts(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, module_key)
);
CREATE INDEX IF NOT EXISTS idx_business_modules_enabled
  ON platform.business_modules(business_id)
  WHERE is_enabled = TRUE;

-- Seed module mặc định cho business đã tồn tại
INSERT INTO platform.business_modules(business_id, module_key, is_enabled, enabled_at)
SELECT t.id, m.module_key, TRUE, NOW()
FROM platform.businesses t
CROSS JOIN (VALUES
  ('pos_sales'),
  ('inventory'),
  ('crm'),
  ('hr_payroll'),
  ('accounting'),
  ('invoice_tax'),
  ('loyalty_wallet'),
  ('shipping'),
  ('service_warranty'),
  ('production_waste'),
  ('marketing_campaign')
) AS m(module_key)
ON CONFLICT (business_id, module_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 7. SEED PERMISSIONS MỚI (announcement)
--    Các permission còn lại đã có trong 0090, chỉ thiếu announcement.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO platform.permissions(permission_key, permission_name, module_key, description) VALUES
  ('platform.announcement.view',   'Xem thông báo hệ thống',  'announcement', 'Xem danh sách announcement'),
  ('platform.announcement.create', 'Tạo thông báo hệ thống',  'announcement', 'Tạo mới announcement'),
  ('platform.announcement.update', 'Sửa thông báo hệ thống',  'announcement', 'Chỉnh sửa announcement'),
  ('platform.announcement.delete', 'Xóa thông báo hệ thống',  'announcement', 'Xóa announcement'),
  ('platform.tenant_module.view',  'Xem module của business',   'module',       'Xem trạng thái module'),
  ('platform.tenant_module.toggle','Bật/tắt module business',   'module',       'Thay đổi trạng thái module')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  updated_at      = NOW();

-- Gán announcement permissions cho PLATFORM_OWNER + PLATFORM_ADMIN
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM platform.roles r
JOIN platform.permissions p ON p.permission_key LIKE 'platform.announcement.%'
  OR p.permission_key LIKE 'platform.tenant_module.%'
WHERE r.role_key IN ('PLATFORM_OWNER','PLATFORM_ADMIN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- TECH_OPS có thể toggle modules
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM platform.roles r
JOIN platform.permissions p ON p.permission_key IN (
  'platform.tenant_module.view','platform.tenant_module.toggle',
  'platform.announcement.view'
)
WHERE r.role_key = 'TECH_OPS'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALES_CSKH chỉ xem announcement
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = 'platform.announcement.view'
WHERE r.role_key IN ('SALES_CSKH','AUDITOR','SUPPORT_ADMIN','BILLING_ADMIN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 8. fn_check_plan_limits — Kiểm tra business có vượt giới hạn plan chưa
--    Trả về TRUE nếu còn trong giới hạn, FALSE nếu vượt.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_check_plan_limits(
  p_business_id UUID,
  p_limit_key VARCHAR(80)
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan_code    VARCHAR(50);
  v_limit_value  BIGINT;
  v_is_hard      BOOLEAN;
  v_reset_period VARCHAR(20);
  v_period_start DATE;
  v_current      BIGINT;
BEGIN
  SELECT ts.plan_code INTO v_plan_code
  FROM platform.business_subscriptions ts
  WHERE ts.business_id = p_business_id AND ts.status IN ('trial','active')
  LIMIT 1;

  IF v_plan_code IS NULL THEN RETURN FALSE; END IF;

  SELECT pl.limit_value, pl.is_hard_limit, pl.reset_period
  INTO v_limit_value, v_is_hard, v_reset_period
  FROM platform.plan_limits pl
  WHERE pl.plan_code = v_plan_code AND pl.limit_key = p_limit_key;

  IF v_limit_value IS NULL THEN RETURN TRUE; END IF;  -- Không giới hạn

  v_period_start := CASE v_reset_period
    WHEN 'monthly' THEN date_trunc('month', NOW())::DATE
    WHEN 'daily'   THEN CURRENT_DATE
    ELSE NULL
  END;

  SELECT COALESCE(tuc.current_value, 0) INTO v_current
  FROM platform.business_usage_counters tuc
  WHERE tuc.business_id = p_business_id
    AND tuc.usage_key = p_limit_key
    AND (v_period_start IS NULL OR tuc.period_start = v_period_start);

  RETURN COALESCE(v_current, 0) < v_limit_value;
END;
$$;
REVOKE EXECUTE ON FUNCTION platform.fn_check_plan_limits(UUID, VARCHAR) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────────
-- 9. fn_increment_usage — Tăng usage counter khi business tạo resource
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_increment_usage(
  p_business_id UUID,
  p_usage_key VARCHAR(80),
  p_delta     BIGINT DEFAULT 1
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period_start DATE := date_trunc('month', NOW())::DATE;
  v_period_end   DATE := (date_trunc('month', NOW()) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  INSERT INTO platform.business_usage_counters(
    business_id, usage_key, current_value, period_start, period_end, updated_at
  )
  VALUES (p_business_id, p_usage_key, p_delta, v_period_start, v_period_end, NOW())
  ON CONFLICT (business_id, usage_key, period_start, period_end) DO UPDATE
    SET current_value = platform.business_usage_counters.current_value + p_delta,
        updated_at    = NOW();

  INSERT INTO platform.business_usage_daily(business_id, usage_date, usage_key, usage_value)
  VALUES (p_business_id, CURRENT_DATE, p_usage_key, p_delta)
  ON CONFLICT (business_id, usage_date, usage_key) DO UPDATE
    SET usage_value = platform.business_usage_daily.usage_value + p_delta;
END;
$$;
REVOKE EXECUTE ON FUNCTION platform.fn_increment_usage(UUID, VARCHAR, BIGINT) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────────
-- 10. fn_expire_support_grants — Thu hồi quyền support tạm thời hết hạn
--     Gọi qua cron mỗi giờ: SELECT platform.fn_expire_support_grants();
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_expire_support_grants()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE platform.account_role_bindings
  SET support_grant_until = NULL,
      updated_at          = NOW()
  WHERE support_grant_until IS NOT NULL
    AND support_grant_until < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Kết thúc impersonation session còn active nếu support access đã hết
  UPDATE platform.impersonation_sessions
  SET status   = 'force_ended',
      ended_at = NOW()
  WHERE status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM platform.account_role_bindings arb
      WHERE arb.account_id = platform.impersonation_sessions.support_account_id
        AND arb.support_grant_until > NOW()
    );

  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION platform.fn_expire_support_grants() FROM PUBLIC;
COMMENT ON FUNCTION platform.fn_expire_support_grants() IS
  'Gọi qua cron mỗi giờ: SELECT platform.fn_expire_support_grants()';

DO $$ BEGIN
  RAISE NOTICE '✅ 0091_platform_superadmin_complete: 6 tables + 3 functions applied.';
END $$;
