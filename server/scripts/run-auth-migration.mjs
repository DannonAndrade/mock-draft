import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const migrationUrl = new URL('../migrations/002-add-passport-auth.sql', import.meta.url);
const sql = await readFile(migrationUrl, 'utf8');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log('Passport authentication migration applied successfully.');
} finally {
  await pool.end();
}
