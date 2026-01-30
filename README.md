# Greenie

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Project name

Greenie

## Project description

Greenie is a responsive, login-only web utility for private management of home and garden plant care. Users create their own plant database from scratch, store care instructions, log actions, and receive information about upcoming watering and fertilizing dates based on actual activity.

## Table of contents

- [Project name](#project-name)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [API](#api)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

Frontend
- [Astro](https://astro.build/) 5
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4
- [shadcn/ui](https://ui.shadcn.com/)

Backend
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + SDK)

CI/CD and hosting
- GitHub Actions
- DigitalOcean (Docker-based deployment)

Tooling
- ESLint
- Prettier
- Husky + lint-staged

## Getting started locally

Prerequisites
- Node.js `22.14.0` (from `.nvmrc`)
- npm

Setup
```bash
git clone <repo-url>
cd 10xdevs-plants
nvm use
npm install
```

Run the dev server
```bash
npm run dev
```

Build for production
```bash
npm run build
```

Preview the production build
```bash
npm run preview
```

## Available scripts

- `npm run dev` - Start Astro dev server
- `npm run build` - Build the production bundle
- `npm run preview` - Preview the production build locally
- `npm run astro` - Run Astro CLI
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format files with Prettier

## API

All API endpoints return `ApiResponseDto<T>` envelopes. Responses may include an optional `message`
field for command-style endpoints (e.g. delete confirmations).

### GET /api/dashboard

Returns a single dashboard payload: list of plants requiring attention, paginated list of all plants,
and status statistics. At this stage the backend uses a default user id to associate data with a user.

Query params:
- `page` (default `1`, min `1`)
- `limit` (default `20`, range `1-20`)
- `search` (partial match by `name`, trimmed, max `50`)
- `sort`: `priority` | `name` | `created`
- `direction`: `asc` | `desc`

Example request:
```bash
curl "http://localhost:4321/api/dashboard?search=monstera&sort=name&direction=desc"
```

Example success response:
```json
{
  "success": true,
  "data": {
    "requires_attention": [
      {
        "id": "uuid",
        "name": "Monstera",
        "icon_key": "monstera",
        "color_hex": "#2D5A27",
        "difficulty": "medium",
        "status_priority": 1,
        "next_watering_at": "2026-01-29T10:00:00Z",
        "next_fertilizing_at": "2026-02-15T10:00:00Z",
        "last_watered_at": "2026-01-21T10:00:00Z",
        "last_fertilized_at": "2026-01-01T10:00:00Z",
        "created_at": "2025-12-01T08:00:00Z",
        "updated_at": "2026-01-21T10:00:00Z"
      }
    ],
    "all_plants": [
      {
        "id": "uuid",
        "name": "Monstera",
        "icon_key": "monstera",
        "color_hex": "#2D5A27",
        "difficulty": "medium",
        "status_priority": 1,
        "next_watering_at": "2026-01-29T10:00:00Z",
        "next_fertilizing_at": "2026-02-15T10:00:00Z",
        "last_watered_at": "2026-01-21T10:00:00Z",
        "last_fertilized_at": "2026-01-01T10:00:00Z",
        "created_at": "2025-12-01T08:00:00Z",
        "updated_at": "2026-01-21T10:00:00Z"
      }
    ],
    "stats": { "total_plants": 45, "urgent": 3, "warning": 5 }
  },
  "error": null,
  "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
}
```

Responses:
- `200` with `ApiResponseDto<DashboardDto>` + pagination for `all_plants`
- `400` validation errors
- `401` authentication required
- `500` server errors

Manual test checklist:
- `page=0` or `page=-1` returns `400`
- `limit=0` or `limit=21` returns `400`
- `sort=invalid` returns `400`
- `direction=invalid` returns `400`
- `search` with whitespace trims correctly and does not error
- `search` with no matches returns `200` with empty lists and zero stats

### POST /api/plants

Creates a new plant card with optional schedules and diseases. At this stage the
backend uses a default user id to associate data with a user.

Payload (JSON):
- `name` (required, max 50)
- `soil`, `pot` (max 200)
- `position`, `icon_key` (max 50)
- `difficulty`: `easy` | `medium` | `hard`
- `watering_instructions`, `repotting_instructions`, `propagation_instructions`, `notes` (max 2000)
- `color_hex`: `#RRGGBB`
- `schedules`: array of `{ season, watering_interval, fertilizing_interval }`
- `diseases`: array of `{ name, symptoms, advice }`

Example request:
```bash
curl -X POST http://localhost:4321/api/plants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monstera",
    "difficulty": "easy",
    "color_hex": "#00AA88",
    "schedules": [
      { "season": "spring", "watering_interval": 7, "fertilizing_interval": 30 }
    ],
    "diseases": [
      { "name": "Root rot", "symptoms": "Soft stems", "advice": "Reduce watering" }
    ]
  }'
```

Example success response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Monstera",
    "difficulty": "easy",
    "color_hex": "#00AA88",
    "schedules": [
      {
        "id": "uuid",
        "season": "spring",
        "watering_interval": 7,
        "fertilizing_interval": 30,
        "created_at": "2026-01-28T12:00:00.000Z",
        "updated_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "diseases": [
      {
        "id": "uuid",
        "name": "Root rot",
        "symptoms": "Soft stems",
        "advice": "Reduce watering",
        "created_at": "2026-01-28T12:00:00.000Z",
        "updated_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "recent_care_logs": [],
    "created_at": "2026-01-28T12:00:00.000Z",
    "updated_at": "2026-01-28T12:00:00.000Z",
    "status_priority": 0,
    "icon_key": null,
    "notes": null,
    "position": null,
    "pot": null,
    "soil": null,
    "watering_instructions": null,
    "repotting_instructions": null,
    "propagation_instructions": null,
    "last_watered_at": null,
    "last_fertilized_at": null,
    "next_watering_at": null,
    "next_fertilizing_at": null
  },
  "error": null
}
```

Responses:
- `201` with `ApiResponseDto<PlantCardDetailDto>`
- `400` validation errors
- `409` duplicate season entries
- `500` server errors

Manual test checklist:
- Missing `name` returns `400`
- Invalid `color_hex` format returns `400`
- Duplicate `season` in `schedules` returns `409`
- Invalid `difficulty` enum returns `400`
- `watering_interval`/`fertilizing_interval` outside `0-365` returns `400`
- Invalid JSON body returns `400`

### PUT /api/plants/:id

Updates an existing plant card. All fields are optional, but `name` must be non-empty when provided.

Payload (JSON):
- Any subset of the fields from `POST /api/plants`

Example request:
```bash
curl -X PUT http://localhost:4321/api/plants/<plant-id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monstera deliciosa",
    "schedules": [
      { "season": "spring", "watering_interval": 10, "fertilizing_interval": 30 }
    ]
  }'
```

Responses:
- `200` with `ApiResponseDto<PlantCardDetailDto>`
- `400` validation errors or invalid JSON
- `404` plant not found
- `409` duplicate season entries
- `500` server errors

Manual test checklist:
- Updating a single field returns `200`
- Updating schedules recalculates `next_*` and `status_priority`
- Invalid JSON body returns `400`
- Empty `name` returns `400`
- Invalid `color_hex` returns `400`
- Duplicate `season` in `schedules` returns `409`
- Invalid `id` UUID returns `400`
- Non-existent `id` returns `404`

### PUT /api/plants/:id/schedules

Replaces the full seasonal schedule set (exactly four entries, one per season).
At this stage the backend uses a default user id to associate data with a user.

Payload (JSON):
- `schedules` (required): array of 4 entries
  - `season`: `spring` | `summer` | `autumn` | `winter`
  - `watering_interval`: int `0-365`
  - `fertilizing_interval`: int `0-365` (0 disables fertilizing)

Example request:
```bash
curl -X PUT http://localhost:4321/api/plants/<plant-id>/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      { "season": "winter", "watering_interval": 10, "fertilizing_interval": 0 },
      { "season": "spring", "watering_interval": 7, "fertilizing_interval": 30 },
      { "season": "summer", "watering_interval": 5, "fertilizing_interval": 21 },
      { "season": "autumn", "watering_interval": 9, "fertilizing_interval": 0 }
    ]
  }'
