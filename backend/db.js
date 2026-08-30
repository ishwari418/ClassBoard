const { Pool } = require('pg');
const { newDb } = require('pg-mem');
require('dotenv').config();

let pool;
let isInMemory = false;

// SQL initialization script for schema
const initSchemaSql = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
    department VARCHAR(255) NOT NULL,
    class VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const setupDatabase = async () => {
  const connectionString = process.env.DATABASE_URL;
  const pgUser = process.env.PGUSER;

  if (connectionString || pgUser) {
    try {
      const realPool = new Pool({
        connectionString: connectionString || undefined,
        user: process.env.PGUSER,
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'classboard',
        password: process.env.PGPASSWORD,
        port: parseInt(process.env.PGPORT || '5432', 10),
      });

      // Test query
      await realPool.query('SELECT NOW()');
      await realPool.query(initSchemaSql);
      console.log('Connected to external PostgreSQL database.');
      return realPool;
    } catch (err) {
      console.warn('PostgreSQL connection failed:', err.message, '- Falling back to in-memory PostgreSQL instance.');
    }
  }

  // Fallback to pg-mem (full in-memory PostgreSQL engine)
  console.log('Using in-memory PostgreSQL engine (pg-mem)...');
  const memDb = newDb();
  
  // Register pg-mem extension functions if needed
  memDb.public.interceptQueries(query => {
    return null;
  });

  const adapter = memDb.adapters.createPg();
  const memPool = new adapter.Pool();
  
  await memPool.query(initSchemaSql);
  isInMemory = true;
  return memPool;
};

let dbPromise = setupDatabase();

module.exports = {
  query: async (text, params) => {
    const db = await dbPromise;
    return db.query(text, params);
  },
  init: async () => {
    return await dbPromise;
  }
};
