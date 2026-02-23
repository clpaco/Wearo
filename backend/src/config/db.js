// Configuración de conexión a PostgreSQL
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto (dos niveles arriba de src/config/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

// Pool de conexiones reutilizable
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'outfitvault',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    max: 20, // máximo de conexiones simultáneas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.on('connect', () => {
    console.log('📦 Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error en la conexión a PostgreSQL:', err.message);
    process.exit(1);
});

// Helper para ejecutar queries
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
