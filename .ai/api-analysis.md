# API Analysis Document - Greenie Plant Care Application

## 1. Main Database Entities

### 1.1 users
**Source:** `.ai/db-plan.md` (lines 8-17)

- **Primary Key:** `id` (UUID)
- **Key Fields:**
  - `email` (varchar(255), NOT NULL, UNIQUE)
  - `encrypted_password` (varchar, NOT NULL)
  - `created_at` (timestamptz, NOT NULL, DEFAULT now())
  - `confirmed_at` (timestamptz, NOT NULL, DEFAULT now())
- **Relationships:** 1:N with `plant_card` (via `user_id`)
- **Indexes:** Managed by Supabase Auth
- **Notes:** Table is managed by Supabase Auth, not directly accessible via application API

### 1.2 plant_card
**Source:** `.ai/db-plan.md` (lines 18-38), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 28-51)

- **Primary Key:** `id` (UUID, DEFAULT gen_random_uuid())
- **Key Fields:**
  - `user_id` (UUID, NOT NULL, FK → `auth.users(id)`, ON DELETE CASCADE)
  - `name` (varchar(50), NOT NULL)
  - `soil` (varchar(200), NULL)
  - `pot` (varchar(200), NULL)
  - `position` (varchar(50), NULL)
  - `difficulty` (difficulty_level ENUM: 'easy', 'medium', 'hard', NULL)
  - `watering_instructions` (varchar(2000), NULL)
  - `repotting_instructions` (varchar(2000), NULL)
  - `propagation_instructions` (varchar(2000), NULL)
  - `notes` (varchar(2000), NULL)
  - `icon_key` (varchar(50), NULL)
  - `color_hex` (varchar(7), NULL, CHECK: `^#[0-9A-Fa-f]{6}$`)
  - `last_watered_at` (timestamptz, NULL)
  - `last_fertilized_at` (timestamptz, NULL)
  - `next_watering_at` (timestamptz, NULL)
  - `next_fertilizing_at` (timestamptz, NULL)
  - `next_care_at` (timestamptz, GENERATED: earliest of `next_watering_at`/`next_fertilizing_at`)
  - `created_at` (timestamptz, NOT NULL, DEFAULT now())
  - `updated_at` (timestamptz, NOT NULL, DEFAULT now())
- **Relationships:**
  - N:1 with `users` (via `user_id`)
  - 1:N with `disease_entry` (via `plant_card_id`)
  - 1:N with `seasonal_schedule` (via `plant_card_id`)
  - 1:N with `care_log` (via `plant_card_id`)
- **Indexes:**
  - `idx_plant_card_user_id` on (`user_id`)
  - `idx_plant_card_next_care_at_name` on (`next_care_at`, `name`)
  - `idx_plant_card_name` on (`name`)
  - `idx_plant_card_next_watering_at` on (`next_watering_at`)
  - `idx_plant_card_next_fertilizing_at` on (`next_fertilizing_at`)

### 1.3 disease_entry
**Source:** `.ai/db-plan.md` (lines 40-47), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 59-67)

- **Primary Key:** `id` (UUID, DEFAULT gen_random_uuid())
- **Key Fields:**
  - `plant_card_id` (UUID, NOT NULL, FK → `plant_card(id)`, ON DELETE CASCADE)
  - `name` (varchar(50), NOT NULL)
  - `symptoms` (varchar(2000), NULL)
  - `advice` (varchar(2000), NULL)
  - `created_at` (timestamptz, NOT NULL, DEFAULT now())
  - `updated_at` (timestamptz, NOT NULL, DEFAULT now())
- **Relationships:**
  - N:1 with `plant_card` (via `plant_card_id`)
- **Indexes:**
  - `idx_disease_entry_plant_card_id` on (`plant_card_id`)

### 1.4 seasonal_schedule
**Source:** `.ai/db-plan.md` (lines 49-57), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 76-86)

- **Primary Key:** `id` (UUID, DEFAULT gen_random_uuid())
- **Key Fields:**
  - `plant_card_id` (UUID, NOT NULL, FK → `plant_card(id)`, ON DELETE CASCADE)
  - `season` (season ENUM: 'spring', 'summer', 'autumn', 'winter', NOT NULL)
  - `watering_interval` (smallint, NOT NULL, CHECK: 0-365 days)
  - `fertilizing_interval` (smallint, NOT NULL, CHECK: 0-365 days, 0 = disabled)
  - `created_at` (timestamptz, NOT NULL, DEFAULT now())
  - `updated_at` (timestamptz, NOT NULL, DEFAULT now())
