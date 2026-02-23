# OutfitVault — Arquitectura

## Descripción General

OutfitVault es una aplicación móvil full-stack para gestionar un armario personal,
crear outfits y planificar looks diarios según el clima y eventos del calendario.

## Arquitectura del Sistema

```
┌─────────────────────┐       ┌─────────────────────┐
│   App React Native  │◄─────►│   API REST Express   │
│   (Expo / Móvil)    │ HTTPS │   (Backend Node.js)  │
└─────────────────────┘       └──────────┬────────────┘
                                         │
                              ┌──────────▼────────────┐
                              │     PostgreSQL DB      │
                              └────────────────────────┘
```

## Stack Tecnológico

### Frontend
- **Framework:** React Native (Expo)
- **Navegación:** React Navigation v6
- **Gestión de Estado:** Redux Toolkit
- **Cliente HTTP:** Axios
- **Gráficos:** Victory Native
- **Cámara:** Expo Camera
- **Almacenamiento Seguro:** Expo SecureStore

### Backend
- **Entorno:** Node.js
- **Framework:** Express
- **Autenticación:** JWT + bcrypt
- **Base de Datos:** PostgreSQL (driver pg)
- **Subida de Archivos:** Multer
- **Documentación:** Swagger UI Express

### APIs Externas
- OpenWeatherMap — sugerencias de outfit basadas en el clima
- Remove.bg — eliminación de fondo en fotos de prendas

## Estructura de Directorios

```
OutfitVault/
├── frontend/src/
│   ├── screens/        # Pantallas (Login, Armario, Outfits…)
│   ├── components/     # Componentes UI reutilizables
│   ├── navigation/     # Configuración de React Navigation
│   ├── store/          # Slices de Redux y configuración del store
│   ├── services/       # Capa de servicios API (Axios)
│   ├── hooks/          # Hooks personalizados de React
│   └── utils/          # Helpers y constantes
├── backend/src/
│   ├── routes/         # Definiciones de rutas Express
│   ├── controllers/    # Manejadores de peticiones
│   ├── models/         # Modelos de base de datos
│   ├── middleware/      # Auth, manejo de errores, subida
│   ├── services/       # Capa de lógica de negocio
│   └── config/         # Conexión a BD, configuración de entorno
└── docs/               # Documentación del proyecto
```
