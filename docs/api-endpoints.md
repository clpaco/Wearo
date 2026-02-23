# OutfitVault — Endpoints de la API

## URL Base

```
http://localhost:3000/api/v1
```

## Autenticación

| Método | Endpoint              | Descripción                   |
|--------|-----------------------|-------------------------------|
| POST   | `/auth/register`      | Registrar un nuevo usuario    |
| POST   | `/auth/login`         | Iniciar sesión y recibir JWT  |
| POST   | `/auth/refresh`       | Refrescar token de acceso     |
| POST   | `/auth/logout`        | Invalidar token               |

## Armario (Prendas)

| Método | Endpoint              | Descripción                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/garments`           | Listar todas las prendas del usuario |
| GET    | `/garments/:id`       | Obtener detalles de una prenda       |
| POST   | `/garments`           | Añadir nueva prenda (con imagen)     |
| PUT    | `/garments/:id`       | Actualizar información de prenda     |
| DELETE | `/garments/:id`       | Eliminar una prenda                  |

## Outfits

| Método | Endpoint              | Descripción                    |
|--------|-----------------------|--------------------------------|
| GET    | `/outfits`            | Listar todos los outfits       |
| GET    | `/outfits/:id`        | Obtener detalles de un outfit  |
| POST   | `/outfits`            | Crear un nuevo outfit          |
| PUT    | `/outfits/:id`        | Actualizar un outfit           |
| DELETE | `/outfits/:id`        | Eliminar un outfit             |

## Calendario

| Método | Endpoint              | Descripción                                  |
|--------|-----------------------|----------------------------------------------|
| GET    | `/calendar`           | Obtener planes de outfit para rango de fechas|
| POST   | `/calendar`           | Asignar outfit a una fecha                   |
| PUT    | `/calendar/:id`       | Actualizar una entrada del calendario        |
| DELETE | `/calendar/:id`       | Eliminar una entrada del calendario          |

## Estadísticas

| Método | Endpoint              | Descripción                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/stats/usage`        | Prendas más/menos usadas             |
| GET    | `/stats/categories`   | Cantidad de prendas por categoría    |
| GET    | `/stats/colors`       | Distribución por colores             |

## Clima

| Método | Endpoint              | Descripción                              |
|--------|-----------------------|------------------------------------------|
| GET    | `/weather?lat=&lon=`  | Obtener clima actual para una ubicación  |

## Social

| Método | Endpoint              | Descripción                      |
|--------|-----------------------|----------------------------------|
| GET    | `/social/feed`        | Feed público de outfits          |
| POST   | `/social/:id/like`    | Dar like a un outfit             |
| DELETE | `/social/:id/like`    | Quitar like de un outfit         |
