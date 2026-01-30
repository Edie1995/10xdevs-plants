# API Endpoint Implementation Plan: GET /api/dashboard

## 1. Przegląd punktu końcowego

Endpoint `GET /api/dashboard` dostarcza **pojedynczy payload** do widoku startowego/dashboardu: listę roślin wymagających uwagi, paginowaną listę wszystkich roślin oraz statystyki (łączna liczba, liczba „urgent” i „warning”).

### Kluczowe funkcjonalności
- Zwraca jeden obiekt `DashboardDto` w spójnym envelope `ApiResponseDto<T>`.
- Obsługuje wyszukiwanie (`search`) ograniczone do roślin użytkownika.
- Zwraca **paginowaną** listę `all_plants` (max 20 / strona).
- Zwraca listę `requires_attention` (rośliny z najbliższą datą care \(watering/fertilizing\) **≤ dziś**).
- Wylicza `stats` na podstawie `status_priority` (0 = urgent, 1 = warning, 2 = ok).

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/dashboard`
- **Auth:** wymagany (docelowo Supabase Auth). W obecnym stanie projektu część endpointów używa `DEFAULT_USER_ID` jako obejścia na etapie developmentu.

### Parametry zapytania (Query Parameters)

| Parametr | Typ | Wymagany | Domyślna wartość | Ograniczenia | Opis |
|---|---:|:---:|---:|---|---|
| `page` | number | Nie | 1 | int ≥ 1 | Numer strony dla `all_plants` |
| `limit` | number | Nie | 20 | int 1–20 | Liczba elementów na stronę dla `all_plants` (US-022) |
| `search` | string | Nie | - | trim, rekomendowane max 50 | Częściowe dopasowanie nazwy rośliny (tylko rośliny usera) |
| `sort` | enum | Nie | `priority` | `priority` \| `name` \| `created` | Klucz sortowania dla `all_plants` |
| `direction` | enum | Nie | `asc` | `asc` \| `desc` | Kierunek sortowania dla `all_plants` |

### Przykładowe żądania
```
GET /api/dashboard
GET /api/dashboard?page=2&limit=10
GET /api/dashboard?search=monstera
GET /api/dashboard?sort=name&direction=desc
```

### Walidacja wejścia (Zod)
W handlerze należy użyć schemy podobnej do `plantListQuerySchema` z `src/pages/api/plants.ts`, bez `needs_attention`:
- `page`: `preprocess` do liczby, `int().min(1).default(1)`
- `limit`: `preprocess` do liczby, `int().min(1).max(20).default(20)`
- `search`: `string().trim().optional()` (+ rekomendacja `max(50)` dla ochrony przed DoS przez bardzo długie query)
- `sort`: `enum(["priority","name","created"]).default("priority")`
- `direction`: `enum(["asc","desc"]).default("asc")`

### Wykorzystywane typy (DTO / modele)

**Istniejące typy (z `src/types.ts`):**
- `DashboardQueryDto` — wejściowe parametry query (page/limit/search/sort/direction)
- `DashboardDto` — payload dashboardu:
  - `requires_attention: PlantCardListItemDto[]`
  - `all_plants: PlantCardListItemDto[]`
  - `stats: DashboardStatsDto`
- `DashboardStatsDto` — `{ total_plants, urgent, warning }`
- `PlantCardListItemDto` — element listy roślin (bez `user_id`)
- `ApiResponseDto<T>` + `PaginationDto` + `ApiErrorDto` — standard odpowiedzi API (zgodnie z README)

**Command modele:** brak (endpoint typu `GET`).

**Rekomendowany nowy (wewnętrzny) typ serwisowy (opcjonalnie, lokalnie w serwisie):**
- `DashboardServiceResult`:
  - `dashboard: DashboardDto`
  - `pagination: PaginationDto`

## 3. Szczegóły odpowiedzi

### Sukces (200 OK)
Odpowiedź w envelope `ApiResponseDto<DashboardDto>`. Pole `pagination` dotyczy listy `all_plants`.

Przykład:
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

### Brak dopasowań (200 OK)
Zgodnie ze specyfikacją, gdy `search` nie zwróci wyników: endpoint ma zwrócić **puste tablice** i statystyki `0` (UI pokaże guidance).

```json
{
  "success": true,
  "data": {
    "requires_attention": [],
    "all_plants": [],
    "stats": { "total_plants": 0, "urgent": 0, "warning": 0 }
  },
  "error": null,
  "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 }
}
```

### Błąd walidacji (400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Invalid query parameters.",
    "details": { "fieldErrors": { "limit": ["Number must be less than or equal to 20"] } }
  }
}
```

