
-- Danh mục sản phẩm (tree)
CREATE TABLE IF NOT EXISTS product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID,  -- self FK
  category_code   VARCHAR(30),  -- AUTO: DM000001
  category_name   VARCHAR(150) NOT NULL,
  category_type   VARCHAR(50)  NOT NULL DEFAULT 'product',
  track_inventory BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order   INTEGER      NOT NULL DEFAULT 0,
  color_code      VARCHAR(7),
  icon_url        TEXT,
  slug            VARCHAR(255),
  description     TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_category_type CHECK (category_type = ANY(ARRAY['product','service','combo']))
);

-- Thương hiệu
CREATE TABLE IF NOT EXISTS brands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(150) NOT NULL,
  logo_url   TEXT,
  description TEXT,
  display_order INTEGER    NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Đơn vị tính
CREATE TABLE IF NOT EXISTS units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_name   VARCHAR(50) NOT NULL,
  unit_symbol VARCHAR(10),
  unit_type   VARCHAR(20) NOT NULL DEFAULT 'piece',
  display_order INTEGER   NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_unit_type CHECK (unit_type = ANY(ARRAY['weight','volume','piece','portion','length','area']))
);

INSERT INTO units (unit_name,unit_symbol,unit_type,display_order) VALUES
  ('Cái','cái','piece',1),('Hộp','hộp','piece',2),('Túi','túi','piece',3),
  ('Gói','gói','piece',4),('Ly','ly','piece',5),('Phần','phần','portion',6),
  ('Suất','suất','portion',7),('Kilogram','kg','weight',8),('Gram','g','weight',9),
  ('Lít','L','volume',10),('Mililit','ml','volume',11),('Chai','chai','piece',12),
  ('Lon','lon','piece',13),('Thùng','thùng','piece',14),('Tá','tá','piece',15),
  ('Bộ','bộ','piece',16),('Đôi','đôi','piece',17)
ON CONFLICT DO NOTHING;

-- Thuế
CREATE TABLE IF NOT EXISTS tax_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code    VARCHAR(20)  NOT NULL UNIQUE,
  tax_name    VARCHAR(100) NOT NULL,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  display_order INTEGER    NOT NULL DEFAULT 0,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO tax_classes (tax_code,tax_name,tax_rate,is_default,display_order) VALUES
  ('TAX0','Miễn thuế',0.00,FALSE,1),('TAX5','VAT 5%',5.00,FALSE,2),
  ('TAX8','VAT 8%',8.00,FALSE,3),   ('TAX10','VAT 10%',10.00,TRUE,4)
ON CONFLICT DO NOTHING;

-- Nhóm thuộc tính sản phẩm (kích cỡ, độ đường, topping...)
CREATE TABLE IF NOT EXISTS product_attribute_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name    VARCHAR(100) NOT NULL,
  input_type    VARCHAR(20)  NOT NULL DEFAULT 'single',
  is_required   BOOLEAN      NOT NULL DEFAULT FALSE,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_input_type CHECK (input_type = ANY(ARRAY['single','multiple']))
);

INSERT INTO product_attribute_groups (group_name,input_type,is_required,display_order) VALUES
  ('Kích cỡ','single',TRUE,1),('Độ đường','single',FALSE,2),
  ('Đá','single',FALSE,3),('Topping','multiple',FALSE,4),
  ('Màu sắc','single',FALSE,5),('Suất','single',TRUE,6),
  ('Nhiệt độ','single',FALSE,7),('Ghi chú bếp','multiple',FALSE,8)
ON CONFLICT DO NOTHING;

-- Giá trị thuộc tính
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID         NOT NULL REFERENCES product_attribute_groups(id) ON DELETE CASCADE,
  value_name    VARCHAR(100) NOT NULL,
  extra_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Tag sản phẩm
CREATE TABLE IF NOT EXISTS product_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name   VARCHAR(100) NOT NULL,
  tag_color  VARCHAR(7)   NOT NULL DEFAULT '#6366f1',
  slug       VARCHAR(100),
  display_order INTEGER   NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO product_tags (tag_name,tag_color,slug,display_order) VALUES
  ('Bán chạy','#ef4444','ban-chay',1),('Mới','#22c55e','moi',2),
  ('Sale','#f97316','sale',3),('Đặc biệt','#8b5cf6','dac-biet',4),
  ('Theo mùa','#06b6d4','theo-mua',5),('Combo','#ec4899','combo',6),
  ('Giới hạn','#eab308','gioi-han',7),('Hết hàng','#6b7280','het-hang',8)
