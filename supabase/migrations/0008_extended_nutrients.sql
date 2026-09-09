-- Fitness Tracker: extended nutrients (fiber, sugar, sodium)
-- Per-100g/100ml, same basis as the existing macro columns. Nullable since
-- older foods and some manual entries won't have these - a null means
-- "unknown", not "zero", so the UI can tell the difference.

alter table foods add column if not exists fiber_g numeric;
alter table foods add column if not exists sugar_g numeric;
alter table foods add column if not exists sodium_mg numeric;
