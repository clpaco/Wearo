// Configuración de Multer — subida de imágenes de prendas
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directorio de uploads
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'garments');

// Crear directorio si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Generar nombre único: timestamp-random.extension
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueName}${ext}`);
    },
});

// Filtrar solo imágenes
const fileFilter = (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // máximo 10 MB
    },
});

module.exports = { upload, UPLOAD_DIR };
