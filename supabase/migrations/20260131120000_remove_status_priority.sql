alter table plant_card
  drop column if exists status_priority;

drop index if exists idx_plant_card_status_priority_name;

alter table plant_card
  add column if not exists next_care_at timestamptz generated always as (
    nullif(
      least(
        coalesce(next_watering_at, 'infinity'::timestamptz),
        coalesce(next_fertilizing_at, 'infinity'::timestamptz)
      ),
      'infinity'::timestamptz
    )
  ) stored;

create index if not exists idx_plant_card_next_care_at_name on plant_card(next_care_at, name);
