# API Endpoint Implementation Plan: GET /api/plants

## 1. Przegląd punktu końcowego

Endpoint `GET /api/plants` służy do pobierania listy roślin należących do uwierzytelnionego użytkownika. Wspiera wyszukiwanie częściowe po nazwie, sortowanie według różnych kryteriów oraz paginację wyników. Dodatkowo umożliwia filtrowanie roślin wymagających uwagi (tych, których termin podlewania lub nawożenia przypada na dziś lub wcześniej).

### Kluczowe funkcjonalności:
- Listowanie roślin z paginacją (max 20 elementów na stronę)
- Wyszukiwanie częściowe po nazwie rośliny
- Sortowanie według priorytetu, nazwy lub daty utworzenia
- Filtrowanie roślin wymagających natychmiastowej uwagi
- Zwracanie metadanych paginacji

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/plants`
- **Parametry zapytania (Query Parameters):**

| Parametr | Typ | Wymagany | Domyślna wartość | Opis |
|----------|-----|----------|------------------|------|
| `page` | number | Nie | 1 | Numer strony (≥ 1) |
| `limit` | number | Nie | 20 | Liczba elementów na stronę (1-20) |
| `search` | string | Nie | - | Częściowe dopasowanie nazwy rośliny |
| `sort` | enum | Nie | `priority` | Kryterium sortowania: `priority`, `name`, `created` |
| `direction` | enum | Nie | `asc` | Kierunek sortowania: `asc`, `desc` |
| `needs_attention` | boolean | Nie | - | Filtruj rośliny wymagające uwagi (next_watering_at ≤ today LUB next_fertilizing_at ≤ today) |

### Przykładowe żądania:
```
GET /api/plants
GET /api/plants?page=2&limit=10
GET /api/plants?search=monstera&sort=name&direction=desc
GET /api/plants?needs_attention=true&sort=priority
```

## 3. Wykorzystywane typy

### Istniejące typy (z `src/types.ts`):

```typescript
// Query DTO - parametry wejściowe
export interface PlantListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "priority" | "name" | "created";
  direction?: "asc" | "desc";
  needs_attention?: boolean;
}

// Response DTO - pojedynczy element listy
export type PlantCardListItemDto = Pick<
  PlantCardPublicDto,
  | "id"
  | "name"
  | "icon_key"
  | "color_hex"
  | "difficulty"
  | "next_watering_at"
  | "next_fertilizing_at"
  | "last_watered_at"
  | "last_fertilized_at"
  | "created_at"
  | "updated_at"
>;

// Pagination DTO
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// API Response envelope
export interface ApiResponseDto<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorDto | null;
  pagination?: PaginationDto;
}
```

### Nowy typ do utworzenia:

```typescript
// Wewnętrzny typ wyniku z serwisu
export interface PlantCardListResult {
  items: PlantCardListItemDto[];
  pagination: PaginationDto;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Monstera Deliciosa",
      "icon_key": "monstera",
      "color_hex": "#2D5A27",
      "difficulty": "medium",
      "next_watering_at": "2026-01-28T10:00:00Z",
      "next_fertilizing_at": "2026-02-15T10:00:00Z",
      "last_watered_at": "2026-01-21T10:00:00Z",
      "last_fertilized_at": "2026-01-01T10:00:00Z",
      "created_at": "2025-12-01T08:00:00Z",
      "updated_at": "2026-01-21T10:00:00Z"
    }
  ],
  "error": null,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Błąd walidacji (400 Bad Request):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Invalid query parameters.",
    "details": {
      "fieldErrors": {
        "page": ["Page must be a positive integer"],
        "limit": ["Limit must be between 1 and 20"]
      }
    }
  }
}
```

### Błąd autoryzacji (401 Unauthorized):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "unauthorized",
    "message": "Authentication required."
  }
}
```

### Błąd serwera (500 Internal Server Error):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "server_error",
    "message": "Unexpected server error."
  }
}
```

## 5. Przepływ danych

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   HTTP Request  │────▶│   API Handler    │────▶│  Zod Validation │
│  GET /api/plants│     │  src/pages/api/  │     │  Query Params   │
└─────────────────┘     │  plants.ts       │     └────────┬────────┘
                        └──────────────────┘              │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  HTTP Response  │◀────│  Response        │◀────│  Plant Card     │
│  JSON + Status  │     │  Formatting      │     │  Service        │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   Supabase      │
                                                 │   plant_card    │
                                                 │   table         │
                                                 └─────────────────┘
```

### Szczegółowy przepływ:

