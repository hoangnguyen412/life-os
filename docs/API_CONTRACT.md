# Life OS — API Contract

**Version:** 1.0  
**Status:** Core contract for frontend and backend implementation  
**Canonical machine-readable spec:** [`openapi.yaml`](./openapi.yaml)

This document is the shared agreement between frontend and backend. The frontend may use mock data against this contract on Days 3–9; the backend implements the same contract in parallel. Integration must not introduce undocumented field names or response shapes.

## 1. Global conventions

- API prefix: `/api`.
- Content type: `application/json` for request and response bodies.
- Authentication: `Authorization: Bearer <token>` for all API routes except `POST /api/auth/register` and `POST /api/auth/login`. `GET /api/auth/me` requires authentication. `/api-docs` is public.
- JWT lifetime: 7 days. Passwords are hashed with bcrypt; `passwordHash` is never returned by the API.
- Resource ownership: the backend derives `userId` from the JWT. Never accept `userId` from a client payload. Every read, update and delete query must be scoped by the authenticated `userId`.
- API responses do **not** include internal `userId`. References such as `goalId` are returned as an ID string or `null`, never as a populated Goal object.
- MongoDB ObjectIds are serialized as 24-character strings in JSON.
- Do not return stack traces or database internals in errors.

## 2. Response envelope

### Success — single resource or mutation

```json
{
  "success": true,
  "data": { "_id": "652f1d8c4a2b9e8c7d6f1234" }
}
```

### Success — list

All list endpoints return `data` as an array and a `pagination` object, even when the result is empty.

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Pagination rules: `page` defaults to `1`; `limit` defaults to `20`; allowed limit is `1–100`. `total` is the total number of matching records before pagination. `totalPages` is `Math.ceil(total / limit)`; it is `0` when `total` is `0`.

### Error

