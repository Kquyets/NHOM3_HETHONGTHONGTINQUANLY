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
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT properties_owner_id_users_id_fk
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX properties_owner_id_idx ON properties USING btree (owner_id);

CREATE TABLE property_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status property_member_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT property_members_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT property_members_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT property_members_property_user_unique UNIQUE (property_id, user_id)
);

CREATE INDEX property_members_user_id_idx ON property_members USING btree (user_id);

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  full_name text NOT NULL,
  national_id_encrypted text,
  phone text,
  birth_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tenants_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
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
  CONSTRAINT rooms_property_room_number_unique UNIQUE (property_id, room_number)
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
  utility_type utility_type NOT NULL,
  billing_period date NOT NULL,
  previous_value numeric(12, 3) NOT NULL,
  current_value numeric(12, 3) NOT NULL,
  utility_rate_id uuid NOT NULL,
  unit_price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT meter_readings_room_id_rooms_id_fk
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  CONSTRAINT meter_readings_utility_rate_id_utility_rates_id_fk
    FOREIGN KEY (utility_rate_id) REFERENCES utility_rates(id) ON DELETE RESTRICT,
  CONSTRAINT meter_readings_period_first_day CHECK (EXTRACT(DAY FROM billing_period) = 1),
  CONSTRAINT meter_readings_previous_nonnegative CHECK (previous_value >= 0),
  CONSTRAINT meter_readings_current_not_decreased CHECK (current_value >= previous_value),
  CONSTRAINT meter_readings_unit_price_nonnegative CHECK (unit_price_snapshot >= 0),
  CONSTRAINT meter_readings_room_utility_period_unique
    UNIQUE (room_id, utility_type, billing_period)
);

CREATE INDEX meter_readings_utility_rate_id_idx
  ON meter_readings USING btree (utility_rate_id);