1. **Przyjęcie żądania** - Astro API route otrzymuje żądanie GET
2. **Ekstrakcja parametrów** - Pobranie query params z URL
3. **Walidacja** - Zod schema waliduje i transformuje parametry
4. **Pobranie user ID** - Z context.locals (Supabase auth) lub tymczasowo DEFAULT_USER_ID
5. **Wywołanie serwisu** - `listPlantCards(supabase, userId, queryParams)`
6. **Budowanie zapytania** - Serwis buduje zapytanie Supabase z filtrami, sortowaniem i paginacją
7. **Wykonanie zapytania** - Dwa zapytania: count (total) + select (dane)
8. **Mapowanie wyników** - Transformacja do PlantCardListItemDto (usunięcie user_id)
9. **Formatowanie odpowiedzi** - Opakowanie w ApiResponseDto z paginacją
10. **Zwrot odpowiedzi** - JSON z odpowiednim kodem statusu HTTP

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie
- Endpoint wymaga uwierzytelnienia użytkownika
- JWT token weryfikowany przez Supabase middleware
- Brak tokena = 401 Unauthorized
- Nieprawidłowy token = 401 Unauthorized

### 6.2 Autoryzacja
- Użytkownik może pobierać wyłącznie własne rośliny
- Filtrowanie po `user_id` na poziomie zapytania
- RLS (Row Level Security) jako dodatkowa warstwa ochrony: `user_id = auth.uid()`

### 6.3 Walidacja danych wejściowych
- Wszystkie parametry walidowane przez Zod przed użyciem
- `page` - tylko dodatnie liczby całkowite
- `limit` - ograniczony do 1-20 (zapobieganie nadmiernemu obciążeniu)
- `sort` i `direction` - enum, tylko dozwolone wartości
- `search` - sanityzacja przez Supabase (ilike z automatycznym escape)

### 6.4 Ochrona przed atakami
- **SQL Injection** - Supabase SDK automatycznie parametryzuje zapytania
- **DoS via pagination** - max 20 elementów na stronę
- **Information disclosure** - `user_id` usuwany z odpowiedzi

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Kod błędu | Wiadomość |
|------------|----------|-----------|-----------|
| Brak/nieprawidłowy token | 401 | `unauthorized` | Authentication required. |
| Nieprawidłowy `page` (< 1) | 400 | `validation_error` | Page must be a positive integer. |
| Nieprawidłowy `limit` (< 1 lub > 20) | 400 | `validation_error` | Limit must be between 1 and 20. |
| Nieprawidłowy `sort` | 400 | `validation_error` | Sort must be one of: priority, name, created. |
| Nieprawidłowy `direction` | 400 | `validation_error` | Direction must be asc or desc. |
| Nieprawidłowy `needs_attention` | 400 | `validation_error` | needs_attention must be true or false. |
| Błąd połączenia z bazą | 500 | `server_error` | Unexpected server error. |
| Nieoczekiwany błąd | 500 | `server_error` | Unexpected server error. |

### Logowanie błędów:
- Wszystkie błędy 500 logowane przez `console.error` z pełnym stack trace
- Błędy walidacji (400) mogą być logowane na poziomie debug
- Nie logować wrażliwych danych (tokeny, hasła)

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazodanowe (istniejące)
- `plant_card(user_id)` - filtrowanie po użytkowniku
- `plant_card(next_care_at, name)` - sortowanie po najbliższym terminie opieki
- `plant_card(name)` - wyszukiwanie i sortowanie po nazwie
- `plant_card(next_watering_at)` - filtr needs_attention
- `plant_card(next_fertilizing_at)` - filtr needs_attention

### 8.2 Optymalizacje zapytań
- Użycie `count('exact')` dla dokładnej liczby wyników
- Selekcja tylko wymaganych kolumn (bez pełnych instrukcji pielęgnacji)
- Paginacja z `range()` zamiast `offset/limit` dla lepszej wydajności

### 8.3 Potencjalne usprawnienia (przyszłość)
- Cache'owanie wyników dla popularnych zapytań
- Indeks GIN dla wyszukiwania pełnotekstowego (jeśli search będzie intensywnie używany)
- Cursor-based pagination dla dużych zbiorów danych

## 9. Etapy wdrożenia

### Krok 1: Dodanie schematu walidacji Zod (w `src/pages/api/plants.ts`)

```typescript
const plantListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(20)),
  search: z.string().trim().optional(),
  sort: z.enum(["priority", "name", "created"]).optional().default("priority"),
  direction: z.enum(["asc", "desc"]).optional().default("asc"),
  needs_attention: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});
```

