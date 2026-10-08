# Life OS — Backend Database Design

## 1. Database

**Database:** MongoDB  
**ODM:** Mongoose

All date/time values are stored and compared in UTC using ISO-8601 format.

---

## 2. User

### Fields

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `email` | String | Required, unique |
| `passwordHash` | String | Required |
| `name` | String | Required |
| `createdAt` | Date | Auto-generated |

### Purpose

Stores user authentication and profile information.

---

## 3. Task

### Fields

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Reference to User |
| `title` | String | Required |
| `description` | String | Optional |
| `status` | String | `todo \| in_progress \| done` |
| `dueDate` | Date | Optional, UTC |
| `goalId` | ObjectId | Optional, Reference to Goal |
| `priority` | String | `low \| medium \| high`, default `medium` |
| `completedAt` | Date | Optional |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Business Rules

**Overdue**

```text
overdue =
    dueDate < current time
    AND status != done
```

This definition is shared across Dashboard, Analytics and Goal Deadline Impact.

**Completed timestamp**

```text
status → done
    => completedAt = current time

done → another status
    => completedAt = null
```

**Goal ownership**

When creating or updating a Task with `goalId`, the referenced Goal must belong to the same `userId`.

---

## 4. Goal

### Fields

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Reference to User |
| `title` | String | Required |
| `deadline` | Date | Optional, UTC |
| `progressMode` | String | `task_based \| manual` |
| `manualProgress` | Number | `0–100`, default `0` |
| `progress` | Number | `0–100`, calculated by service |
| `status` | String | `active \| completed`, default `active` |
| `createdAt` | Date | Auto-generated |

### Progress Rules

#### `task_based`

```text
No tasks
    → progress = 0

Has tasks
    → progress =
      completed tasks / total tasks × 100
```

The result is rounded to the nearest integer.

#### `manual`

```text
progress = manualProgress
```

### Goal Status

```text
progress = 100
    → status = completed

progress < 100
    → status = active
```

### Progress Recalculation

The backend must recalculate Goal progress after:

- Creating a Task with `goalId`
- Changing Task status
- Changing Task `goalId`
- Deleting a Task

Service function:

```text
goalService.recalculateProgress(goalId, userId)
```

When a Task moves from one Goal to another, recalculate both the old and new Goal.

### Progress Mode Rules

When `progressMode = task_based`:

```text
PATCH /api/goals/:id/progress
→ 400 VALIDATION_ERROR
```

When changing:

```text
manual → task_based
```

Recalculate progress immediately.

When changing:

```text
task_based → manual
```

Set `manualProgress` to the current progress.

---

## 5. CalendarEvent

### Fields

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId | Reference to User |
| `title` | String | Required |
| `startTime` | Date | Required, UTC |
| `endTime` | Date | Required, UTC |
| `description` | String | Optional |
| `createdAt` | Date | Auto-generated |

### Validation

```text
endTime > startTime
```

If invalid:

```text
400 VALIDATION_ERROR
field = endTime
```

### Task Relationship

`CalendarEvent` and `Task` are separate entities.

Core does not automatically create CalendarEvents from Tasks.

---

## 6. Relationships

```text
User
 ├──< Task
 ├──< Goal
 └──< CalendarEvent

Goal
 └──< Task
```

### Relationship rules

```text
User 1 ─── N Task
User 1 ─── N Goal
User 1 ─── N CalendarEvent
Goal 1 ─── N Task
```

Every relationship is scoped by `userId`.

A user cannot access or link resources belonging to another user.

---

## 7. Cascade Rules

### Delete Goal

When a Goal is deleted:

```text
Task.goalId → null
```

Only Tasks belonging to the same user are updated.

Tasks are NOT deleted.

### Delete Task

When a Task with a `goalId` is deleted:

```text
delete Task
    ↓
recalculate Goal progress
```

---

## 8. Extension Models

These models are created only when the corresponding feature is implemented.

### Habit

```text
userId
title
frequency
streakCount
lastCheckedAt
```

### AISuggestion

```text
userId
type
payload
status
createdAt
```

`status`:

```text
pending | accepted | rejected
```

---

## 9. Database Design Principles

1. Every user-owned resource contains `userId`.
2. Service-layer queries must always filter by `userId`.
3. Business rules are handled by services rather than controllers.
4. Core entities remain independent from optional extension features.
5. Dates are stored and compared in UTC.