```

Example success response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "season": "winter",
      "watering_interval": 10,
      "fertilizing_interval": 0,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    }
  ],
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<SeasonalScheduleDto[]>`
- `400` validation errors or invalid JSON
- `401` authentication required
- `404` plant not found
- `500` server errors

Manual test checklist:
- Missing season or duplicate season returns `400`
- `watering_interval`/`fertilizing_interval` outside `0-365` returns `400`
- Invalid `id` UUID returns `400`

### GET /api/plants/:id/schedules

Returns a full seasonal schedule set for a plant, ordered by season (`spring`, `summer`, `autumn`, `winter`).
At this stage the backend uses a default user id to associate data with a user.

Example request:
```bash
curl http://localhost:4321/api/plants/<plant-id>/schedules
```

Example success response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "season": "spring",
      "watering_interval": 7,
      "fertilizing_interval": 30,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "season": "summer",
      "watering_interval": 5,
      "fertilizing_interval": 21,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "season": "autumn",
      "watering_interval": 9,
      "fertilizing_interval": 0,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "season": "winter",
      "watering_interval": 10,
      "fertilizing_interval": 0,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    }
  ],
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<SeasonalScheduleDto[]>`
- `400` invalid plant id
- `401` authentication required
- `404` plant not found
- `500` server errors (including incomplete schedule data)

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- Unauthorized request returns `401`
- Non-existent `id` returns `404`
- Valid request returns `200` with 4 entries ordered by season
- Missing schedule rows returns `500`

### GET /api/plants/:id

Returns a single plant card with its diseases, seasonal schedules, and the latest care logs (max 5).

Example request:
```bash
curl http://localhost:4321/api/plants/<plant-id>
```

Example success response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Monstera",
    "difficulty": "easy",
    "color_hex": "#00AA88",
    "diseases": [
      {
        "id": "uuid",
        "name": "Root rot",
        "symptoms": "Soft stems",
        "advice": "Reduce watering",
        "created_at": "2026-01-28T12:00:00.000Z",
        "updated_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "schedules": [
      {
        "id": "uuid",
        "season": "spring",
        "watering_interval": 7,
        "fertilizing_interval": 30,
        "created_at": "2026-01-28T12:00:00.000Z",
        "updated_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "recent_care_logs": [
      {
        "id": "uuid",
        "action_type": "watering",
        "performed_at": "2026-01-28T12:00:00.000Z",
        "created_at": "2026-01-28T12:00:00.000Z",
        "updated_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "created_at": "2026-01-28T12:00:00.000Z",
    "updated_at": "2026-01-28T12:00:00.000Z",
    "status_priority": 0,
    "icon_key": null,
    "notes": null,
    "position": null,
    "pot": null,
    "soil": null,
    "watering_instructions": null,
    "repotting_instructions": null,
    "propagation_instructions": null,
    "last_watered_at": null,
    "last_fertilized_at": null,
    "next_watering_at": null,
    "next_fertilizing_at": null
  },
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<PlantCardDetailDto>`
- `400` invalid plant id
- `401` authentication required
- `404` plant not found
- `500` server errors

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- Unauthorized request returns `401`
- Non-existent `id` returns `404`
- Valid request returns `200` with `recent_care_logs.length <= 5`

