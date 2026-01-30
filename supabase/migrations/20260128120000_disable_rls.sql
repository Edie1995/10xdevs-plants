-- migration: disable_rls
-- purpose: disables row level security on plant application tables
-- affected tables: plant_card, disease_entry, seasonal_schedule, care_log
-- special considerations:
--   - rls is fully disabled for these tables

alter table plant_card disable row level security;
alter table disease_entry disable row level security;
alter table seasonal_schedule disable row level security;
alter table care_log disable row level security;
