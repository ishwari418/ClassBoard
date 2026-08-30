const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const achievementRoutes = require('./routes/achievements');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/achievements', achievementRoutes);
app.use('/achievements', achievementRoutes);
app.use('/api', authRoutes);
app.use('/', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start Server after DB initialization
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`ClassBoard backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

module.exports = app;
