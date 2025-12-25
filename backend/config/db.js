const { Pool } = require('pg');

// Parse DATABASE_URL manually
const connectionString = process.env.DATABASE_URL;

console.log('🔍 DATABASE_URL:', connectionString); // Debug log

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'microvault',
  password: 'Azka3404',  // Hardcoded temporarily
  port: 5432,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Full error:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

module.exports = pool;