- **Relationships:**
  - N:1 with `plant_card` (via `plant_card_id`)
- **Constraints:**
  - UNIQUE (`plant_card_id`, `season`)
- **Indexes:**
  - `idx_seasonal_schedule_plant_card_id` on (`plant_card_id`)

### 1.5 care_log
**Source:** `.ai/db-plan.md` (lines 59-66), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 95-104)

- **Primary Key:** `id` (UUID, DEFAULT gen_random_uuid())
- **Key Fields:**
  - `plant_card_id` (UUID, NOT NULL, FK → `plant_card(id)`, ON DELETE CASCADE)
  - `action_type` (care_action_type ENUM: 'watering', 'fertilizing', NOT NULL)
  - `performed_at` (date, NOT NULL, CHECK: `performed_at <= CURRENT_DATE`)
  - `created_at` (timestamptz, NOT NULL, DEFAULT now())
  - `updated_at` (timestamptz, NOT NULL, DEFAULT now())
- **Relationships:**
  - N:1 with `plant_card` (via `plant_card_id`)
- **Indexes:**
  - `idx_care_log_plant_card_id_performed_at` on (`plant_card_id`, `performed_at`)
  - `idx_care_log_plant_card_id_action_type_performed_at` on (`plant_card_id`, `action_type`, `performed_at`)

---

## 2. Key PRD Features

### 2.1 Authentication and Access
**Source:** `.ai/prd.md` Section 3.1 (lines 14-20), User Stories US-001 through US-006

- **US-001:** Email/password registration
- **US-002:** Email/password login
- **US-003:** Google OAuth login
- **US-004:** Password recovery
- **US-005:** Profile editing (password and nickname)
- **US-006:** Access control (authenticated-only access)

### 2.2 Plant Card CRUD Operations
**Source:** `.ai/prd.md` Section 3.2 (lines 22-34), User Stories US-007 through US-017

- **US-007:** Empty state handling
- **US-008:** Create plant card with full data
- **US-009:** Create plant card with minimal data
- **US-010:** Numeric field validation
- **US-011:** Icon and color selection
- **US-012:** Add disease entry to plant card
- **US-013:** Remove disease entry from plant card
- **US-014:** Edit plant card
- **US-015:** Cancel plant card editing
- **US-016:** Delete plant card (with confirmation)
- **US-017:** Cancel plant card deletion

### 2.3 Care Scheduling
**Source:** `.ai/prd.md` Section 3.3 (lines 36-41), User Stories US-024 through US-030

- **US-024:** Set watering frequency per season
- **US-025:** Set fertilizing frequency per season (0 = disabled)
- **US-026:** Mark watering as performed today
- **US-027:** Mark fertilizing as performed today
- **US-028:** Backdate watering (modal with date picker)
- **US-029:** Backdate fertilizing (modal with date picker)
- **US-030:** Season change logic (new interval applies after first action in new season)

### 2.4 Dashboard and Plant List
**Source:** `.ai/prd.md` Section 3.4 (lines 43-48), User Stories US-018 through US-023, US-031, US-035

- **US-018:** View plant list
- **US-019:** Sort by priority then alphabetically
- **US-020:** Color-coded status indicators (red: overdue, orange: today)
- **US-021:** Text search within private collection
- **US-022:** Pagination (max 20 items per page)
- **US-023:** Plant card detail view
- **US-031:** "Requires Attention" section preview
- **US-035:** Empty search results handling

### 2.5 Care Logging
**Source:** `.ai/prd.md` Section 3.3 (lines 36-41), User Stories US-026 through US-029

- Logging watering and fertilizing actions
- Historical tracking of care activities
- Date-based queries for care history

---

## 3. Endpoint Design Candidates and Justifications

### 3.1 Authentication Endpoints

#### Feature: User Registration (US-001)
**Candidate A: RESTful POST /api/auth/signup**
```
POST /api/auth/signup
Body: { email: string, password: string }
Response: { user: User, session: Session }
```

