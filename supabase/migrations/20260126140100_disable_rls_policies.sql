-- migration: disable_rls_policies
-- purpose: disables all row level security policies on plant application tables
-- affected tables: plant_card, disease_entry, seasonal_schedule, care_log
-- special considerations: 
--   - rls remains enabled on tables but all policies are dropped
--   - this allows for policy redesign or alternative access control

-- ============================================================================
-- drop rls policies for plant_card
-- ============================================================================

-- drop select policy for plant_card
drop policy if exists "authenticated users can select their own plant cards" on plant_card;

-- drop insert policy for plant_card
drop policy if exists "authenticated users can insert their own plant cards" on plant_card;

-- drop update policy for plant_card
drop policy if exists "authenticated users can update their own plant cards" on plant_card;

-- drop delete policy for plant_card
drop policy if exists "authenticated users can delete their own plant cards" on plant_card;

-- ============================================================================
-- drop rls policies for disease_entry
-- ============================================================================

-- drop select policy for disease_entry
drop policy if exists "authenticated users can select disease entries for their plants" on disease_entry;

-- drop insert policy for disease_entry
drop policy if exists "authenticated users can insert disease entries for their plants" on disease_entry;

-- drop update policy for disease_entry
drop policy if exists "authenticated users can update disease entries for their plants" on disease_entry;

-- drop delete policy for disease_entry
drop policy if exists "authenticated users can delete disease entries for their plants" on disease_entry;

-- ============================================================================
-- drop rls policies for seasonal_schedule
-- ============================================================================

-- drop select policy for seasonal_schedule
drop policy if exists "authenticated users can select seasonal schedules for their plants" on seasonal_schedule;

-- drop insert policy for seasonal_schedule
drop policy if exists "authenticated users can insert seasonal schedules for their plants" on seasonal_schedule;

-- drop update policy for seasonal_schedule
drop policy if exists "authenticated users can update seasonal schedules for their plants" on seasonal_schedule;

-- drop delete policy for seasonal_schedule
drop policy if exists "authenticated users can delete seasonal schedules for their plants" on seasonal_schedule;

-- ============================================================================
-- drop rls policies for care_log
-- ============================================================================

-- drop select policy for care_log
drop policy if exists "authenticated users can select care logs for their plants" on care_log;

-- drop insert policy for care_log
drop policy if exists "authenticated users can insert care logs for their plants" on care_log;

-- drop update policy for care_log
drop policy if exists "authenticated users can update care logs for their plants" on care_log;

-- drop delete policy for care_log
drop policy if exists "authenticated users can delete care logs for their plants" on care_log;

-- ============================================================================
-- note: row level security remains enabled on these tables
-- ============================================================================
-- rls is still enabled on plant_card, disease_entry, seasonal_schedule, care_log
-- with no policies defined, authenticated users will have no access to these tables
-- this allows for new policies to be defined in future migrations
