import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './config/db.js';
import authRoutes from './routes/auth.js';
import strainRoutes from './routes/strains.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), version: '1.0.0' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM users');
    res.json({ success: true, userCount: result.rows[0].count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/strains', strainRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;