**Candidate B: Supabase Auth SDK (Client-side)**
```
supabase.auth.signUp({ email, password })
```

**Chosen: Candidate B**  
**Justification:** 
- PRD Section 3.1 indicates authentication via Supabase Auth (`.ai/tech-stack.md` line 12)
- Supabase provides built-in email validation, password hashing, and session management
- Reduces API surface area and maintenance burden
- Aligns with tech stack decision to use Supabase as BaaS

#### Feature: User Login (US-002, US-003)
**Candidate A: RESTful POST /api/auth/login**
```
POST /api/auth/login
Body: { email: string, password: string } | { provider: 'google' }
Response: { user: User, session: Session }
```

**Candidate B: Supabase Auth SDK (Client-side)**
```
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signInWithOAuth({ provider: 'google' })
```

**Chosen: Candidate B**  
**Justification:**
- Consistent with registration approach
- Supabase handles OAuth flow for Google login (US-003)
- Session management handled automatically
- PRD Section 3.1 requires Google OAuth support

#### Feature: Password Recovery (US-004)
**Candidate A: RESTful POST /api/auth/recover**
```
POST /api/auth/recover
Body: { email: string }
Response: { message: string }
```

**Candidate B: Supabase Auth SDK**
```
supabase.auth.resetPasswordForEmail(email)
```

**Chosen: Candidate B**  
**Justification:**
- Supabase provides email sending infrastructure
- Consistent with other auth operations
- Reduces custom email template maintenance

#### Feature: Profile Update (US-005)
**Candidate A: RESTful PATCH /api/user/profile**
```
PATCH /api/user/profile
Body: { password?: string, nickname?: string, currentPassword: string }
Response: { user: User }
```

**Candidate B: Supabase Auth SDK + Custom Endpoint**
```
supabase.auth.updateUser({ password })
POST /api/user/profile { nickname: string }
```

**Chosen: Candidate B**  
**Justification:**
- Password changes handled by Supabase Auth
- Nickname requires custom user metadata or separate table
- Separation of concerns: auth vs. profile data

---

### 3.2 Plant Card CRUD Endpoints

#### Feature: Create Plant Card (US-008, US-009)
**Candidate A: Single Endpoint with Nested Objects**
```
POST /api/plants
Body: {
  name: string,
  soil?: string,
  pot?: string,
  position?: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  watering_instructions?: string,
  repotting_instructions?: string,
  propagation_instructions?: string,
  notes?: string,
  icon_key?: string,
  color_hex?: string,
  diseases?: Array<{ name: string, symptoms?: string, advice?: string }>,
  schedules?: Array<{ season: string, watering_interval: number, fertilizing_interval: number }>
}
Response: { plant: PlantCard }
```

**Candidate B: Separate Endpoints for Related Entities**
```
POST /api/plants
Body: { name, soil, pot, ... } // plant_card fields only
Response: { plant: PlantCard }

POST /api/plants/:id/diseases
Body: { name, symptoms, advice }

POST /api/plants/:id/schedules
Body: { season, watering_interval, fertilizing_interval }
```

**Chosen: Candidate A**  
**Justification:**
- PRD Section 3.2 (lines 24-32) indicates plant card creation includes diseases and schedules
- US-008 requires full data entry in single form
- Reduces round trips and improves UX
- Database schema supports transactional creation (`.ai/db-plan.md` lines 18-38)
- Frontend can create complete plant card in one operation

#### Feature: Get Plant List (US-018, US-019, US-021, US-022)
**Candidate A: Single Endpoint with Query Parameters**
```
GET /api/plants?page=1&limit=20&search=monstera&needs_attention=?
Response: {
  plants: PlantCard[],
  pagination: { page: number, limit: number, total: number, totalPages: number }
}
```

**Candidate B: Separate Endpoints for Dashboard Sections**
```
GET /api/plants/requires-attention
GET /api/plants?page=1&limit=20&search=monstera
```

