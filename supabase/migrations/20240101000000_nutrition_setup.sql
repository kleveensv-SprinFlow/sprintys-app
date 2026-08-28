-- Add nutrition profile fields to existing profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS activity_level TEXT,
ADD COLUMN IF NOT EXISTS start_weight NUMERIC,
ADD COLUMN IF NOT EXISTS target_weight NUMERIC,
ADD COLUMN IF NOT EXISTS weekly_weight_goal NUMERIC CHECK (weekly_weight_goal <= 1 AND weekly_weight_goal >= -1),
ADD COLUMN IF NOT EXISTS manual_kcal_goal INTEGER,
ADD COLUMN IF NOT EXISTS meal_distribution JSONB DEFAULT '{"petit_dejeuner": 25, "dejeuner": 35, "diner": 30, "collation": 10}'::jsonb,
ADD COLUMN IF NOT EXISTS current_flow_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_flow_date DATE;

-- Create meal_logs table
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id TEXT, -- ID from ciqual if applicable
    custom_food_name TEXT,
    quantity_g NUMERIC NOT NULL,
    calories NUMERIC NOT NULL,
    proteines NUMERIC NOT NULL,
    glucides NUMERIC NOT NULL,
    lipides NUMERIC NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('petit_dejeuner', 'dejeuner', 'diner', 'collation')),
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for meal_logs
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal logs"
    ON meal_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal logs"
    ON meal_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs"
    ON meal_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal logs"
    ON meal_logs FOR DELETE
    USING (auth.uid() = user_id);
