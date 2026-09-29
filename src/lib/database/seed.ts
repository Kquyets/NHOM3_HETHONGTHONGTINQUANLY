import { scryptSync } from "node:crypto";
import { Pool } from "pg";

import { getDatabaseUrl } from "../../config/env";
import { assertLocalDatabaseUrl } from "./migration";

export function assertLocalSeedUrl(databaseUrl: string): void {
  try {
    assertLocalDatabaseUrl(databaseUrl);
  } catch {
    throw new Error("Database seeding is restricted to localhost");
  }
}

function getDeterministicPasswordHash(password: string): string {
  const salt = "0123456789abcdef0123456789abcdef";
  const key = scryptSync(password, Buffer.from(salt, "hex"), 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${key.toString("hex")}`;
}

export const DEMO_SEED_DATA = {
  owner: {
    email: "owner.demo@example.com",
    role: "owner" as const,
  },
  manager: {
    email: "manager.demo@example.com",
    role: "manager" as const,
  },
  tenantUser: {
    email: "tenant.demo@example.com",
    role: "tenant" as const,
  },
  properties: [
    {
      key: "an-binh",
      name: "Nhà trọ An Bình",
      address: "12 Nguyễn Văn Cừ, Quận 5",
    },
    {
      key: "binh-minh",
      name: "Nhà trọ Bình Minh",
      address: "48 Lê Văn Sỹ, Quận 3",
    },
  ],
  rooms: [
    { propertyKey: "an-binh", roomNumber: "A01", monthlyRent: 3_000_000, areaM2: "25.00", status: "ready" as const },
    { propertyKey: "an-binh", roomNumber: "A02", monthlyRent: 3_200_000, areaM2: "28.00", status: "ready" as const },
    { propertyKey: "an-binh", roomNumber: "A03", monthlyRent: 3_500_000, areaM2: "30.00", status: "ready" as const },
    { propertyKey: "binh-minh", roomNumber: "B01", monthlyRent: 4_000_000, areaM2: "35.00", status: "maintenance" as const },
    { propertyKey: "binh-minh", roomNumber: "B02", monthlyRent: 4_000_000, areaM2: "35.00", status: "ready" as const },
  ],
  tenant: {
    fullName: "Nguyễn Văn An",
    phone: "0901234567",
    birthDate: "1998-05-15",
  },
  contracts: [
    {
      roomNumber: "A01",
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      monthlyRentSnapshot: 3_000_000,
      depositSnapshot: 3_000_000,
      status: "active" as const,
    },
    {
      roomNumber: "A03",
      startDate: "2026-02-01",
      endDate: "2027-02-01",
      monthlyRentSnapshot: 3_500_000,
      depositSnapshot: 3_500_000,
      status: "active" as const,
    },
  ],
  utilityRates: [
    { propertyKey: "an-binh", utilityType: "electricity" as const, unitPrice: 3500, effectiveFrom: "2026-01-01" },
    { propertyKey: "an-binh", utilityType: "water" as const, unitPrice: 20000, effectiveFrom: "2026-01-01" },
    { propertyKey: "binh-minh", utilityType: "electricity" as const, unitPrice: 3800, effectiveFrom: "2026-01-01" },
    { propertyKey: "binh-minh", utilityType: "water" as const, unitPrice: 22000, effectiveFrom: "2026-01-01" },
  ],
};

export async function seedLocalDatabase(customUrl?: string): Promise<{
  ownerId: string;
  propertyCount: number;
  roomCount: number;
  contractCount: number;
}> {
  const databaseUrl = customUrl ?? getDatabaseUrl();
  assertLocalSeedUrl(databaseUrl);

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed or update demo users
    const passwordHash = getDeterministicPasswordHash("DemoPassword123!");

    const ownerRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id`,
      [DEMO_SEED_DATA.owner.email, passwordHash],
    );
    const ownerId = ownerRes.rows[0].id;

    const managerRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'manager', 'active')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id`,
      [DEMO_SEED_DATA.manager.email, passwordHash],
    );
    const managerId = managerRes.rows[0].id;

    const tenantUserRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'tenant', 'active')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id`,
      [DEMO_SEED_DATA.tenantUser.email, passwordHash],
    );
    const tenantUserId = tenantUserRes.rows[0].id;

    // 2. Seed properties
    const propertyIdMap = new Map<string, string>();
    for (const p of DEMO_SEED_DATA.properties) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM properties WHERE owner_id = $1 AND name = $2 LIMIT 1`,
        [ownerId, p.name],
      );
      if (existing.rowCount && existing.rows.length > 0) {
        propertyIdMap.set(p.key, existing.rows[0].id);
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO properties (owner_id, owner_role, name, address)
           VALUES ($1, 'owner', $2, $3)
           RETURNING id`,
          [ownerId, p.name, p.address],
        );
        propertyIdMap.set(p.key, inserted.rows[0].id);
      }
    }

    // Link manager to first property
    const firstPropertyId = propertyIdMap.get("an-binh");
    if (firstPropertyId) {
      await client.query(
        `INSERT INTO property_members (property_id, user_id, manager_role, status)
         VALUES ($1, $2, 'manager', 'active')
         ON CONFLICT (property_id, user_id) DO UPDATE SET status = 'active'`,
        [firstPropertyId, managerId],
      );
    }

    // 3. Seed rooms
    const roomIdMap = new Map<string, string>();
    for (const r of DEMO_SEED_DATA.rooms) {
      const propId = propertyIdMap.get(r.propertyKey);
      if (!propId) continue;

      const roomRes = await client.query<{ id: string }>(
        `INSERT INTO rooms (property_id, room_number, monthly_rent, area_m2, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (property_id, room_number) DO UPDATE
         SET monthly_rent = EXCLUDED.monthly_rent, area_m2 = EXCLUDED.area_m2, status = EXCLUDED.status
         RETURNING id`,
        [propId, r.roomNumber, r.monthlyRent, r.areaM2, r.status],
      );
      roomIdMap.set(r.roomNumber, roomRes.rows[0].id);
    }

    // 4. Seed tenant record
    const tenantRes = await client.query<{ id: string }>(
      `INSERT INTO tenants (user_id, linked_user_role, full_name, phone, birth_date)
       VALUES ($1, 'tenant', $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
       RETURNING id`,
      [tenantUserId, DEMO_SEED_DATA.tenant.fullName, DEMO_SEED_DATA.tenant.phone, DEMO_SEED_DATA.tenant.birthDate],
    );
    const tenantId = tenantRes.rows[0].id;

    // 5. Seed contracts
    let contractCount = 0;
    for (const c of DEMO_SEED_DATA.contracts) {
      const roomId = roomIdMap.get(c.roomNumber);
      if (!roomId) continue;

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM contracts WHERE room_id = $1 AND status = 'active' LIMIT 1`,
        [roomId],
      );

      let contractId: string;
      if (existing.rowCount && existing.rows.length > 0) {
        contractId = existing.rows[0].id;
      } else {
        const contractRes = await client.query<{ id: string }>(
          `INSERT INTO contracts (room_id, start_date, end_date, status, monthly_rent_snapshot, deposit_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [roomId, c.startDate, c.endDate, c.status, c.monthlyRentSnapshot, c.depositSnapshot],
        );
        contractId = contractRes.rows[0].id;
        contractCount++;
      }

      await client.query(
        `INSERT INTO contract_tenants (contract_id, tenant_id)
         VALUES ($1, $2)
         ON CONFLICT (contract_id, tenant_id) DO NOTHING`,
        [contractId, tenantId],
      );
    }

    // 6. Seed utility rates
    for (const rate of DEMO_SEED_DATA.utilityRates) {
      const propId = propertyIdMap.get(rate.propertyKey);
      if (!propId) continue;

      const existingRate = await client.query(
        `SELECT id FROM utility_rates WHERE property_id = $1 AND utility_type = $2 LIMIT 1`,
        [propId, rate.utilityType],
      );
      if (!existingRate.rowCount) {
        await client.query(
          `INSERT INTO utility_rates (property_id, utility_type, unit_price, effective_from)
           VALUES ($1, $2, $3, $4)`,
          [propId, rate.utilityType, rate.unitPrice, rate.effectiveFrom],
        );
      }
    }

    await client.query("COMMIT");

    return {
      ownerId,
      propertyCount: propertyIdMap.size,
      roomCount: roomIdMap.size,
      contractCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
