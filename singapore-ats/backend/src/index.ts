import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import candidatesRouter from './routes/candidates';
import jobsRouter from './routes/jobs';
import applicationsRouter from './routes/applications';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/candidates', candidatesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Singapore ATS API running on port ${PORT}`);
});