ON CONFLICT DO NOTHING;

-- Sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code    VARCHAR(50),    -- AUTO: SP000001
  product_name    VARCHAR(255) NOT NULL,
  category_id     UUID         REFERENCES product_categories(id),
  brand_id        UUID         REFERENCES brands(id),
  tax_id          UUID         REFERENCES tax_classes(id),
  unit_id         UUID         REFERENCES units(id),
  sku             VARCHAR(100),
  barcode         VARCHAR(100),
  sell_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,
  cost_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,
  compare_price   NUMERIC(18,4),  -- Giá gạch ngang khi sale
  earn_points     INTEGER        NOT NULL DEFAULT 0,
  weight_gram     INTEGER,
  min_stock_level NUMERIC(12,3),  -- Cảnh báo tồn kho thấp
  slug            VARCHAR(255),
  short_desc      TEXT,
  full_desc       TEXT,
  image_url       VARCHAR(500),
  gallery_images  JSONB          NOT NULL DEFAULT '[]',
  display_order   INTEGER        NOT NULL DEFAULT 0,
  show_on_pos     BOOLEAN        NOT NULL DEFAULT TRUE,
  show_online     BOOLEAN        NOT NULL DEFAULT TRUE,
  allow_backorder BOOLEAN        NOT NULL DEFAULT FALSE,
  track_inventory BOOLEAN        NOT NULL DEFAULT TRUE,
  has_variants    BOOLEAN        NOT NULL DEFAULT FALSE,
  product_type    VARCHAR(30)    NOT NULL DEFAULT 'simple',
  pos_color       VARCHAR(7),
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_product_type CHECK (product_type = ANY(ARRAY['simple','variant','combo','service']))
);

-- Biến thể sản phẩm
CREATE TABLE IF NOT EXISTS product_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  sku          VARCHAR(100),
  barcode      VARCHAR(100),
  sell_price   NUMERIC(18,4),
  cost_price   NUMERIC(18,4),
  attributes   JSONB        NOT NULL DEFAULT '{}',  -- {"Kích cỡ":"M","Màu":"Đen"}
  image_url    VARCHAR(500),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Mapping tag - sản phẩm
CREATE TABLE IF NOT EXISTS product_tag_mappings (
  product_id UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Combo items (thành phần combo)
CREATE TABLE IF NOT EXISTS combo_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id  UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,  -- SP loại combo
  item_product_id   UUID          NOT NULL REFERENCES products(id),  -- Thành phần
  item_variant_id   UUID                   REFERENCES product_variants(id),
  quantity          NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_name         VARCHAR(50),
  is_optional       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_combo_no_self_ref CHECK (combo_product_id <> item_product_id),
  CONSTRAINT chk_combo_qty_positive CHECK (quantity > 0)
);

-- Đơn vị tính sản phẩm (chuyển đổi đơn vị)
CREATE TABLE IF NOT EXISTS product_units (
  product_id        UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id           UUID          NOT NULL REFERENCES units(id),
  conversion_factor NUMERIC(10,4) NOT NULL DEFAULT 1,
  is_base_unit      BOOLEAN       NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, unit_id)
);

-- Giảm giá / Khuyến mãi đơn giản
CREATE TABLE IF NOT EXISTS discounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID,
  discount_code   VARCHAR(50)  NOT NULL,
  discount_name   VARCHAR(255) NOT NULL,
  discount_type   VARCHAR(30)  NOT NULL DEFAULT 'percentage',
  discount_value  NUMERIC(18,4) NOT NULL,
  min_order_value NUMERIC(18,2),
  max_discount    NUMERIC(18,2),
  apply_scope     VARCHAR(30)  NOT NULL DEFAULT 'order',
  start_date      DATE,
  end_date        DATE,
  usage_limit     INTEGER,
  used_count      INTEGER      NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_discount_type  CHECK (discount_type = ANY(ARRAY['percentage','fixed_amount','buy_x_get_y','free_item'])),
  CONSTRAINT chk_apply_scope    CHECK (apply_scope   = ANY(ARRAY['order','product','category','customer_group']))
);