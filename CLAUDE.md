# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `trip-planner-buddy-50-main/`:

```bash
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build (base path /trip/ for GitHub Pages)
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build locally
```

## Environment Variables

Create `trip-planner-buddy-50-main/.env` with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_WEATHER_API_KEY=        # OpenWeather API
VITE_GOOGLE_MAPS_API_KEY=    # Google Maps JS API (Maps + Places libraries)
VITE_SUPABASE_DEV_PROXY=     # Optional: set to disable dev proxy
```

## Architecture

### Project Layout

Source lives in `trip-planner-buddy-50-main/src/`. The `supabase/` directory at the repo root holds migrations and Edge Functions.

### Routing

Uses `HashRouter` (React Router v6) for GitHub Pages compatibility. Routes:
- `/` → `pages/Index.tsx` — home with carousel + trip list
- `/trip/:id` → `pages/TripDetail.tsx` — public trip view
- `/admin` → `pages/AdminDashboard.tsx` — protected admin panel (session-gated)
- `/admin/login` → `pages/AdminLogin.tsx`

### Data Flow

React Query (TanStack Query v5) manages all server state. Query keys: `['trips']`, `['trip', id]`, `['expenses', tripId]`.

**Performance-critical pattern**: `fetchTrips()` in `lib/trips.ts` intentionally excludes large JSONB columns (`daily_itineraries`, `todos`, `flights`, `hotels`, `weather_cities`, `other_notes`) to prevent OOM on list views. Full data is only fetched via `fetchTripById(id)` when opening the editor or detail page.

### DB ↔ Frontend Conversion

All Supabase rows use snake_case; the frontend uses camelCase `Trip` objects. Always convert through:
- `rowToTrip(row)` — DB → frontend model (in `lib/trips.ts`)
- `tripToRow(trip)` — frontend → DB row

### Key Library Modules (`lib/`)

| File | Purpose |
|---|---|
| `trips.ts` | Trip CRUD + `todos` table sync for email reminders |
| `expenses.ts` | Expense/participant/split operations (uses Supabase RPC for atomic inserts) |
| `settlement.ts` | Greedy debt-settlement algorithm |
| `auth.ts` | Supabase auth helpers |
| `weather.ts` | OpenWeather API with 30-min localStorage cache |
| `googleMaps.ts` | Dynamic script loader for Google Maps API |
| `todoReminders.ts` | Reminder offset calculations and zh-TW formatting |

### Admin vs Public

- **Public** (`pages/TripDetail.tsx`): read-only trip view with debounced luggage/shopping saves
- **Admin** (`components/admin/TripEditor.tsx`): full trip editor with Google Maps, drag-and-drop itinerary, image upload
- **Admin Edge Function** (`trip-planner-buddy-50-main/supabase/functions/admin-auth/`): privileged user CRUD using service role key; called from `lib/auth.ts`

### Todo Reminder System

Todos are stored as JSONB in the `trips` table AND mirrored in a separate `todos` table queried by a backend email service. When a todo's `remindTime` changes, call `insertTodoRow()` / `deleteTodoRow()` to keep them in sync. `NO_REMINDER_MINUTES = -1` is the sentinel for "no reminder".

### Cover Images

Legacy trips store `coverImage` as base64. On save, `TripEditor` lazily uploads base64 to Supabase Storage (`/homepage-media/covers/`) and replaces the field with the public URL. Deletion also cleans up Storage.

### UI Components

Uses shadcn/ui (`components/ui/`) built on Radix UI primitives. Add new components with `npx shadcn@latest add <component>`. The `cn()` utility from `lib/utils.ts` merges Tailwind classes.
