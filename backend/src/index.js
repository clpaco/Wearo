// Servidor principal de Wearo API
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes de prendas)
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    app: 'Wearo API',
    version: '1.0.0',
    health: '/api/v1/health',
  });
});

// Ruta de prueba / health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    estado: 'activo',
    mensaje: 'Wearo API funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/garments', require('./routes/garments.routes'));

// TODO: Activar cuando se implementen
app.use('/api/v1/outfits', require('./routes/outfits.routes'));
app.use('/api/v1/calendar', require('./routes/calendar.routes'));
app.use('/api/v1/stats', require('./routes/stats.routes'));
app.use('/api/v1/social', require('./routes/social.routes'));
app.use('/api/v1/users',  require('./routes/profile.routes'));
app.use('/api/v1/ai',     require('./routes/ai.routes'));
app.use('/api/v1/messages', require('./routes/messages.routes'));
app.use('/api/v1/admin',    require('./routes/admin.routes'));
app.use('/api/v1/support',  require('./routes/support.routes'));

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: true,
    mensaje: err.message || 'Error interno del servidor',
  });
});

// Iniciar servidor (0.0.0.0 para que Railway/Docker puedan acceder)
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Wearo API escuchando en puerto ${PORT}`);
  console.log(`Health check: /api/v1/health`);

  // Seed admin user
  try {
    const hash = await bcrypt.hash('admin123', 12);
    await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('admin@wearo.com', $1, 'Administrador', 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
      [hash]
    );
  } catch (e) { /* tabla puede no existir aun */ }
});

module.exports = app;
