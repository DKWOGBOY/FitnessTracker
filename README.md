# biteTrack — Personal Fitness Tracker

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

### 3. Get a USDA FoodData Central API key (free)

Sign up at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) — used for
generic/raw food search (chicken breast, rice, etc). Open Food Facts (packaged/branded foods)
needs no key.

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in the three values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USDA_API_KEY=your-usda-api-key
```

### 5. Install and run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. Since Supabase Auth is required, create an account from the
sign-up screen (or use a magic link) — the app starts empty, no seed data. Head to **Settings**
first to run the TDEE calculator and set your initial targets.

## Deploying to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick this repo.
3. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`).
4. In **Site configuration → Environment variables**, add `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and `VITE_USDA_API_KEY` (same values as your `.env`).
5. Deploy.

Because these are `VITE_`-prefixed vars, Vite inlines them into the client bundle at build time —
that's expected for the Supabase anon key (it's safe to expose; RLS is what actually protects
data). Don't put a service-role key here.

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

Search order on the Log tab's "Add food": your personal `foods` table first, then optionally
Open Food Facts, then optionally USDA. Anything picked from an external API is normalized to
per-100g/100ml macros and a fixed serving-unit enum (`g`/`ml`/`oz`/`piece`), checked for an
existing near-duplicate in your database, and only then written to `foods` — so it's fetched and
normalized once, never again.