**Chosen: Candidate B**  
**Justification:**
- PRD Section 3.4 (lines 44-45) specifies two distinct sections: "Requires Attention" and "All My Plants"
- US-031 requires "Requires Attention" section as separate view
- Search (US-021) applies to "All My Plants" section only, not "Requires Attention"
- Database index `idx_plant_card_next_care_at_name` supports sorting by najbliższy termin opieki (`.ai/db-plan.md` line 76)
- Separate endpoints allow independent loading and better UX
- Pagination applies to "All My Plants" only (US-022: max 20 items)

#### Feature: Get Single Plant Card (US-023)
**Candidate A: Single Endpoint with Related Data**
```
GET /api/plants/:id
Response: {
  plant: PlantCard,
  diseases: DiseaseEntry[],
  schedules: SeasonalSchedule[],
  careHistory: CareLog[]
}
```

**Candidate B: Separate Endpoints**
```
GET /api/plants/:id
GET /api/plants/:id/diseases
GET /api/plants/:id/schedules
GET /api/plants/:id/care-history
```

**Chosen: Candidate A**  
**Justification:**
- PRD Section 3.4 (line 247) requires detail view showing "all card fields, schedule, and last actions"
- US-023 requires complete plant information in one view
- Reduces client-side data fetching complexity
- Database relationships support efficient JOIN queries
- Single request improves performance and UX

#### Feature: Update Plant Card (US-014)
**Candidate A: PATCH with Partial Updates**
```
PATCH /api/plants/:id
Body: { name?: string, soil?: string, ... } // partial update
Response: { plant: PlantCard }
```

**Candidate B: PUT with Full Replacement**
```
PUT /api/plants/:id
Body: { name, soil, pot, ... } // all fields required
Response: { plant: PlantCard }
```

**Chosen: Candidate A**  
**Justification:**
- PRD Section 3.2 (line 177) allows editing "all card fields"
- US-014 allows changing any field without requiring all fields
- PATCH aligns with RESTful partial update semantics
- More flexible for frontend form handling
- Database schema supports nullable fields (`.ai/db-plan.md` lines 22-30)

#### Feature: Delete Plant Card (US-016)
**Candidate A: DELETE Endpoint**
```
DELETE /api/plants/:id
Response: { success: boolean }
```

**Candidate B: Soft Delete with Status Flag**
```
PATCH /api/plants/:id
Body: { deleted: true }
```

**Chosen: Candidate A**  
**Justification:**
- Database schema uses `ON DELETE CASCADE` (`.ai/db-plan.md` line 20)
- PRD Section 3.2 (line 193) requires plant to "disappear from list" after deletion
- US-016 indicates permanent removal after confirmation
- Cascade deletion handles related entities (diseases, schedules, care_log)
- Simpler data model without soft-delete complexity

---

### 3.3 Care Scheduling Endpoints

#### Feature: Create/Update Seasonal Schedule (US-024, US-025)
**Candidate A: Upsert Endpoint**
```
POST /api/plants/:id/schedules
Body: {
  season: 'spring' | 'summer' | 'autumn' | 'winter',
  watering_interval: number,
  fertilizing_interval: number
}
Response: { schedule: SeasonalSchedule }
```

**Candidate B: Bulk Update Endpoint**
```
PUT /api/plants/:id/schedules
Body: {
  schedules: Array<{ season, watering_interval, fertilizing_interval }>
}
Response: { schedules: SeasonalSchedule[] }
```

**Chosen: Candidate A**  
**Justification:**
- Database constraint UNIQUE (`plant_card_id`, `season`) (`.ai/db-plan.md` line 57) supports upsert pattern
- PRD Section 3.3 (line 37) allows setting frequencies "separately for seasons"
- Frontend can update one season at a time
- Simpler API surface
- Database handles uniqueness constraint

#### Feature: Log Care Action (US-026, US-027, US-028, US-029)
**Candidate A: Single Endpoint with Action Type**
```
POST /api/plants/:id/care-log
Body: {
  action_type: 'watering' | 'fertilizing',
  performed_at: string // ISO date, can be backdated
}
Response: {
  careLog: CareLog,
  plant: PlantCard // updated with last_* and next_* timestamps
}
```

**Candidate B: Separate Endpoints per Action**
```
POST /api/plants/:id/water
POST /api/plants/:id/fertilize
Body: { performed_at?: string } // optional, defaults to today
```

