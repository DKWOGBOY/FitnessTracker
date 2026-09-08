# Personal Fitness Tracker — Project Spec

## Stack
- Frontend: Single-page app, tabbed layout, built/edited via Claude Code
- Backend/storage: Supabase (Postgres)
- Deployment: Netlify
- Design: Dark aesthetic, distinctive typography (no Inter/Roboto/Arial), CSS variable-based palette, consistent with existing app suite (LIFT, PocketFinance)

## Tabs
1. **Log** — daily food/weight logging
2. **Trends** — charts over time (weight, calories, macros)
3. **Foods** — personal food database management

## Data Model (Supabase)

### `foods`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| calories | numeric | per 100g/100ml (normalized) |
| protein_g | numeric | per 100g/100ml (normalized) |
| carbs_g | numeric | per 100g/100ml (normalized) |
| fat_g | numeric | per 100g/100ml (normalized) |
| serving_size | numeric | default display serving |
| serving_unit | text | normalized enum: g / ml / oz / piece |
| source | text | `off` \| `usda` \| `manual` |
| source_id | text | original API id/barcode, null if manual |
| is_frequent | boolean | for quick-add surfacing |
| created_at | timestamptz | |

### `food_logs`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| food_id | uuid | FK -> foods |
| log_date | date | |
| meal | text | breakfast / lunch / dinner / snack |
| quantity | numeric | multiplier on serving_size |
| created_at | timestamptz | |

### `weight_logs`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| log_date | date | |
| weight_kg | numeric | |
| notes | text | optional |

### `targets`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| effective_date | date | allows targets to change over time |
| calories | numeric | |
| protein_g | numeric | |
| carbs_g | numeric | |
| fat_g | numeric | |

## Features — v1

### Log tab
- Add food entry: search personal food DB, or quick-add from "recent/frequent" list
- Assign to meal (breakfast/lunch/dinner/snack)
- Edit or delete any existing food log entry for the selected day
- Date navigation (prev/next day, jump-to-date) — view and edit past days, not just today
- Daily summary: calories + macros consumed vs. target, remaining
- Quick weight entry (date + kg), with edit/delete on existing weight entries
- Meal presets: save a combination of foods logged together as a single quick-add (e.g. a usual breakfast)
- Streak counter: consecutive days with at least one log entry

### Trends tab
- Weight over time (line chart, selectable range: 7/30/90 days, all-time)
- Calories over time vs. target (bar or line)
- Macro breakdown over time (stacked bar or line per macro)

### Foods tab
- Full list of foods in personal DB, searchable
- Add/edit/delete food entries
- Mark foods as "frequent" for quick-add surfacing on Log tab

### Settings
- TDEE/BMR calculator (standard formula, inputs: weight, height, age, activity level, goal) to help set initial calorie/macro targets rather than entering them blind
- Edit current targets (creates a new date-ranged row in `targets`, preserving history)
- Unit preference toggle: kg/lb for weight, metric/imperial generally (default metric)
- Data export: CSV download of `food_logs` and `weight_logs`

## Explicitly deferred (not in v1)
- Photo-based food logging / AI macro estimation
- Barcode scanning
- Micronutrient tracking (fiber, sugar, sodium, etc.)

## Design system
- Palette: warm/appetite-coded — terracotta, cream, muted tones (distinct from LIFT's dark acid-yellow and PocketFinance's dark fintech look)
  - Suggested base: cream background (`#F5EFE6`), terracotta primary accent (`#C1602E` or similar), deep charcoal-brown text (`#2E2420`), muted secondary tones for cards/borders
- Typography: native system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif`) so it renders as San Francisco on iOS/macOS, with a sane fallback elsewhere — no font files to embed
- Light-mode-first design (a shift from the dark aesthetic of LIFT/PocketFinance)

## Food data APIs

**Superseded** — see `calorieapi-integration-spec.md`. The two-source setup described below (Open Food Facts + USDA) was replaced with a single CalorieAPI integration; foods already imported with `source = 'off'`/`'usda'` keep that value (nothing re-fetches or migrates them), but new imports use `source = 'calorieapi'`. Kept here for history.

Two external sources, normalized into one internal shape before ever touching the `foods` table — this is the piece that prevents the mixed-API mess.

**Sources**
- **Open Food Facts** (free, no key) — primary for packaged/branded foods. Barcode-keyed, crowdsourced.
- **USDA FoodData Central** (free, requires API key) — primary for generic/raw foods (chicken breast, rice, banana). Higher data quality for staples, weak on branded products.

**Normalization layer**
- Every API response is mapped into one canonical shape before it's shown to the user or saved:
  - `name`, `source` (`off` | `usda` | `manual`), `source_id` (the API's own id/barcode, kept for reference/dedup), `calories`, `protein_g`, `carbs_g`, `fat_g`, `serving_size`, `serving_unit` (normalized to a fixed enum: `g`, `ml`, `oz`, `piece` — never pass through raw API-specific unit strings)
  - All macro values normalized to **per 100g/100ml** internally, then converted to serving-size display at read time — this avoids the two APIs' differing serving-size conventions ever conflicting
- Search flow: query hits **your own `foods` table first** (personal DB, already normalized) → if no match, query Open Food Facts → if still no match or user explicitly wants a generic/raw food, query USDA → any result the user selects gets written into `foods` with its `source`/`source_id`, so it's never re-fetched or re-normalized again
- Dedup safeguard: before inserting a new API result, check for an existing `foods` row with the same `source` + `source_id` (exact recall) and a fuzzy name+macro match against existing entries (catches the same food added twice from different sources) — surface a "this looks similar to X, use existing?" prompt rather than silently creating a duplicate

## Auth
- Supabase Auth required (email/password or magic link) — even though it's single-user, this gates access properly and enables Row Level Security
- RLS policies on all tables scoped to `auth.uid()` so only the logged-in user can read/write their own rows
- No seed data — app starts empty; targets configured via the TDEE calculator/settings on first use

## Technical setup
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY` — set in Netlify site environment variables, referenced client-side at build/runtime (not committed to repo)
- Supabase schema managed via migration files (not manual dashboard edits) so schema changes are tracked in git alongside the app
- RLS enabled on every table from the first migration, not bolted on later

## Notes
- Follows established pattern from LIFT and PocketFinance: standalone app, Supabase-backed, Netlify-deployed, distinctive dark UI.
- Targets table is date-ranged so historical days always calculate against the target that was active at the time.
