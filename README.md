# Recipe Management App

> Full-stack mobile application for creating, organizing, and discovering culinary recipes with authentication and group organization.

## Quick Start

```bash
# 1. Start PostgreSQL with Docker (REQUIRED - Phase 1)
docker-compose up -d

# 2. Install dependencies and setup database (Phase 2)
npm install
npx prisma generate
npx prisma migrate dev

# 3. Start backend API (Phase 3-5)
npm run start:dev

# 4. Access API documentation
# → http://localhost:3000/api
```

**Prerequisites:**
- Docker & Docker Compose installed
- Node.js 18+ and npm
- Expo CLI (for mobile development in Phase 6+)

---

## Overview

Cross-platform mobile application built with **React Native (Expo)** and a **NestJS REST API** backend, allowing users to manage personal recipe collections, organize them into custom groups, and explore recipes shared by other users.

### Key Features

- **User Authentication** — Secure registration and login with JWT tokens and refresh token rotation
- **Personal Recipe Management** — Create, edit, and delete recipes with ingredients and step-by-step instructions
- **Recipe Discovery** — Browse recipes from all users in alphabetical order
- **Group Organization** — Organize recipes into multiple custom groups
- **Multi-group Associations** — Single recipes can belong to multiple groups simultaneously
- **Smart Deletion** — Group deletion removes associated recipes with confirmation dialog

---

## Project Phases

This project follows a structured development approach across multiple phases:

### Phase 1: Environment Setup & Database
- **Docker setup** for PostgreSQL database (port 5433)
- Database configuration and connection testing
- Prisma ORM setup with initial schema
- Environment variables configuration (`.env` files)

**Deliverables:** Working PostgreSQL container, Prisma client generated

### Phase 2: Backend API Foundation (NestJS)
- NestJS project initialization with TypeScript
- Project structure setup (modules, controllers, services)
- Prisma service integration
- Global exception handling and validation pipes
- Swagger/OpenAPI documentation setup

**Deliverables:** REST API server running on port 3000, `/api` documentation accessible

### Phase 3: User Authentication
- User model and registration endpoint (`POST /auth/register`)
- Login with JWT access + refresh tokens (`POST /auth/login`)
- Password validation and bcrypt hashing
- JWT strategy with Passport.js
- Token refresh endpoint (`POST /auth/refresh`)
- Logout functionality with token invalidation
- Rate limiting on auth endpoints (10 req/min)

**Deliverables:** Complete authentication flow, protected endpoints working

