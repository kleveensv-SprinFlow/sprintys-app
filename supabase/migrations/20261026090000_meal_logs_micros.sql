-- N4 : nutriments supplémentaires (fibres, sucres, sel, graisses saturées, fer, calcium).
-- Colonne JSON optionnelle : clé absente = valeur inconnue (jamais 0 par défaut).
-- Clés autorisées : fibres_g, sucres_g, sel_g, ags_g, fer_mg, calcium_mg.
alter table public.meal_logs add column if not exists micros jsonb;
alter table public.saved_meal_items add column if not exists micros jsonb;

alter table public.meal_logs drop constraint if exists meal_logs_micros_object;
alter table public.meal_logs add constraint meal_logs_micros_object
  check (micros is null or jsonb_typeof(micros) = 'object');

alter table public.saved_meal_items drop constraint if exists saved_meal_items_micros_object;
alter table public.saved_meal_items add constraint saved_meal_items_micros_object
  check (micros is null or jsonb_typeof(micros) = 'object');
