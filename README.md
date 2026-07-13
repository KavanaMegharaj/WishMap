# 📍 WishMap — Location-Aware Wishlist Tracker

A full-stack travel wishlist app that notifies you when you're near a place you've been wanting to visit.

## Live Demo
Frontend: [your-vercel-url]
Backend API: [your-render-url]

## Architecture
Client (React/HTML) → REST API (Spring Boot) → PostgreSQL (Neon)
Layered backend: Controller → Service → Repository

## Folder Structure
\`\`\`
src/main/java/com/kavana/wishmap/
├── entity/        # JPA entities
├── repository/    # Spring Data JPA interfaces
├── service/        # Business logic
├── controller/     # REST endpoints
├── security/        # JWT auth
├── config/          # Security configuration
├── dto/               # Data transfer objects
└── exception/     # Global exception handling
\`\`\`

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Get JWT token |
| POST | /api/wishlist | Add a place |
| GET | /api/wishlist/all | Get all places |
| POST | /api/wishlist/nearby | Find nearby wishlisted places |
| PUT | /api/wishlist/{id}/visited | Mark visited |
| DELETE | /api/wishlist/{id} | Delete a place |
| GET | /api/geocode?query= | Geocode a place name (Bangalore-bounded) |

## JWT Flow
1. User logs in → server validates credentials → issues signed JWT
2. Client stores JWT, sends it in `Authorization: Bearer <token>` header on every request
3. `JwtAuthFilter` intercepts each request, validates the token, populates Spring Security's context
4. Controllers access the authenticated user via `Authentication` parameter

## Database Schema
**users**: id, email, password (hashed), name, created_at
**wishlist_places**: id, user_id (FK), name, notes, latitude, longitude, category, visited, image_url, city, country, google_maps_link, planned_visit_date, priority, created_at

## Tech Stack
Java 17, Spring Boot 3.5, Spring Security (JWT), Spring Data JPA, PostgreSQL, Leaflet.js, OpenStreetMap Nominatim (geocoding), Swagger/OpenAPI

## Deployment
- Backend: Render (Spring Boot)
- Database: Neon (PostgreSQL)
- Frontend: Vercel (static)

## Future Enhancements
- Native mobile app with background location services and push notifications
- Image upload for wishlist places
- Social sharing of wishlists