### Phase 4: Recipe Management (CRUD)
- Recipe model with ingredients and steps (nested DTOs)
- Recipe CRUD endpoints with authorization checks
- Alphabetical sorting implementation
- Unique title validation per user (`@@unique([userId, title])`)
- Recipe discovery endpoint (all users' recipes)
- Author-only edit/delete validation (403 forbidden)

**Deliverables:** Full recipe CRUD with nested data, alphabetical listing

### Phase 5: Group Management & Relationships
- Group model with many-to-many relationship to recipes
- Group CRUD endpoints
- Recipe-Group association endpoints (`POST /recipes/:id/groups`)
- Recipe removal from group (unlink only)
- **Critical:** Group deletion with cascade recipe deletion
- Group listing with recipe counts

**Deliverables:** Group system working, cascade deletion tested

### Phase 6: Mobile Frontend (React Native + Expo)
- Expo project initialization with TypeScript
- React Navigation setup (stack, tabs, drawer)
- Zustand stores for authentication state
- Axios client with JWT interceptor
- Token storage via `expo-secure-store`
- UI components library (forms, buttons, cards)

**Deliverables:** Mobile app running on simulator/device, API connection established

### Phase 7: Frontend Features Implementation
- Authentication screens (login, register)
- Recipe screens (list, detail, create, edit)
- Group screens (list, detail, create, edit)
- Multi-group selection UI for recipes
- Confirmation dialogs for destructive actions
- Error handling and loading states

**Deliverables:** Complete mobile app with all features functional

### Phase 8: Testing & Documentation
- Backend unit tests (services)
- E2E tests for critical flows
- Mobile UI testing
- API documentation validation
- README and deployment instructions

**Deliverables:** Test suite passing, documentation complete

---

## Business Requirements

### 1. Recipe Uniqueness Per User

- Each user can create recipes with **unique titles within their own collection**
- Different users **can** have recipes with the same title
- Attempting to create a duplicate title returns a `409 Conflict` error
- Implemented via compound unique constraint: `@@unique([userId, title])`

### 2. Alphabetical Sorting

- All recipe listings display in **alphabetical order by title**
- Applies to both "My Recipes" (personal) and "Explore" (all users) views
- Sorting handled at database query level, not in-memory

### 3. Group Deletion Behavior

**CRITICAL BUSINESS RULE:**

When a group is deleted, **all recipes associated with that group are permanently deleted from the database**, even if they belong to other groups.

**Example Scenario:**
```
Recipe "Chocolate Cake" belongs to:
  - Group "Desserts"
  - Group "Birthday Recipes"

User deletes "Desserts" group:
  → Recipe "Chocolate Cake" is PERMANENTLY DELETED
  → It also disappears from "Birthday Recipes"
  → Database record is removed (hard delete)
```

**Implementation Details:**
- Frontend **must** show confirmation dialog before deletion:
  ```
  "Deleting this group will permanently delete X recipes.
   This includes recipes that belong to other groups.
   This action cannot be undone. Continue?"
  ```
- Backend returns count of deleted recipes: `{ deletedRecipes: number }`
- Database uses cascade deletion: `onDelete: Cascade` on `RecipeGroup.group` relation

**Rationale:** Groups represent "ownership" of recipes. When the group is deleted, the recipe lifecycle ends, regardless of other associations.

### 4. Recipe Removal from Group (Non-Destructive)

**Contrast with group deletion:**

- Removing a recipe from a group **only removes the association** (soft unlink)
- The recipe itself continues to exist and remains in other groups
- Endpoint: `DELETE /recipes/:id/groups/:groupId`
- No confirmation dialog needed (non-destructive operation)

### 5. Multi-group Support

- A single recipe can be associated with **multiple groups**
- Managed via many-to-many relationship with `RecipeGroup` pivot table
- Group selector in UI allows selecting multiple groups when creating/editing recipes

### 6. Authorization Rules

- Users can only edit/delete **their own recipes**
- Users can only manage **their own groups**
- All users can view all recipes (discovery feature)
- Attempting to modify another user's resource returns `403 Forbidden`

---

## Technical Architecture

### System Overview

```
┌─────────────────┐          ┌─────────────────┐          ┌──────────────┐
│                 │          │                 │          │              │
│  React Native   │  HTTP    │   NestJS API    │   SQL    │  PostgreSQL  │
│  (Expo)         │ ◄──────► │   (REST)        │ ◄──────► │              │
│                 │   JWT    │                 │          │              │
└─────────────────┘          └─────────────────┘          └──────────────┘
```

### Communication Protocol

- **REST API** with JSON payloads
- Standard HTTP verbs (GET, POST, PATCH, DELETE)
- Semantic HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 500)
- JWT Bearer token authentication in `Authorization` header

### Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│          │  1. POST /auth/register             │          │
│          │     { email, password, name }       │          │
│          ├────────────────────────────────────►│          │
│          │                                     │          │
│          │  2. { accessToken, refreshToken }   │  NestJS  │
│  Mobile  │◄────────────────────────────────────┤  API     │
│  App     │                                     │          │
│          │  3. Subsequent requests             │          │
│          │     Header: Bearer <accessToken>    │          │
│          ├────────────────────────────────────►│          │
│          │                                     │          │
│          │  4. Token expired (401)             │          │
│          │◄────────────────────────────────────┤          │
│          │                                     │          │
│          │  5. POST /auth/refresh              │          │
│          │     { refreshToken }                │          │
│          ├────────────────────────────────────►│          │
│          │                                     │          │
│          │  6. New tokens                      │          │
│          │◄────────────────────────────────────┤          │
└──────────┘                                    └──────────┘
```

**Token Configuration:**

- **Access Token:** 15 minutes expiration
- **Refresh Token:** 7 days expiration, stored hashed in database
- Token rotation on refresh (old refresh token invalidated)
- Mobile storage via `expo-secure-store` for security

---

## Technology Stack

### Mobile Frontend

| Technology           | Version | Purpose                           |
| -------------------- | ------- | --------------------------------- |
| **React Native**     | 0.76+   | Cross-platform mobile framework   |
| **Expo**             | SDK 52+ | Managed workflow, EAS builds      |
| **TypeScript**       | 5.x     | Type safety                       |
| **React Navigation** | 7.x     | Stack, tabs, drawer navigation    |
| **Zustand**          | 5.x     | Lightweight global state          |
| **React Query**      | 5.x     | Server state management, caching  |
| **React Hook Form**  | 7.x     | Performant forms                  |
| **Zod**              | 3.x     | Schema validation                 |
| **Axios**            | 1.x     | HTTP client with JWT interceptors |

### Backend API

| Technology            | Version | Purpose                                |
| --------------------- | ------- | -------------------------------------- |
| **NestJS**            | 11.x    | Node.js framework with DI, decorators  |
| **TypeScript**        | 5.x     | Type safety                            |
| **Prisma ORM**        | 6.x     | Type-safe database access              |
| **PostgreSQL**        | 16+     | Relational database                    |
| **Passport.js**       | —       | JWT authentication                     |
| **bcrypt**            | 5.x     | Password hashing                       |
| **class-validator**   | 0.14+   | DTO validation                         |
| **@nestjs/swagger**   | 8.x     | API documentation (OpenAPI)            |
| **@nestjs/throttler** | —       | Rate limiting (brute-force protection) |

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐
│    User     │
│─────────────│
│ id          │──┐
│ email       │  │
│ password    │  │ 1:N
│ name        │  │
│ refreshToken│  │
└─────────────┘  │
                 │
                 ├────────────┐
                 │            │
                 ▼            ▼
         ┌─────────────┐  ┌─────────────┐
         │   Recipe    │  │    Group    │
         │─────────────│  │─────────────│
         │ id          │  │ id          │
         │ title       │  │ name        │
         │ description │  │ description │
         │ userId      │  │ userId      │
         └─────────────┘  └─────────────┘
                 │               │
                 │    M:N        │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  RecipeGroup  │
                 │───────────────│
                 │ recipeId (FK) │
                 │ groupId (FK)  │
                 │ addedAt       │
                 └───────────────┘
                         ▲
                         │ 1:N
         ┌───────────────┴──────────────┐
         │                              │
         ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  Ingredient  │              │     Step     │
│──────────────│              │──────────────│
│ id           │              │ id           │
│ name         │              │ description  │
│ quantity     │              │ order        │
│ unit         │              │ recipeId     │
│ order        │              └──────────────┘
│ recipeId     │
└──────────────┘
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  password     String   // bcrypt hashed
  name         String
  refreshToken String?  // bcrypt hashed
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  recipes Recipe[]
  groups  Group[]

  @@map("users")
}

model Recipe {
  id          String   @id @default(uuid())
  title       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  ingredients Ingredient[]
  steps       Step[]
  groups      RecipeGroup[]

  @@unique([userId, title]) // Title unique per user, not globally
  @@index([userId])
  @@index([title])
  @@map("recipes")
}

model Ingredient {
  id       String  @id @default(uuid())
  name     String
  quantity String
  unit     String?
  order    Int     @default(0)

  recipeId String
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("ingredients")
}

model Step {
  id          String @id @default(uuid())
  description String
  order       Int

  recipeId String
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("steps")
}

model Group {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  recipes RecipeGroup[]

  @@unique([userId, name]) // Group name unique per user
  @@map("groups")
}

model RecipeGroup {
  recipeId String
  groupId  String
  addedAt  DateTime @default(now())

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  group  Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  // ⚠️ When group is deleted → all RecipeGroup entries deleted → triggers recipe deletion

  @@id([recipeId, groupId])
  @@map("recipe_groups")
}
```

### Key Constraints

- **User.email** — Unique globally
- **Recipe.title** — Unique per user (compound: `[userId, title]`)
- **Group.name** — Unique per user (compound: `[userId, name]`)
- **Cascade Deletion Hierarchy:**
  - Deleting a **User** → cascades to all recipes, groups, ingredients, steps
  - Deleting a **Group** → cascades to RecipeGroup entries → **triggers recipe deletion** (even if recipe is in other groups)
  - Deleting a **Recipe** → cascades to ingredients, steps, RecipeGroup entries
- **Pivot Table** — RecipeGroup manages many-to-many relationship with cascade behavior

---

## API Endpoints

### Authentication

| Method | Endpoint         | Description          | Auth | Request                     | Response                                  |
| ------ | ---------------- | -------------------- | ---- | --------------------------- | ----------------------------------------- |
| POST   | `/auth/register` | Register new user    | No   | `{ email, password, name }` | 201 `{ accessToken, refreshToken, user }` |
| POST   | `/auth/login`    | User login           | No   | `{ email, password }`       | 200 `{ accessToken, refreshToken, user }` |
| POST   | `/auth/refresh`  | Refresh access token | No   | `{ refreshToken }`          | 200 `{ accessToken, refreshToken }`       |
| POST   | `/auth/logout`   | User logout          | Yes  | —                           | 204                                       |

**Password Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### Users

| Method | Endpoint    | Description                | Auth | Request             | Response                             |
| ------ | ----------- | -------------------------- | ---- | ------------------- | ------------------------------------ |
| GET    | `/users/me` | Get current user profile   | Yes  | —                   | 200 `{ id, email, name, createdAt }` |
| PATCH  | `/users/me` | Update profile             | Yes  | `{ name?, email? }` | 200 `{ user }`                       |
| DELETE | `/users/me` | Delete account permanently | Yes  | —                   | 204                                  |