**Chosen: Candidate A**  
**Justification:**
- Database schema has single `care_log` table with `action_type` enum (`.ai/db-plan.md` lines 59-66)
- PRD Section 3.3 (lines 39-40) requires same backdating logic for both actions
- US-028 and US-029 have identical requirements (modal with date picker)
- Single endpoint reduces code duplication
- Database constraint `performed_at <= CURRENT_DATE` (`.ai/db-plan.md` line 66) prevents future dates
- Response includes updated plant card with recalculated `next_*` timestamps (PRD Section 3.3 line 39)

---

### 3.4 Dashboard Endpoints

#### Feature: Get Dashboard Data (US-031, US-018)
**Candidate A: Single Dashboard Endpoint**
```
GET /api/dashboard
Response: {
  requiresAttention: PlantCard[],
  allPlants: {
    plants: PlantCard[],
    pagination: { page: number, limit: number, total: number }
  }
}
```

**Candidate B: Separate Endpoints**
```
GET /api/plants/requires-attention
GET /api/plants?page=1&limit=20
```

**Chosen: Candidate B**  
**Justification:**
- PRD Section 3.4 (lines 44-45) defines two distinct sections
- US-031 requires "Requires Attention" section as separate view
- Frontend may load sections independently (lazy loading)
- Search (US-021) applies to "All Plants" section, not "Requires Attention"
- Database index `idx_plant_card_next_care_at_name` wspiera sortowanie po najbliższym terminie opieki (`.ai/db-plan.md` line 76)
- More flexible for future dashboard enhancements

---

## 4. Security and Performance Requirements

### 4.1 Security Requirements

#### Row-Level Security (RLS)
**Source:** `.ai/db-plan.md` Section 4 (lines 85-94), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 145-387), `supabase/migrations/20260126140100_disable_rls_policies.sql`

- **Requirement:** All application tables (`plant_card`, `disease_entry`, `seasonal_schedule`, `care_log`) must have RLS enabled
- **Policy:** Users can only access their own data via `user_id = auth.uid()`
- **Implementation:** 
  - RLS is enabled on all tables but policies are currently disabled (see `20260126140100_disable_rls_policies.sql`)
  - **Note:** RLS policies should be re-enabled for production per `.ai/db-plan.md` Section 4
  - When enabled, RLS policies enforce `user_id = auth.uid()` for `plant_card`
  - Related entities check ownership via EXISTS subquery on `plant_card`
  - All CRUD operations (SELECT, INSERT, UPDATE, DELETE) protected

#### Authentication Requirements
**Source:** `.ai/prd.md` Section 3.1 (lines 14-20), US-006

- **Requirement:** All API endpoints require authenticated session
- **Implementation:** Supabase Auth middleware validates JWT tokens
- **Access Control:** Unauthenticated users redirected to landing page (US-006)

#### Input Validation
**Source:** `.ai/prd.md` Section 3.2 (lines 25-30), `.ai/db-plan.md` (lines 18-38)

- **Requirement:** Validate field lengths, types, and constraints
- **Fields:**
  - `name`: max 50 characters (PRD line 25, schema line 31)
  - Text fields: max 2000 characters (PRD line 30, schema lines 36-39)
  - `color_hex`: regex `^#[0-9A-Fa-f]{6}$` (schema line 41)
  - `next_care_at`: wyliczane z `next_*_at` (schema line 42)
  - `watering_interval`, `fertilizing_interval`: 0-365 days (schema lines 80-81)
  - `performed_at`: cannot be future date (schema line 103)

#### Data Ownership Validation
**Source:** `.ai/prd.md` US-036

- **Requirement:** Users cannot access other users' plant cards
- **Implementation:** RLS policies + API-level validation of `plant_card_id` ownership

### 4.2 Performance Requirements

#### Database Indexes
**Source:** `.ai/db-plan.md` Section 3 (lines 74-83), `supabase/migrations/20260126140000_create_plant_schema.sql` (lines 110-139)

- **User Plant Lookup:** `idx_plant_card_user_id` for fetching user's plants
- **Dashboard Sorting:** `idx_plant_card_next_care_at_name` for earliest-care + alphabetical sort
- **Search:** `idx_plant_card_name` for text search by name
- **Due Date Queries:** 
  - `idx_plant_card_next_watering_at` for finding plants due for watering
  - `idx_plant_card_next_fertilizing_at` for finding plants due for fertilizing
