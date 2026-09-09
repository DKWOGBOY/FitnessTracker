# KOUR — Personal Fitness Tracker

Single-page food/weight tracker. React + Vite frontend, Supabase (Postgres + Auth) backend,
deployed to Netlify. See [fitness-tracker-spec.md](fitness-tracker-spec.md) for the full spec.

## Stack

- Frontend: React + TypeScript + Vite, plain CSS (no framework)
- Backend: Supabase (Postgres, Auth, Row Level Security)
- Charts: Recharts
- Deployment: Netlify

## One-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. In **Project Settings → API**, keep this tab open — you'll need these values below.

### 2. Run the database migration

The schema lives in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) and
creates all tables with Row Level Security enabled from the start.

Easiest path — paste-and-run in the dashboard:

1. In your Supabase project, open **SQL Editor**.
2. Paste the contents of `supabase/migrations/0001_init.sql` and run it.

Or, if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked to
this project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. Get a CalorieAPI key (free tier available)

Sign up at [calorieapi.com](https://calorieapi.com) — used for all food search (typeahead +
full nutrition/portion lookup). Free tier: 10 requests/min.

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in the three values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
CALORIEAPI_KEY=your-calorieapi-key
```

Note `CALORIEAPI_KEY` has no `VITE_` prefix — CalorieAPI doesn't support being called directly
from browser JS (no CORS headers on its responses), so it's called from a Netlify Function
(`netlify/functions/calorieapi.mts`) instead, and the key needs to stay server-side only.

### 5. Install and run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. Since Supabase Auth is required, create an account from the
sign-up screen (or use a magic link) — the app starts empty, no seed data. Head to **Settings**
first to run the TDEE calculator and set your initial targets.

Plain `npm run dev` (just Vite) won't run the Netlify Function, so food search will show a config
error locally. To test search, run it through the Netlify CLI instead, which serves the frontend
and the function together:

```bash
npx netlify dev
```

## Deploying to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick this repo.
3. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`).
4. In **Site configuration → Environment variables**, add `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and `CALORIEAPI_KEY` (same values as your `.env`).
5. Deploy.

`VITE_`-prefixed vars get inlined into the client bundle at build time — that's expected for the
Supabase anon key (it's safe to expose; RLS is what actually protects data). `CALORIEAPI_KEY` is
deliberately not prefixed, so it stays available only to the Netlify Function, never shipped to
the browser. Don't put a service-role key in either place.

## Project structure

```
src/
  components/       UI grouped by tab (Log, Trends, Foods, Settings, Auth)
  hooks/            Data-fetching hooks wrapping Supabase queries
  context/          Auth context (session state)
  lib/              Supabase client, types, TDEE calc, food API normalization, units, csv, dates
supabase/
  migrations/       SQL migrations (source of truth for schema — don't edit via dashboard only)
```

## Notes on the food API layer

The Log tab's "Search Online" tab uses a single provider, CalorieAPI (calorieapi.com): typing
debounces into a cheap typeahead `suggest` call, and only picking a result fetches the full
nutrition/portion payload. It also supports scanning a barcode directly (`@zxing/browser` decodes
the camera feed client-side; the UPC is looked up via CalorieAPI, falling back to Open Food Facts
on its end). Every call goes through `netlify/functions/calorieapi.mts`, not straight to
CalorieAPI, since its API doesn't send CORS headers a browser needs to call it directly. Anything
picked (search or barcode) is normalized to per-100g macros plus its real household portions,
checked for an existing near-duplicate in your database, and only then written to
`foods`/`food_servings` — so it's fetched and normalized once, never again. Foods already imported
from the previous Open Food Facts/USDA integration keep their old `source` value;
nothing migrates or re-fetches them.
