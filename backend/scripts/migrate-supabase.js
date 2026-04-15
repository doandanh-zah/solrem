const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ override: true });

async function run() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!projectId || !dbPassword) {
    throw new Error('Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD');
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectId}.supabase.co:5432/postgres`;

  const sqlPath = path.resolve(__dirname, '../../supabase_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query(sql);
    console.log('✅ Supabase migration applied');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