### Krok 2: Implementacja funkcji serwisowej (w `src/lib/services/plant-card.service.ts`)

```typescript
export interface PlantCardListResult {
  items: PlantCardListItemDto[];
  pagination: PaginationDto;
}

export const listPlantCards = async (
  supabase: SupabaseClient,
  userId: string,
  query: PlantListQueryDto
): Promise<PlantCardListResult> => {
  const {
    page = 1,
    limit = 20,
    search,
    sort = "priority",
    direction = "asc",
    needs_attention,
  } = query;

  const offset = (page - 1) * limit;

  // Build base query
  let baseQuery = supabase
    .from("plant_card")
    .select(
      `id, name, icon_key, color_hex, difficulty,
       next_watering_at, next_fertilizing_at, last_watered_at,
       last_fertilized_at, created_at, updated_at`,
      { count: "exact" }
    )
    .eq("user_id", userId);

  // Apply search filter
  if (search) {
    baseQuery = baseQuery.ilike("name", `%${search}%`);
  }

  // Apply needs_attention filter
  if (needs_attention === true) {
    const today = new Date().toISOString();
    baseQuery = baseQuery.or(
      `next_watering_at.lte.${today},next_fertilizing_at.lte.${today}`
    );
  }

  // Apply sorting
  const sortColumn = sort === "priority" ? "next_care_at" 
                   : sort === "created" ? "created_at" 
                   : "name";
  baseQuery = baseQuery.order(sortColumn, { ascending: direction === "asc" });

  // Secondary sort for consistency
  if (sortColumn !== "name") {
    baseQuery = baseQuery.order("name", { ascending: true });
  }

  // Apply pagination
  baseQuery = baseQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) {
    throw error;
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    items: (data ?? []) as PlantCardListItemDto[],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
};
```

### Krok 3: Implementacja handlera GET (w `src/pages/api/plants.ts`)

```typescript
export const GET: APIRoute = async ({ url, locals }) => {
  // Extract query parameters
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // Validate query parameters
  const parsed = plantListQuerySchema.safeParse(queryParams);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      "Invalid query parameters.",
      parsed.error.flatten() as Json
    );
  }

  try {
    const result = await listPlantCards(
      locals.supabase,
      DEFAULT_USER_ID, // TODO: Replace with actual user ID from auth
      parsed.data
    );

    return jsonResponse(200, {
      success: true,
      data: result.items,
      error: null,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Failed to list plant cards.", error);
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};
```

### Krok 4: Aktualizacja typu PlantCardListResult w `src/types.ts`

Dodać eksport nowego interfejsu:

```typescript
export interface PlantCardListResult {
  items: PlantCardListItemDto[];
  pagination: PaginationDto;
}
```

### Krok 5: Testy manualne

1. **Test podstawowy:**
   ```bash
   curl http://localhost:4321/api/plants
   ```

2. **Test paginacji:**
   ```bash
   curl "http://localhost:4321/api/plants?page=2&limit=5"
   ```

3. **Test wyszukiwania:**
   ```bash
   curl "http://localhost:4321/api/plants?search=monstera"
   ```

4. **Test sortowania:**
   ```bash
   curl "http://localhost:4321/api/plants?sort=name&direction=desc"
   ```

5. **Test filtra needs_attention:**
   ```bash
   curl "http://localhost:4321/api/plants?needs_attention=true"
   ```

6. **Test błędu walidacji:**
   ```bash
   curl "http://localhost:4321/api/plants?page=-1"
   curl "http://localhost:4321/api/plants?limit=100"
   curl "http://localhost:4321/api/plants?sort=invalid"
   ```

### Krok 6: Dodanie dokumentacji JSDoc

Dodać komentarze dokumentacyjne do funkcji serwisowej i handlera API dla lepszej czytelności kodu.

---

## Podsumowanie

Implementacja endpointu `GET /api/plants` wymaga:
1. Dodania schematu walidacji Zod dla parametrów zapytania
2. Rozszerzenia `plant-card.service.ts` o funkcję `listPlantCards`
3. Dodania handlera `GET` w `src/pages/api/plants.ts`
4. Opcjonalnie: dodania typu `PlantCardListResult` do `src/types.ts`

Kluczowe aspekty:
- Walidacja wszystkich parametrów wejściowych
- Paginacja z limitem 20 elementów
- Sortowanie z secondary sort dla spójności
- Filtrowanie po user_id i opcjonalnie needs_attention
- Spójny format odpowiedzi z envelope `ApiResponseDto`
