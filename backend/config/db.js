const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB ERROR:', err.message);
  } else {
    console.log('DB CONNECTED:', res.rows[0].now);
  }
});

module.exports = pool;