The HTTP status and envelope must agree. `field`, when present, uses the exact API field/query-parameter name in camelCase. For a request with multiple validation problems, return the first validation error consistently.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "endTime must be later than startTime",
    "field": "endTime"
  }
}
```

| HTTP status | Code | Use |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid/missing field, invalid enum, invalid query, malformed date or invalid ObjectId format |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired JWT or invalid login credentials |
| 404 | `NOT_FOUND` | Resource does not exist or belongs to another user |
| 409 | `CONFLICT` | Duplicate email during registration |
| 500 | `SERVER_ERROR` | Unexpected server error; do not expose internal details |

## 3. Date and optional-field rules

- All date-time strings sent to or returned from the API must be valid ISO-8601 UTC strings ending in `Z`, e.g. `2026-10-10T16:59:59.999Z`.
- Backend stores dates as MongoDB `Date` values and serializes them to ISO UTC strings.
- For the Task due-date date picker, the frontend converts the selected **local calendar date's end of day** (`23:59:59.999` in the browser's local timezone) to ISO using `toISOString()`. Do not hard-code `+07:00`; use the browser's local timezone.
- For CalendarEvent start/end date-time controls, convert the user's local date/time to ISO UTC using `toISOString()`.
- Date responses are displayed in local time by the frontend.
- On `POST`, an omitted optional field uses its stated default. Empty optional form values must be normalized to JSON `null`, **not** `""`.
- On `PUT`, send the complete set of editable fields. Every field listed as required by that PUT request must be present; an omitted field returns `400 VALIDATION_ERROR`. Send `null` to clear a nullable field.
- `null` is accepted only for fields documented as nullable. Never send `"null"`, `"undefined"`, or an empty string for a date/ID field.

## 4. Resource models

Fields marked **read-only** are generated or managed by the backend and must not be sent as writable fields.

### User (public response)

| Field | Type | Required on registration | Notes |
|---|---|---:|---|
| `_id` | string | No | Read-only MongoDB ID |
| `name` | string | Yes | Trimmed; must not be blank |
| `email` | string | Yes | Normalized to lowercase; unique |
| `createdAt` | ISO UTC string | No | Read-only |
| `password` | string | Yes | Registration/login input only; minimum 8 characters on registration; never returned |
| `passwordHash` | — | No | Internal only; never returned |

### Task

| Field | Type | Create behavior | Update behavior |
|---|---|---|---|
| `_id` | string | Read-only | Read-only |
| `title` | string | Required; trimmed, non-blank | Required |
| `description` | string or `null` | Defaults to `null` | Required key on `PUT`; `null` clears it |
| `status` | `todo \| in_progress \| done` | Defaults to `todo` | Required |
| `dueDate` | ISO UTC string or `null` | Defaults to `null` | Required key on `PUT`; `null` clears it |
| `goalId` | ObjectId string or `null` | Defaults to `null` | Required key on `PUT`; `null` unlinks the Goal |
| `priority` | `low \| medium \| high` | Defaults to `medium` | Required |
| `completedAt` | ISO UTC string or `null` | Read-only; set to now if created as `done` | Read-only; set when transitioning to `done`, preserved while remaining `done`, cleared when transitioning away from `done` |
| `createdAt` | ISO UTC string | Read-only | Read-only |
| `updatedAt` | ISO UTC string | Read-only | Read-only |

`goalId` is **always an ID string or `null`**, never a Goal object. When a Task is created/updated with a non-null `goalId`, the backend checks that the Goal belongs to the same user; otherwise return `404 NOT_FOUND`.

Overdue definition, used everywhere: `dueDate < now AND status != done`. A Task without a due date is not overdue.

### Goal

| Field | Type | Create behavior | Update behavior |
|---|---|---|---|
| `_id` | string | Read-only | Read-only |
| `title` | string | Required; trimmed, non-blank | Required |
| `deadline` | ISO UTC string or `null` | Defaults to `null` | Required key on `PUT`; `null` clears it |
| `progressMode` | `task_based \| manual` | Defaults to `task_based` | Required |
| `manualProgress` | integer `0–100` | Defaults to `0`; accepted on create when mode is `manual` | Updated through `PATCH /api/goals/:id/progress`, not `PUT` |
| `progress` | integer `0–100` | Read-only, calculated by backend | Read-only, calculated by backend |
| `status` | `active \| completed` | Read-only, derived from `progress` | Read-only, derived from `progress` |
| `createdAt` | ISO UTC string | Read-only | Read-only |

Goal progress rules:

- `task_based`: `0` if no Tasks are linked; otherwise `Math.round(doneTasks / allLinkedTasks * 100)`.
- `manual`: `progress = manualProgress`.
- `progress === 100` means `status = completed`; otherwise `status = active`.
- After creating/deleting a linked Task, changing a Task's status, or changing its `goalId`, recalculate affected Goal progress. If a Task changes Goal, recalculate both the old and new Goal.
- Switching `task_based → manual` preserves the current calculated progress by copying it into `manualProgress`.
- Switching `manual → task_based` immediately recalculates progress from linked Tasks.
- `PATCH /api/goals/:id/progress` is valid only when `progressMode = manual`; otherwise return `400 VALIDATION_ERROR` with `field: "progressMode"`.
- Deleting a Goal unlinks its Tasks (`goalId = null`) but does not delete them.

### CalendarEvent

| Field | Type | Create behavior | Update behavior |
|---|---|---|---|
| `_id` | string | Read-only | Read-only |
| `title` | string | Required; trimmed, non-blank | Required |
| `startTime` | ISO UTC string | Required | Required |
| `endTime` | ISO UTC string | Required; must be later than `startTime` | Required; must be later than `startTime` |
| `description` | string or `null` | Defaults to `null` | Required key on `PUT`; `null` clears it |
| `createdAt` | ISO UTC string | Read-only | Read-only |

CalendarEvent and Task are separate entities in the Core MVP. A Task's `dueDate` does not automatically create or appear as a CalendarEvent.

## 5. Endpoints

All endpoints below are relative to `/api`.

### Authentication

| Method and path | Auth | Request body | Success |
|---|---|---|---|
| `POST /auth/register` | Public | `{ "name": "Nguyen", "email": "user@example.com", "password": "password123" }` | `201`; `{ data: { token, user } }` |
| `POST /auth/login` | Public | `{ "email": "user@example.com", "password": "password123" }` | `200`; `{ data: { token, user } }` |
| `GET /auth/me` | Required | None | `200`; `{ data: user }` |

Register and login return the same token/user shape. `user` contains `_id`, `name`, `email`, `createdAt` only.

### Tasks

| Method and path | Purpose | Body / query | Success |
|---|---|---|---|
| `GET /tasks` | List/filter/paginate Tasks | Query below | `200`; paginated list |
| `POST /tasks` | Create Task | Task create body | `201`; created Task |
| `GET /tasks/:id` | Get one Task | None | `200`; Task |
| `PUT /tasks/:id` | Replace editable Task fields | Full Task update body | `200`; updated Task |
| `DELETE /tasks/:id` | Delete Task | None | `200`; `{ "_id": "...", "deleted": true }` |

`GET /tasks` query parameters:

| Parameter | Allowed values | Default / meaning |
|---|---|---|
| `status` | `todo`, `in_progress`, `done` | No status filter when omitted |
| `goalId` | ObjectId string or `none` | `none` means Tasks with no Goal |
| `overdue` | `true`, `false` | No overdue filter when omitted |
| `sort` | `dueDate_asc`, `priority_desc`, `createdAt_desc` | `dueDate_asc` |
| `page` | Integer ≥ 1 | `1` |
| `limit` | Integer 1–100 | `20` |

Sort rules:

- `dueDate_asc`: earliest due date first; Tasks without due dates last; ties by priority (`high`, `medium`, `low`), then newest first.
- `priority_desc`: `high`, then `medium`, then `low`; ties by due date ascending (no due date last), then newest first.
- `createdAt_desc`: newest first.
- For deterministic pagination, add `_id` as the final tie-breaker.
- An unsupported `sort` value returns `400 VALIDATION_ERROR` with `field: "sort"`.

Task create example:

```json
{
  "title": "Finish API contract",
  "description": null,
  "status": "todo",
  "dueDate": "2026-10-10T16:59:59.999Z",
  "goalId": null,
  "priority": "high"
}
```

Task `PUT` example (send every editable field; use `null` to clear optional values):

```json
{
  "title": "Finish API contract",
  "description": "Review with backend teammate",
  "status": "in_progress",
  "dueDate": "2026-10-10T16:59:59.999Z",
  "goalId": "652f1d8c4a2b9e8c7d6f1234",
  "priority": "high"
}
```

### Goals

| Method and path | Purpose | Body / query | Success |
|---|---|---|---|
| `GET /goals` | List/paginate Goals | `page`, `limit` | `200`; paginated list, newest first (`createdAt_desc`) |
| `POST /goals` | Create Goal | Goal create body | `201`; created Goal |
| `GET /goals/:id` | Get one Goal | None | `200`; Goal |
| `PUT /goals/:id` | Replace editable Goal fields | `{ title, deadline, progressMode }` | `200`; updated Goal |
| `PATCH /goals/:id/progress` | Set manual progress | `{ "manualProgress": 60 }` | `200`; updated Goal |
| `DELETE /goals/:id` | Delete Goal and unlink Tasks | None | `200`; `{ "_id": "...", "deleted": true }` |

Goal create examples:

```json
{
  "title": "Complete Life OS",
  "deadline": "2026-10-30T16:59:59.999Z",
  "progressMode": "task_based"
}
```

```json
{
  "title": "Improve productivity",
  "deadline": null,
  "progressMode": "manual",
  "manualProgress": 60
}
```

Goal detail/list item example:

```json
{
  "_id": "652f1d8c4a2b9e8c7d6f1235",
  "title": "Complete Life OS",
  "deadline": "2026-10-30T16:59:59.999Z",
  "progressMode": "task_based",
  "manualProgress": 0,
  "progress": 40,
  "status": "active",
  "createdAt": "2026-10-01T03:00:00.000Z"
}
```

For `PUT /goals/:id`, send all three keys. `deadline` may be `null`; `progressMode` must be `task_based` or `manual`. Progress changes use the dedicated PATCH endpoint. A task-based Goal rejects the progress PATCH.

### Calendar events

| Method and path | Purpose | Body / query | Success |
|---|---|---|---|
| `GET /events` | List/paginate events | `from`, `to`, `page`, `limit` | `200`; paginated list |
| `POST /events` | Create event | Event create body | `201`; created event |
| `GET /events/:id` | Get one event | None | `200`; event |
| `PUT /events/:id` | Replace editable event fields | Full event update body | `200`; updated event |
| `DELETE /events/:id` | Delete event | None | `200`; `{ "_id": "...", "deleted": true }` |

- `from` and `to` must either both be present or both be omitted. If present, both must be ISO UTC date-times and `from < to`.
- Range filtering includes events overlapping the visible calendar range: `startTime < to AND endTime > from`.
- Events are sorted by `startTime` ascending.
- Invalid range returns `400 VALIDATION_ERROR` with `field: "from"` or `field: "to"` as appropriate.

Event create example:

```json
{
  "title": "Study database",
  "startTime": "2026-10-10T02:00:00.000Z",
  "endTime": "2026-10-10T03:30:00.000Z",
  "description": null
}
```

### Dashboard

`GET /dashboard/summary` returns:

```json
{
  "success": true,
  "data": {
    "totalTasks": 10,
    "completedTasks": 4,
    "overdueTasks": 2,
    "avgGoalProgress": 60
  }
}
```

- `totalTasks`: all Tasks owned by the current user.
- `completedTasks`: Tasks with `status = done`.
- `overdueTasks`: Tasks meeting the shared overdue definition.
- `avgGoalProgress`: rounded arithmetic mean of `progress` across active Goals; `0` when there are no active Goals.

## 6. Required validation

- Trim `name`, `title`, `description`, and email where applicable; reject blank `name`/`title`.
- Registration email must be unique; duplicate email returns `409 CONFLICT` with `field: "email"`.
- Password must be at least 8 characters on registration.
- Enum fields must match the exact values documented above.
- `dueDate` and `deadline` accept valid ISO UTC date-time or `null`.
- `startTime` and `endTime` must be valid ISO UTC date-times; `endTime > startTime`.
- IDs must be valid MongoDB ObjectId strings. Missing/foreign resources return `404 NOT_FOUND`.
- `manualProgress` must be an integer from `0` through `100`.
- All list `page`/`limit` values must be valid integers in the documented ranges.
- The frontend should display validation errors by matching `error.field` to the corresponding form field. If `field` is omitted, display the message as a general error.

## 7. Core business rules that must not diverge

1. The client never sends `userId`, `completedAt`, `progress`, `status` for Goal, or timestamps as writable fields.
2. Task completion timestamp is backend-managed: set on transition to `done`, clear when leaving `done`.
3. Goal progress is backend-managed according to `progressMode`; the frontend displays returned `progress` and `status` rather than calculating a competing value.
4. Every service query includes the authenticated `userId`.
5. Deleting a Goal sets the linked Tasks' `goalId` to `null`; it does not delete Tasks.
6. Deleting a Task or changing its Goal/status recalculates affected Goal progress.
7. All API endpoints use the same success/error envelope; all list endpoints use pagination.
8. Update `docs/openapi.yaml` whenever this contract changes. Frontend mocks and backend implementation must follow the contract; do not change the contract unilaterally.

## 8. OpenAPI and implementation workflow

- Keep this readable guide and `openapi.yaml` in the repository under `docs/`.
- Backend adds request validation and response handling to match the spec.
- Frontend creates TypeScript/JSDoc shapes or equivalent mock data from the same field names and response examples.
- At the end of Days 5–9, test every Task/Goal endpoint against this contract; by Day 12, integration must use real API responses rather than mock data.
