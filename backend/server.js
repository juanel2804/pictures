require('dotenv').config();

const express = require('express');
const path = require('path');
const cookie = require('./src/middleware/cookie');
const { initializeDatabase } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const paintingRoutes = require('./src/routes/paintings');
const settingsRoutes = require('./src/routes/settings');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'frontend');

app.use(express.json({ limit: '1mb' }));
app.use(cookie);
app.use(express.static(publicDir));

app.use('/api/auth', authRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', (error, req, res, next) => {
  console.error(error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'La imagen no debe pesar mas de 6 MB.' });
  }
  res.status(500).json({ message: error.message || 'Error del servidor.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

async function startServer() {
  await initializeDatabase();
  return app.listen(port, () => {
      console.log(`Galeria lista en puerto ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar la base de datos:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
