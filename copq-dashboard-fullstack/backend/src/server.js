const express = require('express');
const cors = require('cors');
require('dotenv').config();

const copqRoutes = require('./routes/copqRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'COPQ Calculation Engine API', timestamp: new Date().toISOString() });
});

app.use('/api/copq', copqRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 COPQ Backend Server running on http://localhost:${PORT}`);
});
