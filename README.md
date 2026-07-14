# 📍 WishMap — Location-Aware Travel Wishlist

A full-stack app for saving places you want to visit and getting notified the moment you're actually near one.

**Live demo:** https://wishmap.onrender.com/

**Repo:** https://github.com/KavanaMegharaj/WishMap

## The problem it solves
You see a cafe on a reel, think "I want to go there," and forget completely — until you randomly walk past it weeks later with no memory of why it mattered. WishMap fixes that: save it once, get notified when you're close enough to actually go.

## Core feature: "What's nearby?"
Tap the floating button, allow location access, and the backend runs a Haversine distance calculation against every place on your wishlist — returning matches within a configurable radius, sorted closest-first, with a real distance shown for each ("Cubbon Park is 480m away").

## Architecture
Browser → Spring Security Filter Chain (JWT) → Controller → Service → Repository → PostgreSQL

Each layer has one responsibility only — controllers handle HTTP, services hold business logic, repositories handle persistence. This keeps the code testable and means swapping any one layer (e.g. the database) wouldn't require touching business logic.

## Features
- JWT authentication (signup/login, BCrypt-hashed passwords, stateless sessions)
- Contextual auth — browse and explore before logging in; login is only prompted the moment you try to save a place, and the app finishes that action automatically once you're in
- Live geocoding via OpenStreetMap Nominatim — type a place name, get coordinates automatically
- Interactive Leaflet map with a live, continuously-updating "you are here" location dot
- Nearby check — the core feature, backed by a real Haversine algorithm on the server
- Category system with a custom "Other" option
- Search, filters (All / Not Visited / Visited / Nearby), and live stats
- Global exception handling — clean JSON errors instead of leaked stack traces
- Swagger/OpenAPI documentation

## Folder structure

```
src/main/java/com/kavana/wishmap/
├── entity/        # JPA entities (User, WishlistPlace)
├── repository/    # Spring Data JPA interfaces
├── service/       # Business logic (GeoService, WishlistService, AuthService, GeocodingService)
├── controller/    # REST endpoints
├── security/      # JWT generation/validation, filter, UserDetailsService
├── config/        # Spring Security configuration
├── dto/           # Request/response data transfer objects
└── exception/     # Global exception handling
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/signup | No | Create account, returns JWT |
| POST | /api/auth/login | No | Log in, returns JWT |
| GET | /api/geocode?query= | No | Geocode a place name (Bangalore-bounded) |
| POST | /api/wishlist | Yes | Add a place |
| GET | /api/wishlist/all | Yes | Get all of the current user's places |
| POST | /api/wishlist/nearby | Yes | Core feature — nearby places with distance |
| PUT | /api/wishlist/{id}/visited | Yes | Mark a place visited |
| DELETE | /api/wishlist/{id} | Yes | Delete a place |

## JWT flow
1. User logs in → server validates credentials → issues a signed JWT
2. Client sends it as `Authorization: Bearer <token>` on every request
3. `JwtAuthFilter` validates the token before any controller runs, populating Spring Security's `SecurityContextHolder`
4. Controllers access the authenticated user via the injected `Authentication` object

## Database schema

**users**
id, email (unique), password (BCrypt hash), name, created_at

**wishlist_places**
id, user_id (FK), name, notes, latitude, longitude, category, visited, image_url, city, country, google_maps_link, planned_visit_date, priority, created_at

## Tech stack
Java 17 · Spring Boot 3.5 · Spring Security (JWT) · Spring Data JPA · PostgreSQL (Neon) · Leaflet.js · OpenStreetMap Nominatim · Swagger/OpenAPI · HTML/CSS/vanilla JavaScript

## Deployment
- Backend: Render (Spring Boot JAR)
- Database: Neon (PostgreSQL), credentials injected via environment variables — never committed
- Frontend: served directly from Spring Boot's static resources

## Future enhancements
- Native mobile app with background location services and real push notifications
- Optimistic locking for concurrent updates
- Automated tests
- Pagination on wishlist endpoints

## Author
Built by C M Kavana — [GitHub](https://github.com/KavanaMegharaj) · [LinkedIn](https://www.linkedin.com/in/c-m-kavana-891340372/) · cmkavana03@gmail.com
