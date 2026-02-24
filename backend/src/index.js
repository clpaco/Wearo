// Servidor principal de OutfitVault API
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes de prendas)
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Ruta de prueba / health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    estado: 'activo',
    mensaje: 'OutfitVault API funcionando correctamente',
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

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: true,
    mensaje: err.message || 'Error interno del servidor',
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 OutfitVault API escuchando en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/v1/health`);
});

module.exports = app;
