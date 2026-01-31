 # REST API Plan

 ## 1. Resources
- **`plants`** → `plant_card`: core entity holding metadata (name, instructions, icon/color, next/last care dates) with indexes on (`user_id`), (`next_care_at`, `name`), `name`, `next_watering_at`, and `next_fertilizing_at` to support dashboards and search.
 - **`diseases`** → `disease_entry`: 1:N child of `plant_card` for accordion-style disease entries (name, symptoms, advice) indexed by `plant_card_id`.
 - **`schedules`** → `seasonal_schedule`: per-plant per-season intervals (watering/fertilizing, 0 disables fertilizing) with uniqueness on `(plant_card_id, season)`.
 - **`care-actions`** → `care_log`: historical log of performed watering/fertilizing actions with `performed_at <= today` and indexes that combine `plant_card_id`, `action_type`, and `performed_at`.
- **`dashboard`**: lightweight aggregate that groups plants into “requires attention” and “all plants” sections using `next_*_at` and derived priority.
 - **`user profile`**: Supabase-managed `auth.users` row (email, password, timestamps); authentication handled via Supabase Auth SDK with JWTs validated in middleware.

 ## 2. Endpoints
 All endpoints return JSON with a consistent envelope:
 ```json
 {
   "success": boolean,
   "data": T | null,
   "error": { "code": string, "message": string, "details"?: any },
  "pagination"?: { "page": number, "limit": number, "total": number, "total_pages": number }
 }
 ```
 ### 2.1 Plant Cards
 #### `GET /api/plants`
 - **Description:** List the authenticated user’s plants with search, sorting, and pagination.
 - **Query Parameters:**
   - `page` (number, default 1)
   - `limit` (number, default 20, max 20)
   - `search` (string, optional, name partial match)
   - `sort` (enum: `priority` (default), `name`, `created`)
   - `direction` (`asc` or `desc`, default `asc`)
  - `needs_attention` (`true`/`false`, optional filters plants whose `next_watering_at` or `next_fertilizing_at` is ≤ today)
- **Response data:** array of plant cards (`id`, `name`, `icon_key`, `color_hex`, `difficulty`, `next_watering_at`, `next_fertilizing_at`, `last_*_at`, `created_at`, `updated_at`).
 - **Success Codes:** `200 OK`
 - **Error Codes:** `400` validation failure, `401` unauthorized, `403` forbidden, `500` server error.

 #### `POST /api/plants`
 - **Description:** Create a new plant card with optional diseases and schedule entries.
 - **Request body:**
   ```json
   {
     "name": "string (≤50)",
     "soil": "string (≤200)",
     "pot": "string (≤200)",
     "position": "string (≤50)",
     "difficulty": "easy" | "medium" | "hard",
     "watering_instructions": "string (≤2000)",
     "repotting_instructions": "string (≤2000)",
     "propagation_instructions": "string (≤2000)",
     "notes": "string (≤2000)",
     "icon_key": "string (≤50)",
     "color_hex": "#RRGGBB",
     "schedules": [
       { "season": "spring", "watering_interval": 7, "fertilizing_interval": 14 }
     ],
     "diseases": [
       { "name": "string (≤50)", "symptoms": "text (≤2000)", "advice": "text (≤2000)" }
     ]
   }
   ```
 - **Response data:** created plant card with nested `schedules` and `diseases`.
 - **Success Codes:** `201 Created`
 - **Error Codes:** `400` validation, `401` unauthorized, `403` forbidden, `409` conflict (duplicate schedule), `500` server error.

 #### `GET /api/plants/:id`
 - **Description:** Retrieve a single plant card with its diseases, schedules, and latest care logs (limit 5).
- **Response data:** plant card + arrays of `diseases`, `schedules`, `recent_care_logs`.
 - **Dependencies:** verifies `user_id = auth.uid()` via RLS for all joins.

 #### `PUT /api/plants/:id`
