CREATE TYPE room_status AS ENUM ('vacant', 'occupied', 'maintenance');

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL,
  room_number text NOT NULL,
  monthly_rent integer NOT NULL,
  status room_status DEFAULT 'vacant' NOT NULL,
  CONSTRAINT rooms_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT rooms_monthly_rent_nonnegative CHECK (monthly_rent >= 0),
  CONSTRAINT rooms_property_room_number_unique UNIQUE (property_id, room_number)
);

CREATE INDEX rooms_property_id_idx ON rooms USING btree (property_id);
