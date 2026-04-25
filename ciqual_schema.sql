-- ciqual_schema.sql
-- Table simplifiée contenant les valeurs nutritionnelles essentielles
-- issue de la base CIQUAL pour la performance athlétique.

CREATE TABLE public.ciqual_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_ciqual VARCHAR(20) UNIQUE NOT NULL, -- Identifiant original dans la base CIQUAL
    nom VARCHAR(255) NOT NULL,
    -- Valeurs pour 100g de produit
    energie_kcal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proteines NUMERIC(10, 2) NOT NULL DEFAULT 0,
    glucides NUMERIC(10, 2) NOT NULL DEFAULT 0,
    lipides NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fibres NUMERIC(10, 2) NOT NULL DEFAULT 0,
    -- Champs additionnels utiles mais optionnels
    eau NUMERIC(10, 2) DEFAULT 0, -- Utile pour l'hydratation
    vitamine_c NUMERIC(10, 2) DEFAULT 0,
    fer NUMERIC(10, 2) DEFAULT 0,
    calcium NUMERIC(10, 2) DEFAULT 0,
    sodium NUMERIC(10, 2) DEFAULT 0,
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la recherche textuelle
CREATE INDEX idx_ciqual_foods_nom ON public.ciqual_foods USING gin (to_tsvector('french', nom));

-- Table pour lier l'historique nutritionnel de l'utilisateur
CREATE TABLE public.user_nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES public.ciqual_foods(id) ON DELETE SET NULL,
    custom_food_name VARCHAR(255), -- Si on n'utilise pas CIQUAL directement (ex: ajout manuel ou IA)
    quantity_g NUMERIC(10, 2) NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Macros calculés selon la quantité consommée pour éviter de recalculer sans cesse
    total_kcal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_proteines NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_glucides NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_lipides NUMERIC(10, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_nutrition_logs_user_date ON public.user_nutrition_logs(user_id, consumed_at);

-- Row Level Security (RLS) pour user_nutrition_logs
ALTER TABLE public.user_nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition logs"
    ON public.user_nutrition_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition logs"
    ON public.user_nutrition_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition logs"
    ON public.user_nutrition_logs FOR DELETE
    USING (auth.uid() = user_id);

-- La table ciqual_foods doit être lisible par tout le monde
ALTER TABLE public.ciqual_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ciqual_foods"
    ON public.ciqual_foods FOR SELECT
    USING (true);