### Brak autoryzacji (401 Unauthorized)
```json
{
  "success": false,
  "data": null,
  "error": { "code": "unauthorized", "message": "Authentication required." }
}
```

### Błąd serwera (500 Internal Server Error)
```json
{
  "success": false,
  "data": null,
  "error": { "code": "server_error", "message": "Unexpected server error." }
}
```

## 4. Przepływ danych

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  HTTP Request        │────▶│  API Handler          │────▶│  Zod Validation       │
│  GET /api/dashboard  │     │  src/pages/api/       │     │  Query Params         │
└──────────────────────┘     │  dashboard.ts         │     └──────────┬───────────┘
                             └──────────────────────┘                │
                                                                       ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  HTTP Response        │◀────│  Response formatting  │◀────│  Dashboard Service    │
│  ApiResponseDto JSON  │     │  ApiResponseDto<T>    │     │  src/lib/services/    │
└──────────────────────┘     └──────────────────────┘     │  dashboard.service.ts │
                                                           └──────────┬───────────┘
                                                                      ▼
                                                             ┌──────────────────┐
                                                             │  Supabase (DB)    │
                                                             │  plant_card       │
                                                             └──────────────────┘
```

### Szczegółowy przebieg
1. Handler pobiera `url.searchParams` i waliduje je Zod-em.
2. Ustala `userId`:
   - docelowo: z sesji Supabase (Supabase Auth),
   - tymczasowo (zgodnie z istniejącym kodem): `DEFAULT_USER_ID`.
3. Wywołuje serwis `getDashboard(locals.supabase, userId, queryDto)`.
4. Serwis buduje wspólne filtry (`user_id`, `search`) i wykonuje zapytania:
   - `all_plants`: select + count + sort + range (paginacja),
   - `requires_attention`: select (limitowane), tylko rekordy z „next due date ≤ dziś”,
   - `stats`: liczniki (total/urgent/warning) na tym samym filtrze.
5. Handler zwraca `200` z `ApiResponseDto<DashboardDto>` oraz `pagination` dla `all_plants`.

## 5. Względy bezpieczeństwa

### Uwierzytelnianie
- Endpoint powinien wymagać zalogowanego użytkownika (401 gdy brak sesji).
- Obecnie w repo istnieje obejście `DEFAULT_USER_ID`; plan wdrożenia powinien uwzględniać szybkie przełączenie na realny user z Supabase Auth.

### Autoryzacja / izolacja danych
- Wszystkie zapytania muszą być filtrowane po `plant_card.user_id = userId`.
- Docelowo włączyć RLS i polityki `user_id = auth.uid()`. Aktualnie w repo znajduje się migracja wyłączająca RLS (`supabase/migrations/...disable_rls.sql`), więc autoryzacja aplikacyjna jest krytyczna.

### Potencjalne zagrożenia i mitigacje
- **IDOR / data leakage**: brak filtra `user_id` ⇒ ujawnienie cudzych roślin. Mitigacja: zawsze `.eq("user_id", userId)` + selekcja tylko wymaganych kolumn.
- **DoS przez paginację**: duże `limit`. Mitigacja: walidacja `limit ≤ 20`.
- **DoS przez search**: bardzo długie `search`. Mitigacja: `max(50)` i `trim()`.
- **Błędy logowania**: nie logować tokenów/cookies; logować `request_id`, `user_id` (jeśli nie wrażliwe w danym środowisku), oraz parametry query w postaci bezpiecznej.

## 6. Obsługa błędów

### Scenariusze błędów i kody statusu
| Scenariusz | Kod HTTP | Kod błędu | Uwagi |
|---|---:|---|---|
| Niepoprawne query (np. `limit=100`) | 400 | `validation_error` | `details` = `zodError.flatten()` |
| Brak sesji / brak userId | 401 | `unauthorized` | „Authentication required.” |
| Błąd Supabase/DB (nieoczekiwany) | 500 | `server_error` | Logować `console.error` z kontekstem |

> Uwaga dot. mapowania błędów Supabase: jeśli w przyszłości RLS będzie włączony, Supabase może zwracać `403/42501`. Dla tego endpointu (bez zasobu ID) rekomendacja: mapować ten przypadek na `401 unauthorized` (zgodnie z wymaganym zestawem statusów).

### Logowanie
- Logować tylko błędy 500 jako `console.error` z obiektem kontekstu:
  - `route`, `request_id`, `user_id`, zvalidowane `query` (bez danych wrażliwych), `error`.
- Błędy 400/401 mogą być logowane na `debug` (opcjonalnie) lub pomijane dla redukcji szumu.
- Brak dedykowanej tabeli do logów błędów w dostarczonych zasobach DB — logowanie realizować aplikacyjnie (na tym etapie).

## 7. Wydajność

### Charakterystyka zapytań
Minimalny zestaw przy pełnych danych:
- 1 zapytanie listujące `all_plants` z `count: "exact"` (dla paginacji i `total_plants`)
- 1 zapytanie `requires_attention` (limitowane, bez `count`)
- 2 zapytania count (head) dla `urgent` i `warning` (jeśli nie da się uzyskać efektywnie w jednym zapytaniu)

Wszystkie zapytania powinny wybierać tylko kolumny wymagane przez `PlantCardListItemDto`.

### Indeksy (rekomendacje)
- `plant_card(user_id)`
- `plant_card(user_id, status_priority, name)` (dashboard sort domyślny)
- `plant_card(user_id, name)` (sort + search)
- `plant_card(user_id, next_watering_at)` i `plant_card(user_id, next_fertilizing_at)` (requires_attention)

### Spójność logiki „≤ dziś”
`status_priority` jest liczone po dacie (UTC date-only). Żeby `requires_attention` uwzględniało także rekordy „na dziś” niezależnie od godziny, porównanie powinno być wykonywane względem **końca dnia UTC** (np. `23:59:59.999Z`) albo na poziomie bazy przez porównanie po `::date`.

## 8. Kroki implementacji

1. **Utworzyć endpoint**
   - Plik: `src/pages/api/dashboard.ts`
   - Dodać `export const prerender = false;`
   - Zaimplementować `GET` zgodnie z konwencją pozostałych endpointów (helpers `jsonResponse`, `errorResponse`, mapowanie błędów).

2. **Dodać Zod schema dla query**
   - W `dashboard.ts` utworzyć `dashboardQuerySchema` analogiczny do `plantListQuerySchema` (bez `needs_attention`), z enforcementem `limit ≤ 20`.
   - Użyć `Object.fromEntries(url.searchParams.entries())` i `safeParse`.

3. **Wyodrębnić logikę do serwisu**
   - Nowy plik: `src/lib/services/dashboard.service.ts`
   - Publiczna funkcja:
     - `getDashboard(supabase: SupabaseClient, userId: string, query: DashboardQueryDto): Promise<{ dashboard: DashboardDto; pagination: PaginationDto }>`
   - Serwis powinien:
     - Zbudować wspólną część query (`.from("plant_card")...eq("user_id", userId)` + opcjonalne `.ilike("name", %search%)`)
     - Zrealizować `all_plants` z `count: "exact"` oraz `range()`
     - Zrealizować `requires_attention`:
       - warunek: `next_watering_at <= todayEndUtc OR next_fertilizing_at <= todayEndUtc`
       - sort: zawsze `status_priority asc`, potem `name asc`
       - limit: stały `20` (rekomendacja) lub `min(20, limit)` dla spójności UX
     - Zrealizować `stats`:
       - `total_plants` = `count` z zapytania `all_plants`
       - `urgent` = count gdzie `status_priority = 0` na wspólnych filtrach
       - `warning` = count gdzie `status_priority = 1` na wspólnych filtrach
     - Zwrócić `DashboardDto` + `PaginationDto`.

4. **Autoryzacja**
   - Tymczasowo: użyć `DEFAULT_USER_ID` (spójnie z istniejącym API), ale:
     - dodać wyraźny komentarz `TODO` na przejście na Supabase Auth,
     - w planie wdrożenia w kodzie zachować możliwość podstawienia `userId` bez zmian w serwisie.

5. **Zwracanie odpowiedzi**
   - Zwrócić `200` z:
     - `data: dashboard`
     - `pagination: pagination` (dla `all_plants`)
   - Dla braku wyników (np. `search` bez dopasowań): nadal `200`, puste listy i statystyki `0`.

6. **Obsługa błędów**
   - `400`: gdy `dashboardQuerySchema.safeParse` nie przejdzie.
   - `401`: gdy brak `userId`.
   - `500`: pozostałe przypadki (log `console.error` z kontekstem).

7. **Test plan (manual)**
   - `curl http://localhost:4321/api/dashboard`
   - `curl "http://localhost:4321/api/dashboard?search=monstera"`
   - `curl "http://localhost:4321/api/dashboard?page=2&limit=5"`
   - `curl "http://localhost:4321/api/dashboard?sort=name&direction=desc"`
   - Walidacja:
     - `curl "http://localhost:4321/api/dashboard?limit=100"` → 400
     - `curl "http://localhost:4321/api/dashboard?page=0"` → 400

8. **(Opcjonalnie) Aktualizacja dokumentacji**
   - Dopisać sekcję w `README.md` (API) opisującą `GET /api/dashboard` i kształt odpowiedzi (envelope + `pagination` dla `all_plants`).

