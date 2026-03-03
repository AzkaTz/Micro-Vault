import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import strainRoutes from "./routes/strains.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.use("/api/auth", authRoutes);
app.use("/api/strains", strainRoutes);

export default app;