- **Care History:** 
  - `idx_care_log_plant_card_id_performed_at` for chronological history
  - `idx_care_log_plant_card_id_action_type_performed_at` for filtered history

#### Pagination
**Source:** `.ai/prd.md` Section 3.4 (line 47), US-022

- **Requirement:** Maximum 20 items per page
- **Implementation:** Limit query results, return pagination metadata
- **Performance Impact:** Prevents loading large datasets, reduces memory usage

#### Precomputed Timestamps
**Source:** `.ai/db-plan.md` lines 45-48, 97

- **Requirement:** `last_watered_at`, `last_fertilized_at`, `next_watering_at`, `next_fertilizing_at` stored in `plant_card` table
- **Justification:** Enables fast dashboard queries without JOINs or calculations
- **Maintenance:** Updated when care actions are logged (PRD Section 3.3 line 39)

#### Query Optimization
- Use database indexes for filtering and sorting
- Avoid N+1 queries: fetch related entities (diseases, schedules) in single query
- Limit fields returned: use SELECT specific columns, not `SELECT *`

---

## 5. PRD Logic Mapping to API Endpoints

### 5.1 Priorytet opieki (wyliczany)
**Source:** `.ai/prd.md` Section 3.4 (lines 46, 222-224), US-020, US-031

**Logic:**
- `priority = 0`: Urgent (overdue, red indicator)
- `priority = 1`: Warning (due today, orange indicator)
- `priority = 2`: OK (future dates, no special indicator)

**Calculation:**
- Compare `next_watering_at` and `next_fertilizing_at` with current date
- Set priority based on earliest due date (or OK when both missing)
- Update priority when care actions are logged

**API Endpoint:** 
- Calculated server-side when fetching plant list
- Updated via `POST /api/plants/:id/care-log` response

### 5.2 Search and Filter Logic
**Source:** `.ai/prd.md` Section 3.4 (line 48), US-021, US-035

**Logic:**
- Text search filters by `name` field (case-insensitive)
- Search applies to "All My Plants" section only
- Empty results show empty state message

**API Endpoint:**
```
GET /api/plants?search=monstera&page=1&limit=20
```
- Uses `idx_plant_card_name` index for performance
- Filters by `user_id` (RLS) + `name ILIKE '%search%'`

### 5.3 Dashboard Sections
**Source:** `.ai/prd.md` Section 3.4 (lines 44-45), US-031

**"Requires Attention" Section:**
- Plants with earliest `next_*_at` ≤ today (end of day UTC)
- Sorted by priority ASC (derived from `next_*_at`), then `name` ASC
- No pagination (typically small set)

**API Endpoint:**
```
GET /api/plants/requires-attention
Query: earliest `next_*_at` ≤ today
Order: priority ASC, name ASC
```

**"All My Plants" Section:**
- All user's plants
- Sorted by priority ASC, then `name` ASC
- Paginated (max 20 per page)
- Supports search filter

**API Endpoint:**
```
GET /api/plants?page=1&limit=20&search=?
Order: priority ASC, name ASC
```

### 5.4 Care Schedule Calculation Logic
**Source:** `.ai/prd.md` Section 3.3 (lines 38-41), US-030

**Logic:**
- Next care date = `last_*_at` + `watering_interval`/`fertilizing_interval` from current season's schedule
- Season determined by current date
- When season changes, new interval applies after first care action in new season
- Interval of 0 disables fertilizing for that season

**API Endpoint:**
- Calculation performed server-side in `POST /api/plants/:id/care-log`
- Updates `next_watering_at` or `next_fertilizing_at` based on:
  - Current season from `seasonal_schedule`
  - `performed_at` date from request
  - Interval from matching season schedule

### 5.5 Date Format Logic
**Source:** `.ai/prd.md` Section 3.2 (line 33), US-023

**Logic:**
- Display format: DD.MM.RRRR (e.g., "26.01.2026")
- API accepts ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
- Frontend handles format conversion

**API Endpoint:**
- All date fields accept ISO 8601 strings
- Response includes ISO 8601 dates
- Frontend converts to DD.MM.RRRR for display

---

## 6. Validation Rules

