# 🧥 OutfitVault

> Tu gestor de armario personal — organiza, planifica y comparte tus outfits.

## Características

- 👕 **Armario** — Fotografía y cataloga cada prenda que tengas
- 👔 **Outfits** — Combina prendas en conjuntos reutilizables
- 📅 **Calendario** — Planifica tu look diario con antelación
- 🌤️ **Clima** — Obtén sugerencias de outfit según el clima local
- 📊 **Estadísticas** — Descubre patrones de uso y optimiza tu armario
- 🌐 **Social** — Comparte tus mejores outfits con la comunidad

## Stack Tecnológico

| Capa       | Tecnología                         |
|------------|------------------------------------|
| Móvil      | React Native (Expo)                |
| Estado     | Redux Toolkit                      |
| Backend    | Node.js + Express                  |
| Base Datos | PostgreSQL                         |
| Auth       | JWT + bcrypt                       |
| Docs API   | Swagger UI                         |

## Primeros Pasos

```bash
# Clonar el repositorio
git clone https://github.com/clpaco/OutfitVault.git
cd OutfitVault

# Frontend
cd frontend
npm install
npx expo start

# Backend (en otra terminal)
cd backend
npm install
npm run dev
```

## Estructura del Proyecto

```
OutfitVault/
├── frontend/   # Aplicación React Native (Expo)
├── backend/    # API REST con Express
└── docs/       # Documentación
```

## Documentación

- [Arquitectura](docs/architecture.md)
- [Endpoints de la API](docs/api-endpoints.md)
- [Manual de Usuario](docs/user-manual.md)

## Estrategia de Ramas

| Rama              | Propósito                    |
|-------------------|------------------------------|
| `main`            | Releases de producción       |
| `develop`         | Rama de integración          |
| `feat/auth`       | Módulo de autenticación      |
| `feat/wardrobe`   | CRUD del armario             |
| `feat/outfits`    | Creación de outfits          |
| `feat/calendar`   | Planificación en calendario  |
| `feat/stats`      | Estadísticas de uso          |
| `feat/social`     | Feed social y likes          |

## Licencia

MIT
