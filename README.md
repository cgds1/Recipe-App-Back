# Recipe App — Backend API

API REST para la gestión de recetas de cocina. Permite a los usuarios registrarse, crear recetas con ingredientes y pasos, y organizarlas en grupos personalizados.

**Materia:** Moviles 2026C — Profesor Mario González
**Integrantes:** Carlos Díaz · Alberto Martínez
**Despliegue:** Railway (Docker)
**Documentación interactiva:** `/docs` (Swagger)

---

## Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/cgds1/Recipe-App-Back.git
cd Recipe-App-Back

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear archivo .env con las variables indicadas abajo

# 4. Levantar la base de datos
docker-compose up -d

# 5. Ejecutar migraciones
npx prisma migrate deploy

# 6. Iniciar en modo desarrollo
npm run start:dev

# 7. Acceder a la documentación
# → http://localhost:3000/docs
```

**Requisitos:** Docker, Node.js 18+, npm

### Variables de Entorno (`.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5433/recipe_db?schema=public"
JWT_SECRET="clave-secreta-cambiar-en-produccion"
PORT=3000
CORS_ORIGIN=*
```

---

## Stack Tecnológico

| Tecnología           | Rol                                     |
| -------------------- | --------------------------------------- |
| NestJS 11            | Framework backend                       |
| TypeScript 5.7       | Lenguaje                                |
| PostgreSQL 16        | Base de datos                           |
| Prisma 7             | ORM y migraciones                       |
| Passport + JWT       | Autenticación (access + refresh tokens) |
| bcrypt               | Hashing de contraseñas y tokens         |
| Swagger/OpenAPI      | Documentación interactiva en `/docs`    |
| @nestjs/throttler    | Rate limiting                           |
| class-validator      | Validación de DTOs                      |
| Docker (multi-stage) | Contenedorización y despliegue          |

---

## Estructura del Proyecto

```
src/
├── auth/                # Registro, login, refresh token, logout
│   ├── dto/             # RegisterDto, LoginDto, RefreshTokenDto
│   └── strategies/      # JwtStrategy (Passport)
├── users/               # Perfil de usuario (ver, editar, eliminar cuenta)
│   └── dto/             # UpdateUserDto
├── recipes/             # CRUD de recetas con ingredientes y pasos
│   └── dto/             # CreateRecipeDto, UpdateRecipeDto
├── groups/              # CRUD de grupos con asociaciones a recetas
│   └── dto/             # CreateGroupDto, UpdateGroupDto
├── prisma/              # PrismaService global
└── common/
    ├── decorators/      # @Public(), @CurrentUser()
    ├── filters/         # Filtro global de excepciones HTTP
    └── guards/          # JwtAuthGuard (guard global)
```

---

## Modelo de Datos

```
┌──────────┐        ┌──────────┐        ┌──────────┐
│  users   │──1:N──>│ recipes  │<──N:M──│  groups  │
└──────────┘        └──────────┘        └──────────┘
                      │      │
                     1:N    1:N
                      │      │
               ┌──────┘      └──────┐
               v                    v
         ┌────────────┐      ┌─────────┐
         │ ingredients│      │  steps  │
         └────────────┘      └─────────┘