### Recipes

| Method | Endpoint                       | Description                            | Auth | Request                                                        | Response                         |
| ------ | ------------------------------ | -------------------------------------- | ---- | -------------------------------------------------------------- | -------------------------------- |
| GET    | `/recipes`                     | All recipes (alphabetically)           | Yes  | —                                                              | 200 `[{ id, title, user, ... }]` |
| GET    | `/recipes/mine`                | My recipes (alphabetically)            | Yes  | —                                                              | 200 `[{ id, title, ... }]`       |
| GET    | `/recipes/:id`                 | Recipe detail with ingredients & steps | Yes  | —                                                              | 200 `{ recipe }`                 |
| POST   | `/recipes`                     | Create recipe                          | Yes  | `{ title, description?, ingredients[], steps[], groupIds?[] }` | 201 `{ recipe }`                 |
| PATCH  | `/recipes/:id`                 | Update recipe (author only)            | Yes  | `{ title?, description?, ingredients?[], steps?[] }`           | 200 `{ recipe }`                 |
| DELETE | `/recipes/:id`                 | Delete recipe (author only)            | Yes  | —                                                              | 204                              |
| POST   | `/recipes/:id/groups`          | Associate recipe to groups             | Yes  | `{ groupIds[] }`                                               | 200 `{ recipe }`                 |
| DELETE | `/recipes/:id/groups/:groupId` | Remove from group (unlink only)        | Yes  | —                                                              | 204                              |

**Recipe Creation Example:**

```json
{
  "title": "Chocolate Cake",
  "description": "Delicious homemade cake",
  "ingredients": [
    { "name": "Flour", "quantity": "500", "unit": "grams", "order": 1 },
    { "name": "Sugar", "quantity": "300", "unit": "grams", "order": 2 }
  ],
  "steps": [
    { "description": "Mix dry ingredients", "order": 1 },
    { "description": "Add wet ingredients", "order": 2 }
  ],
  "groupIds": ["uuid-group-1", "uuid-group-2"]
}
```

### Groups

| Method | Endpoint      | Description                  | Auth | Request                   | Response                          |
| ------ | ------------- | ---------------------------- | ---- | ------------------------- | --------------------------------- |
| GET    | `/groups`     | My groups with recipe counts | Yes  | —                         | 200 `[{ id, name, recipeCount }]` |
| GET    | `/groups/:id` | Group detail with recipes    | Yes  | —                         | 200 `{ group, recipes[] }`        |
| POST   | `/groups`     | Create group                 | Yes  | `{ name, description? }`  | 201 `{ group }`                   |
| PATCH  | `/groups/:id` | Update group                 | Yes  | `{ name?, description? }` | 200 `{ group }`                   |
| DELETE | `/groups/:id` | Delete group AND all associated recipes (cascade) | Yes  | —                         | 200 `{ deletedRecipes: number }`  |

**Group Deletion Response Example:**

```json
{
  "deletedRecipes": 5,
  "message": "Group deleted successfully. 5 recipes were permanently deleted."
}
```

**Warning:** This endpoint permanently deletes all recipes associated with the group, even if they belong to other groups. Frontend must show confirmation dialog before calling this endpoint.

---

## HTTP Status Codes

| Code    | Meaning               | Usage                                                         |
| ------- | --------------------- | ------------------------------------------------------------- |
| **200** | OK                    | Successful GET, PATCH, or special DELETE (with body)          |
| **201** | Created               | Resource successfully created                                 |
| **204** | No Content            | Successful deletion without response body                     |
| **400** | Bad Request           | Validation failed (missing fields, invalid format)            |
| **401** | Unauthorized          | Missing, invalid, or expired access token                     |
| **403** | Forbidden             | Valid token but insufficient permissions (not resource owner) |
| **404** | Not Found             | Resource does not exist                                       |
| **409** | Conflict              | Unique constraint violation (duplicate title/email)           |
| **429** | Too Many Requests     | Rate limit exceeded (10 requests/minute on auth endpoints)    |
| **500** | Internal Server Error | Unexpected server error                                       |

---

## Security Features

### Authentication & Authorization

- **JWT-based authentication** with access + refresh tokens
- **Bcrypt password hashing** (cost factor 10)
- **Refresh token rotation** on every refresh request
- **Token storage:** Hashed in database, secure storage on mobile
- **Rate limiting:** 10 requests/minute on login/register endpoints

### Data Protection