### GET /api/plants/:id/diseases

Returns a list of disease entries for a single plant owned by the authenticated user, ordered by newest `created_at`.

Example request:
```bash
curl http://localhost:4321/api/plants/<plant-id>/diseases
```

Example success response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Root rot",
      "symptoms": "Soft stems",
      "advice": "Reduce watering",
      "created_at": "2026-01-28T12:00:00.000Z",
      "updated_at": "2026-01-28T12:00:00.000Z"
    }
  ],
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<DiseaseDto[]>`
- `400` invalid plant id
- `401` authentication required
- `404` plant not found (or not owned by the user)
- `500` server errors

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- Unauthorized request returns `401`
- Plant owned by another user returns `404` (no access leakage)
- Valid request with no diseases returns `200` and empty array
- Valid request returns `200` ordered by newest `created_at`

### POST /api/plants/:id/diseases

Creates a new disease entry for a plant card. At this stage the backend uses a default user id to associate data with a user.

Payload (JSON):
- `name` (required, max 50)
- `symptoms` (optional, max 2000)
- `advice` (optional, max 2000)

Example request:
```bash
curl -X POST http://localhost:4321/api/plants/<plant-id>/diseases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Root rot",
    "symptoms": "Soft stems",
    "advice": "Reduce watering"
  }'
