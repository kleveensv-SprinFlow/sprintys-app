-- Le millilitre est une unité à part. 1 ml n'est pas toujours 1 g.
ALTER TABLE meal_logs DROP CONSTRAINT IF EXISTS meal_logs_input_unit_check;

ALTER TABLE meal_logs
  ADD CONSTRAINT meal_logs_input_unit_check
  CHECK (input_unit IS NULL OR input_unit IN ('g', 'ml', 'piece', 'serving'));

COMMENT ON COLUMN meal_logs.input_unit IS 'Unité saisie: g, ml, piece ou serving';
COMMENT ON COLUMN meal_logs.grams_per_unit IS 'Grammes d''une unité. Pour ml, c''est la densité (1 pour l''eau, 0.92 pour l''huile).';
