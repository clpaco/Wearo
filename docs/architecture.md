# OutfitVault — Architecture

## Overview

OutfitVault is a full-stack mobile application for managing a personal wardrobe,
creating outfits, and planning daily looks based on weather and calendar events.

## System Architecture

```
┌─────────────────────┐       ┌─────────────────────┐
│   React Native App  │◄─────►│   Express REST API   │
│   (Expo / Mobile)   │ HTTPS │   (Node.js Backend)  │
└─────────────────────┘       └──────────┬────────────┘
                                         │
                              ┌──────────▼────────────┐
                              │     PostgreSQL DB      │
                              └────────────────────────┘
```

## Tech Stack

### Frontend
- **Framework:** React Native (Expo)
- **Navigation:** React Navigation v6
- **State Management:** Redux Toolkit
- **HTTP Client:** Axios
- **Charts:** Victory Native
- **Camera:** Expo Camera
- **Secure Storage:** Expo SecureStore

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Auth:** JWT + bcrypt
- **Database:** PostgreSQL (pg driver)
- **File Upload:** Multer
- **Docs:** Swagger UI Express

### External APIs
- OpenWeatherMap — weather-based outfit suggestions
- Remove.bg — background removal from garment photos

## Directory Structure

```
OutfitVault/
├── frontend/src/
│   ├── screens/        # App screens (Login, Wardrobe, Outfits…)
│   ├── components/     # Reusable UI components
│   ├── navigation/     # React Navigation config
│   ├── store/          # Redux slices & store config
│   ├── services/       # API service layer (Axios)
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Helpers & constants
├── backend/src/
│   ├── routes/         # Express route definitions
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   ├── middleware/      # Auth, error handling, upload
│   ├── services/       # Business logic layer
│   └── config/         # DB connection, env config
└── docs/               # Project documentation
```
