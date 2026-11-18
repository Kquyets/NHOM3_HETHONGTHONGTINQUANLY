import { createDatabasePool } from '../lib/database/client';
import { getDatabaseUrl } from '../config/env';
import * as schema from '../lib/database/schema';

async function main() {
  const pool = createDatabasePool(getDatabaseUrl());
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const dbCols = new Set(res.rows.map((r: any) => `${r.table_name}.${r.column_name}`));
    console.log('Total columns in DB:', dbCols.size);

    const missing: string[] = [];
    for (const [key, val] of Object.entries(schema)) {
      if (val && typeof val === 'object' && Symbol.for('drizzle:Columns') in val) {
        const table: any = val;
        const tableName = table[Symbol.for('drizzle:Name')] || key;
        const cols = table[Symbol.for('drizzle:Columns')];
        if (cols) {
          for (const colObj of Object.values(cols) as any[]) {
            const colDbName = colObj.name;
            const fullKey = `${tableName}.${colDbName}`;
            if (!dbCols.has(fullKey)) {
              missing.push(fullKey);
            }
          }
        }
      }
    }

    if (missing.length === 0) {
      console.log('SUCCESS: All schema columns exist in DB!');
    } else {
      console.error('MISSING COLUMNS in DB:', missing);
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
