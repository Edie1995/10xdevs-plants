-- migration: create_plant_schema
-- purpose: creates the core schema for the plant care application
-- affected tables: plant_card, disease_entry, seasonal_schedule, care_log
-- special considerations: 
--   - uses supabase auth.users for user management
--   - implements comprehensive row level security
--   - creates custom enum types for data validation

-- ============================================================================
-- enum types
-- ============================================================================

-- difficulty level for plant care complexity
create type difficulty_level as enum ('easy', 'medium', 'hard');

-- seasonal periods for scheduling care activities
create type season as enum ('spring', 'summer', 'autumn', 'winter');

-- types of care actions that can be logged
create type care_action_type as enum ('watering', 'fertilizing');

-- ============================================================================
-- plant_card table
-- ============================================================================

-- main table storing individual plant information and care status
-- each card belongs to a user and tracks watering/fertilizing schedules
create table plant_card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null,
  soil varchar(200) null,
  pot varchar(200) null,
  position varchar(50) null,
  difficulty difficulty_level null,
  watering_instructions varchar(2000) null,
  repotting_instructions varchar(2000) null,
  propagation_instructions varchar(2000) null,
  notes varchar(2000) null,
  icon_key varchar(50) null,
  color_hex varchar(7) null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  -- status_priority: 0=urgent, 1=warning, 2=ok
  status_priority smallint not null default 2 check (status_priority >= 0 and status_priority <= 2),
  -- precomputed care timestamps for quick dashboard queries
  last_watered_at timestamptz null,
  last_fertilized_at timestamptz null,
  next_watering_at timestamptz null,
  next_fertilizing_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- disease_entry table
-- ============================================================================

-- tracks diseases and problems observed on plants
-- each entry is associated with a plant card and provides diagnostic information
create table disease_entry (
  id uuid primary key default gen_random_uuid(),
  plant_card_id uuid not null references plant_card(id) on delete cascade,
  name varchar(50) not null,
  symptoms varchar(2000) null,
  advice varchar(2000) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- seasonal_schedule table
-- ============================================================================

-- defines care intervals for each season
-- each plant card can have up to 4 schedules (one per season)
-- intervals are in days; 0 means disabled
create table seasonal_schedule (
  id uuid primary key default gen_random_uuid(),
  plant_card_id uuid not null references plant_card(id) on delete cascade,
  season season not null,
  watering_interval smallint not null check (watering_interval >= 0 and watering_interval <= 365),
  fertilizing_interval smallint not null check (fertilizing_interval >= 0 and fertilizing_interval <= 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ensure only one schedule per season per plant
  unique (plant_card_id, season)
);

-- ============================================================================
-- care_log table
-- ============================================================================

-- historical log of care actions performed on plants
-- used to track watering and fertilizing history
-- performed_at cannot be in the future
create table care_log (
  id uuid primary key default gen_random_uuid(),
  plant_card_id uuid not null references plant_card(id) on delete cascade,
  action_type care_action_type not null,
  performed_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- prevent logging future care actions
  check (performed_at <= current_date)
);

-- ============================================================================
-- indexes for performance optimization
-- ============================================================================

-- plant_card indexes
-- primary lookup by user for fetching user's plants
create index idx_plant_card_user_id on plant_card(user_id);

-- sorting plants by priority and name for dashboard display
create index idx_plant_card_status_priority_name on plant_card(status_priority, name);

-- searching plants by name
create index idx_plant_card_name on plant_card(name);

-- finding plants due for watering
create index idx_plant_card_next_watering_at on plant_card(next_watering_at);

-- finding plants due for fertilizing
create index idx_plant_card_next_fertilizing_at on plant_card(next_fertilizing_at);

-- disease_entry indexes
-- fetching all diseases for a plant card
create index idx_disease_entry_plant_card_id on disease_entry(plant_card_id);

-- seasonal_schedule indexes
-- fetching schedules for a plant card
create index idx_seasonal_schedule_plant_card_id on seasonal_schedule(plant_card_id);

-- care_log indexes
-- fetching care history for a plant card ordered by date
create index idx_care_log_plant_card_id_performed_at on care_log(plant_card_id, performed_at);

-- fetching specific care action history (e.g., all watering events)
create index idx_care_log_plant_card_id_action_type_performed_at on care_log(plant_card_id, action_type, performed_at);

-- ============================================================================
-- row level security (rls) setup
-- ============================================================================

-- enable rls on all application tables
-- this ensures data access is controlled through policies
alter table plant_card enable row level security;
alter table disease_entry enable row level security;
alter table seasonal_schedule enable row level security;
alter table care_log enable row level security;

-- ============================================================================
-- rls policies for plant_card
-- ============================================================================

-- policy: authenticated users can view their own plant cards
create policy "authenticated users can select their own plant cards"
  on plant_card
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: authenticated users can create plant cards for themselves
create policy "authenticated users can insert their own plant cards"
  on plant_card
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: authenticated users can update their own plant cards
create policy "authenticated users can update their own plant cards"
  on plant_card
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: authenticated users can delete their own plant cards
create policy "authenticated users can delete their own plant cards"
  on plant_card
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- rls policies for disease_entry
-- ============================================================================

-- policy: authenticated users can view disease entries for their plants
create policy "authenticated users can select disease entries for their plants"
  on disease_entry
  for select
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = disease_entry.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can create disease entries for their plants
create policy "authenticated users can insert disease entries for their plants"
  on disease_entry
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = disease_entry.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update disease entries for their plants
create policy "authenticated users can update disease entries for their plants"
  on disease_entry
  for update
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = disease_entry.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = disease_entry.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete disease entries for their plants
create policy "authenticated users can delete disease entries for their plants"
  on disease_entry
  for delete
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = disease_entry.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- ============================================================================
-- rls policies for seasonal_schedule
-- ============================================================================

-- policy: authenticated users can view seasonal schedules for their plants
create policy "authenticated users can select seasonal schedules for their plants"
  on seasonal_schedule
  for select
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = seasonal_schedule.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can create seasonal schedules for their plants
create policy "authenticated users can insert seasonal schedules for their plants"
  on seasonal_schedule
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = seasonal_schedule.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update seasonal schedules for their plants
create policy "authenticated users can update seasonal schedules for their plants"
  on seasonal_schedule
  for update
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = seasonal_schedule.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = seasonal_schedule.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete seasonal schedules for their plants
create policy "authenticated users can delete seasonal schedules for their plants"
  on seasonal_schedule
  for delete
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = seasonal_schedule.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- ============================================================================
-- rls policies for care_log
-- ============================================================================

-- policy: authenticated users can view care logs for their plants
create policy "authenticated users can select care logs for their plants"
  on care_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = care_log.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can create care logs for their plants
create policy "authenticated users can insert care logs for their plants"
  on care_log
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = care_log.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update care logs for their plants
create policy "authenticated users can update care logs for their plants"
  on care_log
  for update
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = care_log.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from plant_card
      where plant_card.id = care_log.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete care logs for their plants
create policy "authenticated users can delete care logs for their plants"
  on care_log
  for delete
  to authenticated
  using (
    exists (
      select 1
      from plant_card
      where plant_card.id = care_log.plant_card_id
        and plant_card.user_id = auth.uid()
    )
  );
