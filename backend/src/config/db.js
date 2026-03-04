// Configuración de conexión a PostgreSQL
const { Pool, types } = require('pg');

// Devolver DATE como string YYYY-MM-DD en vez de Date object (evita desfase por timezone)
types.setTypeParser(1082, (val) => val);
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto (dos niveles arriba de src/config/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

// Pool de conexiones reutilizable
// Railway provee DATABASE_URL; en local se usan variables separadas
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'outfitvault',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

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
