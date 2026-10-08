-- Migration: Add human units and portion tracking to meal_logs
ALTER TABLE meal_logs
ADD COLUMN IF NOT EXISTS input_qty NUMERIC,
ADD COLUMN IF NOT EXISTS input_unit TEXT CHECK (input_unit IN ('g', 'piece', 'serving')),
ADD COLUMN IF NOT EXISTS grams_per_unit NUMERIC,
ADD COLUMN IF NOT EXISTS unit_label TEXT;

-- Comment on columns
COMMENT ON COLUMN meal_logs.input_qty IS 'Quantité saisie par l''utilisateur dans son unité naturelle (ex: 2 pour 2 œufs)';
COMMENT ON COLUMN meal_logs.input_unit IS 'Unité humaine sélectionnée: g, piece ou serving';
COMMENT ON COLUMN meal_logs.grams_per_unit IS 'Poids en grammes équivalent à 1 unité (ex: 60 pour 1 œuf, 125 pour 1 yaourt)';
COMMENT ON COLUMN meal_logs.unit_label IS 'Libellé de l''unité affiché à l''écran (ex: œuf, pomme, tranche, pot, g)';