```

**Restricciones clave:**

- `email` — único global
- `title` de receta — único por usuario (`@@unique([userId, title])`)
- `name` de grupo — único por usuario (`@@unique([userId, name])`)

**Reglas de eliminación en cascada:**

- Eliminar **usuario** → elimina todas sus recetas, grupos, ingredientes y pasos
- Eliminar **grupo** → elimina el grupo y todas las recetas asociadas a él
- Eliminar **receta** → elimina sus ingredientes, pasos y asociaciones a grupos
- Desasociar receta de grupo → solo se elimina la asociación, la receta se conserva

---

## Endpoints de la API

### Autenticación (rutas públicas)

| Método | Ruta             | Body                        | Descripción                                |
| ------ | ---------------- | --------------------------- | ------------------------------------------ |
| POST   | `/auth/register` | `{ email, password, name }` | Registro de usuario. Retorna tokens + user |
| POST   | `/auth/login`    | `{ email, password }`       | Login. Retorna access y refresh token      |
| POST   | `/auth/refresh`  | `{ refreshToken }`          | Rota ambos tokens                          |
| POST   | `/auth/logout`   | —                           | Invalida el refresh token (requiere JWT)   |

### Usuarios (requieren JWT)

| Método | Ruta        | Body                | Descripción                              |
| ------ | ----------- | ------------------- | ---------------------------------------- |
| GET    | `/users/me` | —                   | Obtener perfil del usuario autenticado   |
| PATCH  | `/users/me` | `{ name?, email? }` | Editar perfil. 409 si el email ya existe |
| DELETE | `/users/me` | —                   | Eliminar cuenta y todos sus datos        |

### Recetas (requieren JWT)

| Método | Ruta                           | Body               | Descripción                                               |
| ------ | ------------------------------ | ------------------ | --------------------------------------------------------- |
| GET    | `/recipes`                     | —                  | Todas las recetas de todos los usuarios, orden alfabético |
| GET    | `/recipes/mine`                | —                  | Recetas propias del usuario, orden alfabético             |
| GET    | `/recipes/:id`                 | —                  | Detalle con ingredientes, pasos y grupos                  |
| POST   | `/recipes`                     | ver ejemplo        | Crear receta. 409 si ya existe el título                  |
| PATCH  | `/recipes/:id`                 | campos parciales   | Editar receta (solo el autor, 403 si no)                  |
| DELETE | `/recipes/:id`                 | —                  | Eliminar receta (solo el autor). 204                      |
| POST   | `/recipes/:id/groups`          | `{ groupIds: [] }` | Asociar receta a grupos                                   |
| DELETE | `/recipes/:id/groups/:groupId` | —                  | Desasociar de un grupo (receta se conserva)               |

**Ejemplo de creación de receta:**

```json
{
  "title": "Pasta Carbonara",
  "description": "Receta italiana clásica",
  "ingredients": [
    { "name": "Pasta", "quantity": "500", "unit": "g", "order": 0 },
    { "name": "Huevos", "quantity": "3", "order": 1 }
  ],
  "steps": [
    { "description": "Hervir la pasta", "order": 0 },
    { "description": "Mezclar huevos con queso", "order": 1 }
  ],
  "groupIds": ["uuid-del-grupo"]
}
```

### Grupos (requieren JWT)

| Método | Ruta                         | Body                      | Descripción                                                |
| ------ | ---------------------------- | ------------------------- | ---------------------------------------------------------- |
| GET    | `/groups`                    | —                         | Grupos del usuario con conteo de recetas, orden alfabético |
| GET    | `/groups/:id`                | —                         | Detalle del grupo con todas sus recetas                    |
| GET    | `/groups/:id/confirm-delete` | —                         | Preview: recetas que se eliminarán con el grupo            |
| POST   | `/groups`                    | `{ name, description? }`  | Crear grupo. 409 si el nombre ya existe                    |
| PATCH  | `/groups/:id`                | `{ name?, description? }` | Editar grupo                                               |
| DELETE | `/groups/:id`                | —                         | Eliminar grupo y todas sus recetas. 204                    |

**Flujo de eliminación de grupo:**

1. `GET /groups/:id/confirm-delete` → retorna la lista de recetas que se borrarán
2. El frontend muestra un diálogo de confirmación al usuario
3. Si confirma → `DELETE /groups/:id` elimina el grupo y las recetas

**Respuesta de confirm-delete:**

```json
{
  "group": { "id": "...", "name": "Italianas" },
  "recipesToDelete": [
    { "id": "...", "title": "Pasta Carbonara" },
    { "id": "...", "title": "Pizza Margherita" }
  ]
}
```

---

## Seguridad

- **JWT dual**: Access token (15 min) + Refresh token (7 días) con rotación automática
- **Hashing**: Contraseñas con bcrypt (factor 10), refresh token con `bcrypt(sha256(token))`
- **Guard global**: Todas las rutas protegidas por defecto, excepto las marcadas con `@Public()`
- **Autorización**: Verificación de propiedad en operaciones de escritura (403 si no es el dueño)
- **Rate limiting**: 10 peticiones por minuto por IP
- **Validación**: Pipes globales con `whitelist: true` para rechazar campos no declarados
- **CORS**: Configurable por variable de entorno

---

## Códigos de Error

| Código | Significado                                                |
| ------ | ---------------------------------------------------------- |
| 200    | Operación exitosa                                          |
| 201    | Recurso creado                                             |
| 204    | Eliminación exitosa (sin body)                             |
| 400    | Validación fallida (campos faltantes o formato incorrecto) |
| 401    | Token inválido o expirado                                  |
| 403    | Sin permisos (no es dueño del recurso)                     |
| 404    | Recurso no encontrado                                      |
| 409    | Conflicto (email, título o nombre duplicado)               |
| 429    | Rate limit excedido                                        |

---

## Cumplimiento de Requisitos del Enunciado

| #   | Requisito                                                       | Estado   | Implementación                                                                  |
| --- | --------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| 1   | CRUD de Usuario (registro, login, editar perfil, borrar cuenta) | Cumplido | `/auth/*` + `/users/me`                                                         |
| 2   | CRUD de Recetas con ingredientes, pasos e información relevante | Cumplido | `/recipes/*` con creación anidada de ingredientes y pasos                       |
| 3   | Presentar ordenados de forma alfabética                         | Cumplido | `orderBy` en todos los listados a nivel de base de datos                        |
| 4   | No permitir recetas con el mismo nombre/título                  | Cumplido | Constraint `@@unique([userId, title])` + error 409                              |
| 5   | CRUD de Grupos con recetas asociadas                            | Cumplido | `/groups/*` con relación N:M vía tabla pivote                                   |
| 6   | Al borrar grupo, informar que se borrarán las recetas           | Cumplido | `GET /groups/:id/confirm-delete` + `DELETE /groups/:id` elimina grupo y recetas |
| 7   | Al quitar receta de grupo, simplemente queda fuera              | Cumplido | `DELETE /recipes/:id/groups/:groupId` solo elimina la asociación                |
| 8   | Una receta puede estar en múltiples grupos                      | Cumplido | Tabla pivote `recipe_groups` (relación N:M)                                     |
| 9   | Vista de recetas personales y recetas en general                | Cumplido | `/recipes/mine` (propias) + `/recipes` (todas)                                  |

---

## Comandos de Desarrollo

```bash
# Base de datos
docker-compose up -d          # Levantar PostgreSQL
docker-compose down            # Detener
docker-compose down -v         # Detener y borrar datos

# Migraciones
npx prisma migrate deploy      # Aplicar migraciones
npx prisma migrate dev         # Crear nueva migración
npx prisma studio              # GUI de base de datos

# Servidor
npm run start:dev              # Desarrollo con hot-reload
npm run build                  # Compilar para producción
npm run start:migrate:prod     # Producción (migraciones + servidor)

# Tests
npm run test                   # Tests unitarios
npm run test:e2e               # Tests end-to-end
```

---

## Despliegue

El backend está desplegado en **Railway** con un Dockerfile multi-stage (3 etapas):

1. **deps** — Instala dependencias de producción
2. **build** — Compila TypeScript y genera el cliente Prisma
3. **production** — Imagen final liviana con usuario no-root

Al iniciar, ejecuta automáticamente `prisma migrate deploy` antes de levantar el servidor.
