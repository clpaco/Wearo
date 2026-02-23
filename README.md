# 🧥 OutfitVault

> Your personal wardrobe manager — organize, plan, and share your outfits.

## Features

- 👕 **Wardrobe** — Photograph and catalog every garment you own
- 👔 **Outfits** — Combine garments into reusable outfit sets
- 📅 **Calendar** — Plan your daily looks ahead of time
- 🌤️ **Weather** — Get outfit suggestions based on local weather
- 📊 **Stats** — Discover usage patterns and optimize your closet
- 🌐 **Social** — Share your best outfits with the community

## Tech Stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Mobile   | React Native (Expo)                |
| State    | Redux Toolkit                      |
| Backend  | Node.js + Express                  |
| Database | PostgreSQL                         |
| Auth     | JWT + bcrypt                       |
| Docs     | Swagger UI                         |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/clpaco/OutfitVault.git
cd OutfitVault

# Frontend
cd frontend
npm install
npx expo start

# Backend (in a separate terminal)
cd backend
npm install
npm run dev
```

## Project Structure

```
OutfitVault/
├── frontend/   # React Native (Expo) app
├── backend/    # Express REST API
└── docs/       # Documentation
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Endpoints](docs/api-endpoints.md)
- [User Manual](docs/user-manual.md)

## Branch Strategy

| Branch            | Purpose                     |
|-------------------|-----------------------------|
| `main`            | Production releases         |
| `develop`         | Integration branch          |
| `feat/auth`       | Authentication module       |
| `feat/wardrobe`   | Wardrobe CRUD               |
| `feat/outfits`    | Outfit creation             |
| `feat/calendar`   | Calendar planning           |
| `feat/stats`      | Usage statistics            |
| `feat/social`     | Social feed & likes         |

## License

MIT