### 6.1 Plant Card Validation
**Source:** `.ai/db-plan.md` (lines 18-38), `.ai/prd.md` Section 3.2 (lines 24-32)

| Field | Type | Required | Max Length | Validation Rules |
|-------|------|----------|------------|------------------|
| `name` | string | Yes | 50 | Not empty, trimmed |
| `soil` | string | No | 200 | - |
| `pot` | string | No | 200 | - |
| `position` | string | No | 50 | - |
| `difficulty` | enum | No | - | 'easy', 'medium', 'hard' |
| `watering_instructions` | string | No | 2000 | - |
| `repotting_instructions` | string | No | 2000 | - |
| `propagation_instructions` | string | No | 2000 | - |
| `notes` | string | No | 2000 | - |
| `icon_key` | string | No | 50 | - |
| `color_hex` | string | No | 7 | Regex: `^#[0-9A-Fa-f]{6}$` |
| `next_care_at` | timestamptz | No | - | Generated from earliest `next_*_at` |

### 6.2 Disease Entry Validation
**Source:** `.ai/db-plan.md` (lines 40-47), `.ai/prd.md` Section 3.2 (line 31)

| Field | Type | Required | Max Length | Validation Rules |
|-------|------|----------|------------|------------------|
| `name` | string | Yes | 50 | Not empty, trimmed |
| `symptoms` | string | No | 2000 | - |
| `advice` | string | No | 2000 | - |
| `plant_card_id` | UUID | Yes | - | Must exist, user must own plant |

### 6.3 Seasonal Schedule Validation
**Source:** `.ai/db-plan.md` (lines 49-57), `.ai/prd.md` Section 3.3 (lines 37-38), US-024, US-025

| Field | Type | Required | Range | Validation Rules |
|-------|------|----------|-------|------------------|
| `season` | enum | Yes | - | 'spring', 'summer', 'autumn', 'winter' |
| `watering_interval` | number | Yes | 0-365 | Integer, days |
| `fertilizing_interval` | number | Yes | 0-365 | Integer, days (0 = disabled) |
| `plant_card_id` | UUID | Yes | - | Must exist, user must own plant |
| **Constraint** | - | - | - | Unique (`plant_card_id`, `season`) |

### 6.4 Care Log Validation
**Source:** `.ai/db-plan.md` (lines 59-66), `.ai/prd.md` Section 3.3 (lines 39-40), US-028, US-029

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `action_type` | enum | Yes | 'watering', 'fertilizing' |
| `performed_at` | date | Yes | ISO 8601 date, `<= CURRENT_DATE` (no future dates) |
| `plant_card_id` | UUID | Yes | Must exist, user must own plant |

**Business Rules:**
- If `fertilizing_interval = 0` for current season, fertilizing action should be rejected (US-027)
- Backdating allowed via modal (US-028, US-029)
- Date cannot be in the future (database constraint)

### 6.5 Numeric Field Validation
**Source:** `.ai/prd.md` Section 3.2 (line 33), US-010

**Rule:** Numeric fields (`watering_interval`, `fertilizing_interval`) accept only digits
- Reject non-numeric characters
- Reject pasted invalid values
- Show toast error on validation failure

### 6.6 Authentication Validation
**Source:** `.ai/prd.md` Section 3.1 (lines 15-18), US-001, US-002

**Email:**
- Valid email format
- Required field

**Password:**
- Minimum length (Supabase default: 6 characters)
- Required field

**Session:**
- JWT token must be valid
- Token must not be expired
- User must be authenticated for all plant-related endpoints

---

## Summary

This API analysis document provides a comprehensive overview of:

1. **Database entities** with relationships and indexes, cited from `.ai/db-plan.md`
2. **PRD features** mapped to user stories from `.ai/prd.md`
3. **Endpoint designs** with candidate comparisons and justifications based on PRD requirements and database schema
4. **Security requirements** including RLS policies, authentication, and input validation
5. **Performance requirements** leveraging database indexes, pagination, and precomputed fields
6. **PRD logic mapping** showing how business rules translate to API behavior
7. **Validation rules** extracted from schema constraints and PRD specifications

All design decisions are justified by citations to the PRD, database plan, and schema migrations, ensuring alignment between requirements and implementation.
