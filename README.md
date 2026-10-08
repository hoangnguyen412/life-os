# AI Life OS

> **Personal Life Management & Productivity Platform**

AI Life OS is a web application designed to centralize personal tasks, goals, and schedules in one place. The system provides a structured foundation for managing daily activities and can be extended with AI-powered prioritization, productivity analytics, and intelligent planning.

The project is designed around a modular architecture so that advanced features can be introduced incrementally without changing the core system.

---

## Overview

Traditional productivity applications often separate tasks, goals, calendars, and progress tracking into isolated tools.

**AI Life OS** aims to provide a unified workspace where users can:

- Manage tasks and deadlines
- Track personal goals and progress
- Manage calendar events
- Monitor productivity through a dashboard
- Extend the system with AI-assisted recommendations and planning

The core system focuses on reliable task, goal, and calendar management. Advanced AI and productivity features are developed as independent modules.

---

## Core Features

### Task Management
- Create, view, update, and delete tasks
- Track task status: `todo`, `in_progress`, `done`
- Set priority and optional due dates
- Associate tasks with goals
- Detect overdue tasks

### Goal & Progress Tracking
- Create and manage personal goals
- Support two progress modes:
  - **Task-based:** progress is calculated from completed tasks
  - **Manual:** progress is explicitly updated by the user
- Automatically update goal status based on progress

### Calendar
- Create, view, update, and delete calendar events
- Store event start and end times
- Validate event time ranges
- Keep calendar events independent from tasks in the core system

### Dashboard
The dashboard provides a high-level overview of the user's current productivity, including:

- Total tasks
- Completed tasks
- Overdue tasks
- Average progress of active goals

---

## Planned Extensions

Advanced features are intentionally separated from the core system and may be added incrementally.

### AI Task Priority
AI analyzes incomplete tasks and returns an ordered priority list with short explanations. The backend validates the AI result before presenting it to the user.

### Goal Deadline Impact
A lightweight What-If feature that evaluates the impact of changing a goal's deadline without modifying the actual goal data.

### Productivity Analytics
Additional charts and statistics such as:

- Tasks completed by week
- Overdue rate by goal
- Progress trends

### Habit Tracking
Independent habit management with basic streak tracking.

### AI Daily Planner
An advanced feature that can generate a daily schedule using tasks and calendar events. This is the highest-complexity optional feature and will only be implemented if the core system is stable.

> Only 1–2 extension features are targeted for the final implementation to keep the system stable and maintainable.

---

## Architecture

The project uses a modular client-server architecture:

```text
┌──────────────────────────┐
│      React Frontend      │
│  Pages / Components / UI │
└────────────┬─────────────┘
             │ REST API
             ▼
┌──────────────────────────┐
│     Express Backend      │
│ Routes → Controllers     │
│          ↓               │
│       Services           │
│          ↓               │
│       Mongoose           │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      MongoDB Atlas       │
└──────────────────────────┘
```

Business logic is isolated inside the backend service layer so that new features can be added without placing feature-specific logic inside existing core modules.

---

## Project Structure

```text
life-os/
├── client/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   └── utils/
│
├── server/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── config/
│   └── seed/
│
└── docs/
    ├── openapi.yaml
    ├── architecture.md
    └── database.md
```

---

## Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts

### Backend
- Node.js
- Express
- Mongoose
- Express Validator

### Database
- MongoDB Atlas

### Authentication & Security
- JWT authentication
- bcrypt password hashing
- Environment variables for secrets
- Authorization via Bearer Token

### Documentation & Deployment
- OpenAPI / Swagger
- Vercel
- Render
- MongoDB Atlas

---

## API

The backend follows a RESTful API architecture.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Tasks

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Goals

```text
GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PUT    /api/goals/:id
PATCH  /api/goals/:id/progress
DELETE /api/goals/:id
```

### Calendar Events

```text
GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
```

### Dashboard

```text
GET /api/dashboard/summary
```

Complete API documentation is provided through the project's OpenAPI/Swagger documentation.

---

## API Response Format

All API responses use a consistent response envelope.

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

Standard error codes include:

```text
VALIDATION_ERROR
UNAUTHORIZED
NOT_FOUND
CONFLICT
SERVER_ERROR
```

---

## Design Principles

### 1. Extend Without Breaking Core APIs

New functionality is introduced through additional endpoints instead of changing existing core endpoints unnecessarily.

### 2. Isolated Feature Services

Each major feature owns its business logic through an independent service module.

### 3. AI Does Not Directly Modify the Database

The AI produces structured suggestions. The backend validates the result before any database operation.

```text
User Input
    ↓
AI
    ↓
Structured Result
    ↓
Backend Validation
    ↓
Database
```

### 4. Optional Features Must Not Break the Core

The core application remains functional even when optional features are not implemented.

---

## Development Strategy

The project follows a **20-day incremental development pipeline**.

```text
Day 1–2   Planning & Architecture
Day 3–4   Foundation & Initial Deployment
Day 5–9   Core Task & Goal CRUD
Day 10–12 Frontend / Backend Integration
Day 13–15 Dashboard & Calendar → MVP
Day 16    Stabilization
Day 17–19 Optional Feature Expansion
Day 20    Finalization & Demo
```

### Key Milestones

- **Day 4:** deployed project skeleton
- **Day 9:** Task and Goal CRUD working
- **Day 12:** no mock data in the core application
- **Day 15:** deployed MVP with demo data
- **Day 16:** core feature freeze
- **Day 19:** feature freeze
- **Day 20:** final release

---

## Development Team

The project is developed by two team members with separated responsibilities:

**Frontend / UX**
- React
- UI components
- Pages and layouts
- Forms
- Dashboard and Calendar UI
- API integration

**Backend / Data**
- Express
- MongoDB / Mongoose
- REST API
- Authentication
- Validation
- Business logic
- API documentation
- Backend deployment

Each completed feature is reviewed and explained by both team members to ensure that both understand the implementation and data flow.

---

## Running the Project

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
npm run dev
```

Environment variables and deployment configuration are documented separately.

---

## Project Status

The project is developed incrementally.

**Core scope:**

- Task Management
- Goal & Progress Tracking
- Calendar
- Dashboard
- Authentication

**Advanced scope:**

- AI Task Priority
- Goal Deadline Impact
- Productivity Analytics
- Habit Tracking
- AI Daily Planner

Advanced features are selected based on development progress and are implemented only after the core MVP is stable.

---

## Documentation

Additional technical documentation:

- `docs/openapi.yaml` — REST API specification
- `docs/architecture.md` — architecture, conventions, and error handling
- `docs/database.md` — database models and relationships