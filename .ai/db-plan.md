1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

**Typy ENUM**
- `difficulty_level`: `('easy', 'medium', 'hard')`
- `season`: `('spring', 'summer', 'autumn', 'winter')`
- `care_action_type`: `('watering', 'fertilizing')`

**users**

This table is managed by Supabase Auth

- `id` UUID, PRIMARY KEY
- `email` varchar(255), NOT NULL, UNIQUE
- `encrypted_password` varchar, NOT NULL
- `created_at` timestamptz, NOT NULL, DEFAULT now()
- `confirmed_at` timestamptz, NOT NULL, DEFAULT now()

**plant_card**
- `id` uuid, PK, DEFAULT gen_random_uuid()
- `user_id` uuid, NOT NULL, FK -> `auth.users(id)`, ON DELETE CASCADE
- `name` varchar(50), NOT NULL
- `soil` varchar(200), NULL
- `pot` varchar(200), NULL
- `position` varchar(50), NULL
- `difficulty` difficulty_level, NULL
- `watering_instructions` varchar(2000), NULL
- `repotting_instructions` varchar(2000), NULL
- `propagation_instructions` varchar(2000), NULL
- `notes` varchar(2000), NULL
- `icon_key` varchar(50), NULL
- `color_hex` varchar(7), NULL, CHECK (`color_hex` ~ '^#[0-9A-Fa-f]{6}$')
- `status_priority` smallint, NOT NULL, DEFAULT 2, CHECK (`status_priority` >= 0 AND `status_priority` <= 2)
- `last_watered_at` timestamptz, NULL
- `last_fertilized_at` timestamptz, NULL
- `next_watering_at` timestamptz, NULL
- `next_fertilizing_at` timestamptz, NULL
- `created_at` timestamptz, NOT NULL, DEFAULT now()
- `updated_at` timestamptz, NOT NULL, DEFAULT now()

**disease_entry**
- `id` uuid, PK, DEFAULT gen_random_uuid()
- `plant_card_id` uuid, NOT NULL, FK -> `plant_card(id)`, ON DELETE CASCADE
- `name` varchar(50), NOT NULL
- `symptoms` varchar(2000), NULL
- `advice` varchar(2000), NULL
- `created_at` timestamptz, NOT NULL, DEFAULT now()
- `updated_at` timestamptz, NOT NULL, DEFAULT now()

**seasonal_schedule**
- `id` uuid, PK, DEFAULT gen_random_uuid()
- `plant_card_id` uuid, NOT NULL, FK -> `plant_card(id)`, ON DELETE CASCADE
- `season` season, NOT NULL
- `watering_interval` smallint, NOT NULL, CHECK (`watering_interval` >= 0 AND `watering_interval` <= 365)
- `fertilizing_interval` smallint, NOT NULL, CHECK (`fertilizing_interval` >= 0 AND `fertilizing_interval` <= 365)
- `created_at` timestamptz, NOT NULL, DEFAULT now()
- `updated_at` timestamptz, NOT NULL, DEFAULT now()
- UNIQUE (`plant_card_id`, `season`)

**care_log**
- `id` uuid, PK, DEFAULT gen_random_uuid()
- `plant_card_id` uuid, NOT NULL, FK -> `plant_card(id)`, ON DELETE CASCADE
- `action_type` care_action_type, NOT NULL
- `performed_at` date, NOT NULL
- `created_at` timestamptz, NOT NULL, DEFAULT now()
- `updated_at` timestamptz, NOT NULL, DEFAULT now()
- CHECK (`performed_at` <= CURRENT_DATE)

2. Relacje między tabelami
- `users` 1:N `plant_card`
- `plant_card` 1:N `disease_entry`
- `plant_card` 1:N `seasonal_schedule`
- `plant_card` 1:N `care_log`

3. Indeksy
- `plant_card`: INDEX on (`user_id`)
- `plant_card`: INDEX on (`status_priority`, `name`)
- `plant_card`: INDEX on (`name`)
- `plant_card`: INDEX on (`next_watering_at`)
- `plant_card`: INDEX on (`next_fertilizing_at`)
- `disease_entry`: INDEX on (`plant_card_id`)
- `seasonal_schedule`: INDEX on (`plant_card_id`)
- `care_log`: INDEX on (`plant_card_id`, `performed_at`)
- `care_log`: INDEX on (`plant_card_id`, `action_type`, `performed_at`)

4. Zasady PostgreSQL (RLS)
- Włącz RLS na: `plant_card`, `disease_entry`, `seasonal_schedule`, `care_log`.
- `plant_card`:
  - SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`
- `disease_entry`:
  - SELECT/INSERT/UPDATE/DELETE: istnieje `plant_card` z `id = plant_card_id` i `user_id = auth.uid()`
- `seasonal_schedule`:
  - SELECT/INSERT/UPDATE/DELETE: istnieje `plant_card` z `id = plant_card_id` i `user_id = auth.uid()`
- `care_log`:
  - SELECT/INSERT/UPDATE/DELETE: istnieje `plant_card` z `id = plant_card_id` i `user_id = auth.uid()`

5. Dodatkowe uwagi
- `plant_card.last_*` i `plant_card.next_*` przechowują prewyliczone terminy dla szybkich zapytań dashboardu.
- Ograniczenia długości pól tekstowych zgodne z PRD i decyzjami z sesji planowania.
- `seasonal_schedule` pozwala na 0 w `fertilizing_interval` (wyłączenie nawożenia).