- **Passwords never returned** in API responses
- **User-scoped resources** (recipes/groups filtered by userId)
- **Authorization checks** on all mutation endpoints
- **Input validation** via class-validator (backend) and Zod (frontend)
- **SQL injection protection** via Prisma parameterized queries

### Frontend Security

```typescript
// Secure token storage on mobile
import * as SecureStore from 'expo-secure-store';

export const authStorage = {
  async saveToken(token: string) {
    await SecureStore.setItemAsync('auth_token', token);
  },
  async getToken() {
    return await SecureStore.getItemAsync('auth_token');
  },
  async clearToken() {
    await SecureStore.deleteItemAsync('auth_token');
  },
};
```

---

## Project Structure

### Backend (NestJS)

```
recipe-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── common/
│   │   ├── decorators/         # @CurrentUser(), @Public()
│   │   ├── filters/            # Global exception filter
│   │   └── guards/             # JwtAuthGuard
│   ├── auth/
│   │   ├── dto/                # RegisterDto, LoginDto, RefreshTokenDto
│   │   ├── strategies/         # JwtStrategy
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── dto/                # UpdateUserDto
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── recipes/
│   │   ├── dto/                # CreateRecipeDto, UpdateRecipeDto
│   │   ├── recipes.controller.ts
│   │   ├── recipes.service.ts
│   │   └── recipes.module.ts
│   ├── groups/
│   │   ├── dto/                # CreateGroupDto, UpdateGroupDto
│   │   ├── groups.controller.ts
│   │   ├── groups.service.ts
│   │   └── groups.module.ts
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts
│   └── main.ts
└── .env
```

### Mobile App (React Native + Expo)

```
recipe-app/
├── src/
│   ├── app/                    # Expo Router (file-based routing)
│   │   ├── (auth)/             # Auth screens (login, register)
│   │   ├── (tabs)/             # Tab navigation (home, explore, groups, profile)
│   │   ├── recipe/             # Recipe screens (detail, create, edit)
│   │   └── group/              # Group screens (detail, create, edit)
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── recipes/            # Recipe-specific components
│   │   └── groups/             # Group-specific components
│   ├── hooks/                  # Custom hooks (useAuth, useRecipes)
│   ├── services/               # API services (Axios instances)
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Helper functions
├── assets/
└── app.json
```

---

## API Documentation

The API is fully documented with **Swagger/OpenAPI**. When the backend server is running:

- **Swagger UI:** http://localhost:3000/api
- **JSON Schema:** http://localhost:3000/api-json

All endpoints, DTOs, and response schemas are documented with:

- `@ApiTags` for grouping
- `@ApiOperation` for endpoint descriptions
- `@ApiResponse` for status codes and response examples
- `@ApiProperty` for DTO field documentation
- `@ApiBearerAuth` for protected endpoints

---

## Development Commands

### Prerequisites

**ALWAYS start Docker first:**
```bash
# Start PostgreSQL container (run this BEFORE npm commands)
docker-compose up -d

# Verify database is running
docker ps
```

### Backend

```bash
# Start development server (after Docker is running)
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test

# Prisma migrations
npx prisma migrate dev --name migration_name
npx prisma studio                 # Database GUI
npx prisma migrate status         # Check migration status
```

### Database

```bash
# Generate Prisma Client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset

# View migration SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

---

## Database Setup (Docker)

**IMPORTANT:** This project **requires Docker** for the PostgreSQL database. This is set up in **Phase 1** and must be running before starting the NestJS backend.

The database is mapped to port **5433** (instead of default 5432) to avoid conflicts with local PostgreSQL installations.

### Docker Compose Configuration

**`docker-compose.yml`:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: recipe-db
    restart: always
    ports:
      - '5433:5432' # Mapped to 5433 to avoid conflicts
    environment:
      POSTGRES_USER: usuario
      POSTGRES_PASSWORD: password
      POSTGRES_DB: recipe_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Starting the Database

```bash
# Start PostgreSQL container
docker-compose up -d

# View logs
docker-compose logs -f postgres

# Stop container
docker-compose down

# Stop and remove data (reset database)
docker-compose down -v
```

**Connection String:**

```
postgresql://usuario:password@localhost:5433/recipe_db?schema=public
```

---

## Environment Variables

**Backend (`.env`):**

```env
DATABASE_URL="postgresql://usuario:password@localhost:5433/recipe_db?schema=public"
JWT_SECRET="your-super-secret-key-change-in-production"
```

**Mobile (`.env`):**

```env
EXPO_PUBLIC_API_URL="http://localhost:3000"
```

---

## License

This project is part of a mobile development course assignment.