```

Example success response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Root rot",
    "symptoms": "Soft stems",
    "advice": "Reduce watering",
    "created_at": "2026-01-28T12:00:00.000Z",
    "updated_at": "2026-01-28T12:00:00.000Z"
  },
  "error": null
}
```

Responses:
- `201` with `ApiResponseDto<DiseaseDto>`
- `400` invalid plant id or invalid body
- `404` plant not found (or not owned by the user)
- `500` server errors

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- Missing `name` returns `400`
- `name` longer than 50 returns `400`
- `symptoms`/`advice` longer than 2000 returns `400`
- Invalid JSON body returns `400`
- Plant owned by another user returns `404` (no access leakage)
- Valid request returns `201` with the created disease

### PUT /api/plants/:id/diseases/:diseaseId

Updates a single disease entry for a plant card. The body is a partial update but requires at least one field.

Payload (JSON):
- `name` (optional, max 50)
- `symptoms` (optional, max 2000)
- `advice` (optional, max 2000)

Example request:
```bash
curl -X PUT http://localhost:4321/api/plants/<plant-id>/diseases/<disease-id> \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "Soft stems",
    "advice": "Reduce watering"
  }'
```

Example success response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Root rot",
    "symptoms": "Soft stems",
    "advice": "Reduce watering",
    "created_at": "2026-01-28T12:00:00.000Z",
    "updated_at": "2026-01-29T12:00:00.000Z"
  },
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<DiseaseDto>`
- `400` invalid plant/disease id or invalid body
- `401` authentication required
- `404` plant not found (or not owned by the user) or disease not found
- `500` server errors

Manual test checklist:
- Invalid `id` or `diseaseId` (non-UUID) returns `400`
- Empty body `{}` returns `400`
- `name` longer than 50 returns `400`
- `symptoms`/`advice` longer than 2000 returns `400`
- Invalid JSON body returns `400`
- Plant owned by another user returns `404` (no access leakage)
- Non-existent `diseaseId` for the plant returns `404`
- Valid partial update returns `200` with the updated disease

### DELETE /api/plants/:id/diseases/:diseaseId

Removes a single disease entry for a plant card owned by the authenticated user.

Example request:
```bash
curl -X DELETE http://localhost:4321/api/plants/<plant-id>/diseases/<disease-id>
```

Example success response:
```json
{
  "success": true,
  "data": null,
  "error": null,
  "message": "Disease removed."
}
```

Responses:
- `200` with `ApiResponseDto<null>`
- `400` invalid plant/disease id
- `401` authentication required
- `404` plant not found (or not owned by the user) or disease not found
- `500` server errors

Manual test checklist:
- Invalid `id` or `diseaseId` (non-UUID) returns `400`
- Unauthorized request returns `401`
- Plant owned by another user returns `404` (no access leakage)
- Non-existent `diseaseId` for the plant returns `404`
- Valid delete returns `200` with message

### DELETE /api/plants/:id

Deletes a plant card and cascades removal of related disease entries, seasonal schedules, and care logs.

Example request:
```bash
curl -X DELETE http://localhost:4321/api/plants/<plant-id>
```

Example success response:
```json
{
  "success": true,
  "data": null,
  "error": null,
  "message": "Plant deleted"
}
```

Responses:
- `200` with `ApiResponseDto<null>`
- `400` invalid plant id
- `401` authentication required
- `404` plant not found (or not owned by the user)
- `500` server errors

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- Unauthorized request returns `401`
- Resource owned by another user returns `404` (no access leakage)
- Non-existent `id` returns `404`
- Deleting an existing plant returns `200` with message
- Related schedules, diseases, and care logs are removed via cascade

### GET /api/plants

Returns a paginated list of plant cards for the authenticated user. Supports search, sorting, and
filtering for plants that need immediate attention.

Query params:
- `page` (default `1`, min `1`)
- `limit` (default `20`, range `1-20`)
- `search` (partial match by `name`)
- `sort`: `priority` | `name` | `created`
- `direction`: `asc` | `desc`
- `needs_attention`: `true` | `false`

Example request:
```bash
curl "http://localhost:4321/api/plants?search=monstera&sort=name&direction=desc&needs_attention=true"
```

Responses:
- `200` with `ApiResponseDto<PlantCardListItemDto[]>` + pagination
- `400` validation errors
- `401` authentication required
- `500` server errors

Manual test checklist:
- `page=0` or `page=-1` returns `400`
- `limit=0` or `limit=21` returns `400`
- `sort=invalid` returns `400`
- `direction=invalid` returns `400`
- `needs_attention=maybe` returns `400`
- `search` with whitespace trims correctly and does not error

### GET /api/plants/:id/care-actions

Returns a list of care actions for a single plant. Supports optional filtering by action type and limiting the number of records.

Query params:
- `action_type`: `watering` | `fertilizing`
- `limit` (default `50`, range `1-200`)

Example request:
```bash
curl "http://localhost:4321/api/plants/00000000-0000-0000-0000-000000000000/care-actions?action_type=watering&limit=10"
```

Example success response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action_type": "watering",
      "performed_at": "2026-01-28T12:00:00.000Z",
      "created_at": "2026-01-28T12:00:00.000Z",
      "updated_at": "2026-01-28T12:00:00.000Z"
    }
  ],
  "error": null
}
```

