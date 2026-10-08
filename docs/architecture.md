# Life OS — Backend Architecture

## 1. Backend Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- express-validator
- Swagger / OpenAPI

## 2. Backend Architecture

```text
Client
  │
  ▼
Route
  │
  ▼
Middleware
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
Model
  │
  ▼
MongoDB
```

### Responsibilities

**Route**
- Defines API endpoints.
- Maps requests to controllers.

**Middleware**
- Authentication
- Validation
- Error handling

**Controller**
- Receives HTTP request.
- Calls the corresponding service.
- Returns the standardized API response.
- Does not contain business logic.

**Service**
- Contains all business logic.
- Validates ownership and relationships.
- Performs calculations and database operations through models.

**Model**
- Defines MongoDB document schemas through Mongoose.

## 3. Core Modules

```text
Auth
Task
Goal
Calendar Event
Dashboard
```

## 4. Extension Modules

```text
AI Task Priority
Goal Deadline Impact
Analytics
Habit Tracking
AI Daily Planner
```

Extension modules must be independent from the Core modules.

## 5. API Design Principles

### 5.1 Backward Compatibility

New features must introduce new endpoints instead of modifying existing Core APIs unnecessarily.

Example:

```text
POST /api/ai/prioritize
```

instead of changing:

```text
POST /api/tasks
```

### 5.2 Service Isolation

Each feature has its own service.

Example:

```text
taskService.js
goalService.js
eventService.js
dashboardService.js
aiService.js
```

### 5.3 AI Data Flow

```text
AI
 ↓
Suggestion / JSON
 ↓
Backend Validation
 ↓
Response / Database Update
```

AI does not directly write to MongoDB.

### 5.4 User Data Isolation

All protected resources must be scoped by:

```text
userId
```

A user must never be able to access another user's resources.

## 6. API Response Convention

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "field": "title"
  }
}
```

## 7. Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---:|---|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Authentication failed |
| NOT_FOUND | 404 | Resource does not exist or belongs to another user |
| CONFLICT | 409 | Resource conflict |
| SERVER_ERROR | 500 | Unexpected server error |

## 8. Security Rules

- Passwords are stored only as bcrypt hashes.
- JWT is used for authenticated requests.
- JWT secret is stored in environment variables.
- Protected API routes require `Authorization: Bearer <token>`.
- Database queries must always be scoped by `userId`.

## 9. Core Development Rule

Every backend feature follows:

```text
API
 ↓
Controller
 ↓
Service
 ↓
Model
 ↓
Test
 ↓
OpenAPI Update
 ↓
Deploy
```