- **Description:** Update a plant card (partial fields allowed); updates recalc derived priority if next dates change.
 - **Request body:** same schema as POST (all fields optional except `name` must be non-empty if provided).
 - **Response:** updated plant with nested relations.

 #### `DELETE /api/plants/:id`
 - **Description:** Delete plant (cascades to diseases, schedules, care logs).
 - **Success response:** `{ "success": true, "data": null, "message": "Plant deleted" }`.

 ### 2.2 Disease Management
 #### `GET /api/plants/:id/diseases`
 - **Description:** Fetch disease entries for a plant.
 - **Response:** array of entries `(id, name, symptoms, advice, created_at)`.

 #### `POST /api/plants/:id/diseases`
 - **Request:** `{ "name": "string (≤50)", "symptoms"?: "string (≤2000)", "advice"?: "string (≤2000)" }`
 - **Response:** created disease entry.

 #### `PUT /api/plants/:id/diseases/:diseaseId`
 - **Request:** same schema as POST.
 - **Response:** updated disease.

 #### `DELETE /api/plants/:id/diseases/:diseaseId`
 - **Description:** Remove disease.
 - **Response:** success message.

 ### 2.3 Seasonal Schedules
 #### `GET /api/plants/:id/schedules`
 - **Description:** Return all four seasonal rows; each includes `season`, `watering_interval` (0-365), `fertilizing_interval` (0-365).
 - **Response:** array sorted by season order.

 #### `PUT /api/plants/:id/schedules`
 - **Request:** `{ "schedules": [{ "season": "winter", "watering_interval": 10, "fertilizing_interval": 0 }, ...] }`
 - **Validation:** ensures all four seasons present, intervals are integers within [0, 365], fertilizing interval can be 0 to disable.
 - **Response:** updated schedules with timestamps.

 ### 2.4 Care Actions
 #### `POST /api/plants/:id/care-actions`
 - **Description:** Log watering/fertilizing (including backdates).
 - **Request body:**
   ```json
   {
     "action_type": "watering" | "fertilizing",
     "performed_at": "YYYY-MM-DD" // optional, defaults to today
   }
   ```
 - **Business logic:**  
   - Validates `performed_at ≤ today`.  
   - Resolves season for `performed_at`.  
   - Fetches interval from `seasonal_schedule`.  
  - Updates `last_*_at`, recalculates `next_*_at = performed_at + interval`, recomputes priority (0 = overdue, 1 = today, 2 = future).  
   - For fertilizing, ensures `fertilizing_interval > 0` or returns `400` with `"Fertilizing disabled for this season"`.
 - **Response:** created `care_log` and updated plant with new `next_*_at`.

 #### `GET /api/plants/:id/care-actions`
 - **Query params:** `action_type`, `limit` (default 50).
 - **Response:** historical log entries sorted newest first.

 ### 2.5 Dashboard
 #### `GET /api/dashboard`
 - **Description:** Single payload for landing/dashboard view.
 - **Response structure:**
   ```json
   {
    "requires_attention": [/* plants with next due date ≤ today */],
    "all_plants": [/* paginated list, sorted by priority, then name */],
    "stats": { "total_plants": number, "urgent": number, "warning": number }
   }
   ```
 - **Query params:** `page`, `limit`, `search`, `sort`, `direction`.
 - **Success codes:** `200 OK`.  
 - Implements search restricted to user’s plants, returns empty arrays with UI guidance when no matches (US-021/US-035), and enforces max 20 items per page (US-022).

 ### 2.6 User Profile
 #### `GET /api/user/profile`
 - **Description:** Mirror Supabase profile (email, created_at, metadata).
 - **Authorization:** uses Supabase session token.

 ## 3. Authentication and Authorization
 - **Supabase Auth** handles registration/login (email/password + Google OAuth) and password recovery (PRD §3.1, US-001–US-005).  
 - **Middleware (`src/middleware/index.ts`)** verifies JWT on every `/api/*` and private page request; unauthenticated requests redirect to landing (PRD US-006).
 - **Row-Level Security** on `plant_card`, `disease_entry`, `seasonal_schedule`, `care_log` enforces `user_id = auth.uid()` or existence checks via `plant_card.user_id` (DB plan §4).  
 - **Error handling:** `401` for missing/invalid token, `403` when ownership validation fails, `400` for validation errors, `404` when resources absent.
 - **Rate limiting and abuse:** plan for per-user throttling (future extension) and rely on Supabase connection pooling for concurrency.

 ## 4. Validation and Business Logic
- **Plant card validation:** names ≤ 50 chars, instruction fields ≤ 2000 chars, optional `position`/`soil`/`pot` lengths, `difficulty` limited to `easy|medium|hard`, `color_hex` matches `^#[0-9A-Fa-f]{6}$`.  
 - **Disease entries:** `name` ≤ 50, `symptoms`/`advice` ≤ 2000.  
 - **Schedules:** each season entry requires `watering_interval` and `fertilizing_interval` as integers between 0 and 365, with fertilizing interval allowed to be 0 to honor “disable fertilizing” (PRD §§3.1–3.5, US-024/US-025).  
- **Care logging:** `action_type` enum, `performed_at` must be `≤ today`, updates recalc `last_*`/`next_*`, recalculates priority (0 overdue, 1 due today, 2 future) to drive color-coded statuses (PRD §4.2–4.4, US-020).  
 - **Search/pagination:** `GET /api/plants`/`/api/dashboard` enforces search within a user’s plants and paginates results (max 20 per page) so the UI can display empty states (PRD US-021, US-022, US-035).  
 - **Backdating actions:** Accept historical `performed_at` (not future) and compute future intervals from that date, satisfying PRD US-028/US-029/US-030.  
 - **Multi-resource updates:** Creating or updating a plant optionally upserts `seasonal_schedule` and `diseases` in the same transaction to keep dashboard info consistent and avoid data loss (PRD US-033).  
 - **Error propagation:** Validation failures emit structured errors (`{ code: "VALIDATION_ERROR", message: "...", details: [...] }`); `409` surfaces on duplicate `(plant_card_id, season)` schedule attempts (DB plan constraint).  
- **Performance safeguards:** rely on indexes on `user_id`, `next_care_at`, `next_*`, and `name`. Precomputed `next_watering_at`/`next_fertilizing_at` reduce dashboard recalcs, while paginated endpoints limit payloads (PRD §§4.1–4.5, DB plan index section).
