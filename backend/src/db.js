const bcrypt = require('bcryptjs');

let Pool;
let poolOptions = {};

if (process.env.DATABASE_URL) {
  Pool = require('pg').Pool;
  poolOptions = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
} else {
  const { newDb } = require('pg-mem');
  const memoryDb = newDb();
  Pool = memoryDb.adapters.createPg().Pool;
  console.warn('DATABASE_URL no esta configurado. Usando base en memoria para desarrollo local.');
}

const pool = new Pool(poolOptions);

async function query(text, params) {
  return pool.query(text, params);
}

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Administrador',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS paintings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      technique TEXT NOT NULL DEFAULT '',
      dimensions TEXT NOT NULL DEFAULT '',
      image_data TEXT NOT NULL,
      image_mime TEXT NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await ensureAdminUser();
  await ensureSetting('whatsapp_phone', process.env.WHATSAPP_PHONE || '');
  await ensureSetting('artist_name', process.env.ARTIST_NAME || 'Galeria del Pintor');
}

async function ensureAdminUser() {
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD || (!process.env.DATABASE_URL ? 'admin123' : undefined);
  const displayName = process.env.ADMIN_NAME || 'Administrador';

  if (!password) {
    console.warn('ADMIN_PASSWORD no esta configurado. Define una password antes de desplegar.');
    return;
  }

  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rowCount > 0) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    'INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3)',
    [username, passwordHash, displayName]
  );
}

async function ensureSetting(key, value) {
  await query(
    'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
    [key, value]
  );
}

module.exports = { query };
module.exports.initializeDatabase = initializeDatabase;
