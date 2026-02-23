# OutfitVault — API Endpoints

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

| Method | Endpoint              | Description            |
|--------|-----------------------|------------------------|
| POST   | `/auth/register`      | Register a new user    |
| POST   | `/auth/login`         | Login & receive JWT    |
| POST   | `/auth/refresh`       | Refresh access token   |
| POST   | `/auth/logout`        | Invalidate token       |

## Wardrobe (Garments)

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| GET    | `/garments`           | List all user garments          |
| GET    | `/garments/:id`       | Get garment details             |
| POST   | `/garments`           | Add a new garment (with image)  |
| PUT    | `/garments/:id`       | Update garment info             |
| DELETE | `/garments/:id`       | Delete a garment                |

## Outfits

| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| GET    | `/outfits`            | List all user outfits     |
| GET    | `/outfits/:id`        | Get outfit details        |
| POST   | `/outfits`            | Create a new outfit       |
| PUT    | `/outfits/:id`        | Update an outfit          |
| DELETE | `/outfits/:id`        | Delete an outfit          |

## Calendar

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/calendar`           | Get outfit plans for a date range    |
| POST   | `/calendar`           | Assign outfit to a date              |
| PUT    | `/calendar/:id`       | Update a calendar entry              |
| DELETE | `/calendar/:id`       | Remove a calendar entry              |

## Stats

| Method | Endpoint              | Description                      |
|--------|-----------------------|----------------------------------|
| GET    | `/stats/usage`        | Most/least worn garments         |
| GET    | `/stats/categories`   | Garment count by category        |
| GET    | `/stats/colors`       | Color distribution               |

## Weather

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/weather?lat=&lon=`  | Get current weather for location   |

## Social

| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/social/feed`        | Public outfit feed           |
| POST   | `/social/:id/like`    | Like an outfit               |
| DELETE | `/social/:id/like`    | Unlike an outfit             |
