CREATE TYPE user_role AS ENUM ('owner', 'manager', 'tenant');
CREATE TYPE account_status AS ENUM ('active', 'disabled');
CREATE TYPE property_member_status AS ENUM ('active', 'revoked');
CREATE TYPE room_status AS ENUM ('ready', 'maintenance');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  status account_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT users_id_role_unique UNIQUE (id, role),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_token_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT refresh_tokens_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT refresh_tokens_replaced_by_token_id_refresh_tokens_id_fk
    FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens USING btree (user_id);

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  owner_role user_role DEFAULT 'owner' NOT NULL,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT properties_owner_role_fk
    FOREIGN KEY (owner_id, owner_role) REFERENCES users(id, role) ON DELETE RESTRICT,
  CONSTRAINT properties_owner_role_check CHECK (owner_role = 'owner')
);

CREATE INDEX properties_owner_id_idx ON properties USING btree (owner_id);

CREATE TABLE property_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL,
  user_id uuid NOT NULL,
  manager_role user_role DEFAULT 'manager' NOT NULL,
  status property_member_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT property_members_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT property_members_manager_role_fk
    FOREIGN KEY (user_id, manager_role) REFERENCES users(id, role) ON DELETE CASCADE,
  CONSTRAINT property_members_manager_role_check CHECK (manager_role = 'manager'),
  CONSTRAINT property_members_property_user_unique UNIQUE (property_id, user_id)
);

CREATE INDEX property_members_user_id_idx ON property_members USING btree (user_id);

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  linked_user_role user_role DEFAULT 'tenant' NOT NULL,
  full_name text NOT NULL,
  national_id_encrypted text,
  phone text,
  birth_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tenants_linked_user_role_fk
    FOREIGN KEY (user_id, linked_user_role) REFERENCES users(id, role) ON DELETE RESTRICT,
  CONSTRAINT tenants_linked_user_role_check CHECK (linked_user_role = 'tenant'),
  CONSTRAINT tenants_user_id_unique UNIQUE (user_id)
);

CREATE INDEX tenants_full_name_idx ON tenants USING btree (full_name);

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL,
  room_number text NOT NULL,
  area_m2 numeric(8, 2),
  monthly_rent integer NOT NULL,
  status room_status DEFAULT 'ready' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT rooms_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT rooms_monthly_rent_nonnegative CHECK (monthly_rent >= 0),
  CONSTRAINT rooms_area_positive CHECK (area_m2 IS NULL OR area_m2 > 0),
  CONSTRAINT rooms_property_room_number_unique UNIQUE (property_id, room_number),
  CONSTRAINT rooms_id_property_id_unique UNIQUE (id, property_id)
);

CREATE INDEX rooms_property_id_idx ON rooms USING btree (property_id);

CREATE TYPE contract_status AS ENUM ('draft', 'active', 'ended', 'cancelled');

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status contract_status DEFAULT 'draft' NOT NULL,
  monthly_rent_snapshot integer NOT NULL,
  deposit_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT contracts_room_id_rooms_id_fk
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  CONSTRAINT contracts_date_range_valid CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT contracts_monthly_rent_nonnegative CHECK (monthly_rent_snapshot >= 0),
  CONSTRAINT contracts_deposit_nonnegative CHECK (deposit_snapshot >= 0)
);

CREATE UNIQUE INDEX contracts_one_active_per_room_unique
  ON contracts USING btree (room_id) WHERE status = 'active';
CREATE INDEX contracts_room_id_idx ON contracts USING btree (room_id);

CREATE TABLE contract_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  contract_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT contract_tenants_contract_id_contracts_id_fk
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT contract_tenants_tenant_id_tenants_id_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT contract_tenants_contract_tenant_unique UNIQUE (contract_id, tenant_id)
);

CREATE INDEX contract_tenants_tenant_id_idx ON contract_tenants USING btree (tenant_id);

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE utility_type AS ENUM ('electricity', 'water');

CREATE TABLE utility_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL,
  utility_type utility_type NOT NULL,
  unit_price integer NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT utility_rates_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT,
  CONSTRAINT utility_rates_id_property_type_unique UNIQUE (id, property_id, utility_type),
  CONSTRAINT utility_rates_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT utility_rates_effective_range_valid
    CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT utility_rates_period_no_overlap EXCLUDE USING gist (
    property_id WITH =,
    utility_type WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  )
);

CREATE INDEX utility_rates_property_utility_idx
  ON utility_rates USING btree (property_id, utility_type);

