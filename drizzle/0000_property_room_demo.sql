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