Responses:
- `200` with `ApiResponseDto<CareLogDto[]>`
- `400` validation errors
- `404` plant not found (or not owned by the user)
- `500` server errors

Manual test checklist:
- Invalid `id` (non-UUID) returns `400`
- `action_type=invalid` returns `400`
- `limit=0` or `limit=201` returns `400`
- Unknown plant id returns `404`
- Valid request with no logs returns `200` and empty array
- Filtering by `action_type` returns only matching entries, newest first

### POST /api/plants/:id/care-actions

Creates a care action log (watering or fertilizing) and updates the plant's next/last care dates and status priority. Supports backdating with `performed_at`.

Request body:
- `action_type`: `watering` | `fertilizing` (required)
- `performed_at`: `"YYYY-MM-DD"` (optional, defaults to today; cannot be in the future)

Example request:
```bash
curl -X POST "http://localhost:4321/api/plants/00000000-0000-0000-0000-000000000000/care-actions" \
  -H "Content-Type: application/json" \
  -d '{"action_type":"watering","performed_at":"2026-01-28"}'
```

Example success response:
```json
{
  "success": true,
  "data": {
    "care_log": {
      "id": "uuid",
      "action_type": "watering",
      "performed_at": "2026-01-28",
      "created_at": "2026-01-28T12:00:00.000Z",
      "updated_at": "2026-01-28T12:00:00.000Z"
    },
    "plant": {
      "id": "uuid",
      "name": "Monstera",
      "icon_key": "monstera",
      "color_hex": "#22c55e",
      "difficulty": "easy",
      "status_priority": 2,
      "next_watering_at": "2026-02-02T00:00:00.000Z",
      "next_fertilizing_at": null,
      "last_watered_at": "2026-01-28T00:00:00.000Z",
      "last_fertilized_at": null,
      "created_at": "2026-01-01T12:00:00.000Z",
      "updated_at": "2026-01-28T12:00:00.000Z"
    }
  },
  "error": null
}
```

Responses:
- `201` with `ApiResponseDto<CareActionResultDto>`
- `400` validation errors (`performed_at` in future, missing schedule, fertilizing disabled)
- `404` plant not found (or not owned by the user)
- `500` server errors

Manual test checklist:
- Missing `action_type` returns `400`
- Invalid `performed_at` format returns `400`
- `performed_at` in the future returns `400`
- Fertilizing with interval `0` returns `400` with `"Fertilizing disabled for this season"`
- Missing seasonal schedule for the season returns `400`
- Unknown plant id returns `404`

## Project scope

Core functionality
- Authentication: email/password, Google login, password recovery, profile updates
- Plant cards (CRUD) with structured care instructions and disease entries
- Seasonal watering and fertilizing schedules with backdating and recalculation
- Dashboard with urgency grouping, status colors, sorting, search, and pagination
- UX essentials: empty states, success/error toasts, delete confirmations, mobile card menu, legal footer

Out of scope for MVP
- Social features or shared content
- Guest mode or access without login
- Public knowledge base or external note editing
- Push/email notifications for care actions
- Mobile app
- Photo uploads or advanced media
- Seeded plant lists or starter content

Additional documentation
- `./.ai/prd.md`
- `./.ai/tech-stack.md`

## Project status

MVP scope defined in the PRD and ready for implementation.

## License

MIT