CREATE TABLE meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  property_id uuid NOT NULL,
  utility_type utility_type NOT NULL,
  billing_period date NOT NULL,
  previous_value numeric(12, 3) NOT NULL,
  current_value numeric(12, 3) NOT NULL,
  utility_rate_id uuid NOT NULL,
  unit_price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT meter_readings_room_property_fk
    FOREIGN KEY (room_id, property_id) REFERENCES rooms(id, property_id) ON DELETE RESTRICT,
  CONSTRAINT meter_readings_rate_property_type_fk
    FOREIGN KEY (utility_rate_id, property_id, utility_type)
    REFERENCES utility_rates(id, property_id, utility_type) ON DELETE RESTRICT,
  CONSTRAINT meter_readings_period_first_day CHECK (EXTRACT(DAY FROM billing_period) = 1),
  CONSTRAINT meter_readings_previous_nonnegative CHECK (previous_value >= 0),
  CONSTRAINT meter_readings_current_not_decreased CHECK (current_value >= previous_value),
  CONSTRAINT meter_readings_unit_price_nonnegative CHECK (unit_price_snapshot >= 0),
  CONSTRAINT meter_readings_room_utility_period_unique
    UNIQUE (room_id, utility_type, billing_period)
);

CREATE INDEX meter_readings_utility_rate_id_idx
  ON meter_readings USING btree (utility_rate_id);

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE invoice_item_type AS ENUM ('rent', 'electricity', 'water', 'service', 'adjustment');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'other');

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  contract_id uuid NOT NULL,
  billing_period_start date NOT NULL,
  issue_date date,
  due_date date,
  status invoice_status DEFAULT 'draft' NOT NULL,
  total_amount integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT invoices_contract_id_contracts_id_fk
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
  CONSTRAINT invoices_contract_period_unique UNIQUE (contract_id, billing_period_start),
  CONSTRAINT invoices_period_first_day CHECK (EXTRACT(DAY FROM billing_period_start) = 1),
  CONSTRAINT invoices_total_nonnegative CHECK (total_amount >= 0),
  CONSTRAINT invoices_due_date_valid
    CHECK (due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date)
);

CREATE INDEX invoices_contract_id_idx ON invoices USING btree (contract_id);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  invoice_id uuid NOT NULL,
  meter_reading_id uuid,
  item_type invoice_item_type NOT NULL,
  description text NOT NULL,
  quantity numeric(12, 3) NOT NULL,
  unit_price_snapshot integer NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT invoice_items_invoice_id_invoices_id_fk
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT invoice_items_meter_reading_id_meter_readings_id_fk
    FOREIGN KEY (meter_reading_id) REFERENCES meter_readings(id) ON DELETE RESTRICT,
  CONSTRAINT invoice_items_meter_reading_id_unique UNIQUE (meter_reading_id),
  CONSTRAINT invoice_items_quantity_nonnegative CHECK (quantity >= 0),
  CONSTRAINT invoice_items_unit_price_nonnegative CHECK (unit_price_snapshot >= 0),
  CONSTRAINT invoice_items_amount_nonnegative CHECK (amount >= 0)
);

CREATE INDEX invoice_items_invoice_id_idx ON invoice_items USING btree (invoice_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  invoice_id uuid NOT NULL,
  amount integer NOT NULL,
  paid_at timestamptz NOT NULL,
  method payment_method NOT NULL,
  reference text,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT payments_invoice_id_invoices_id_fk
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

CREATE INDEX payments_invoice_id_idx ON payments USING btree (invoice_id);


CREATE FUNCTION validate_meter_reading_rate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM utility_rates r WHERE r.id = NEW.utility_rate_id AND r.property_id = NEW.property_id AND r.utility_type = NEW.utility_type AND r.effective_from <= NEW.billing_period AND (r.effective_to IS NULL OR NEW.billing_period < r.effective_to)) THEN
    RAISE EXCEPTION 'meter reading rate must cover its property, utility, and billing period';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meter_readings_validate_rate BEFORE INSERT OR UPDATE ON meter_readings FOR EACH ROW EXECUTE FUNCTION validate_meter_reading_rate();

CREATE FUNCTION validate_invoice_meter_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  reading meter_readings%ROWTYPE;
  invoice_contract_room uuid;
  invoice_period date;
BEGIN
  IF NEW.item_type IN ('electricity', 'water') AND NEW.meter_reading_id IS NULL THEN RAISE EXCEPTION 'utility invoice item requires a meter reading'; END IF;
  IF NEW.meter_reading_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO reading FROM meter_readings WHERE id = NEW.meter_reading_id;
  SELECT c.room_id, i.billing_period_start INTO invoice_contract_room, invoice_period FROM invoices i JOIN contracts c ON c.id = i.contract_id WHERE i.id = NEW.invoice_id;
  IF invoice_contract_room IS NULL OR reading.room_id <> invoice_contract_room OR reading.billing_period <> invoice_period OR NEW.item_type::text <> reading.utility_type::text THEN RAISE EXCEPTION 'meter reading must match invoice contract room, period, and utility item'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoice_items_validate_meter BEFORE INSERT OR UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION validate_invoice_meter_item();
