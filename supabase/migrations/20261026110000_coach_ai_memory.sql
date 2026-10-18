-- Mémoire de Sprinty sur le coach : ce que le coach a validé (présentation, conversations, habitudes de programmation).
-- Rien n'est enregistré sans un appui du coach. Le coach voit, modifie et efface tout (écran « Ce que Sprinty sait de moi »).

CREATE TABLE IF NOT EXISTS public.coach_ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'autre'
    CHECK (category IN ('specialite', 'athletes', 'objectifs', 'semaine', 'methodes', 'interdits', 'autre')),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 300),
  source text NOT NULL DEFAULT 'conversation'
    CHECK (source IN ('presentation', 'conversation', 'programmation', 'import', 'manuel')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_ai_memory_coach_idx ON public.coach_ai_memory (coach_id, created_at);

ALTER TABLE public.coach_ai_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_ai_memory_select ON public.coach_ai_memory;
DROP POLICY IF EXISTS coach_ai_memory_insert ON public.coach_ai_memory;
DROP POLICY IF EXISTS coach_ai_memory_update ON public.coach_ai_memory;
DROP POLICY IF EXISTS coach_ai_memory_delete ON public.coach_ai_memory;
CREATE POLICY coach_ai_memory_select ON public.coach_ai_memory FOR SELECT TO authenticated USING (coach_id = (SELECT auth.uid()));
CREATE POLICY coach_ai_memory_insert ON public.coach_ai_memory FOR INSERT TO authenticated WITH CHECK (coach_id = (SELECT auth.uid()));
CREATE POLICY coach_ai_memory_update ON public.coach_ai_memory FOR UPDATE TO authenticated
  USING (coach_id = (SELECT auth.uid())) WITH CHECK (coach_id = (SELECT auth.uid()));
CREATE POLICY coach_ai_memory_delete ON public.coach_ai_memory FOR DELETE TO authenticated USING (coach_id = (SELECT auth.uid()));

-- Au plus 40 éléments par coach : la mémoire reste lisible et le coût IA maîtrisé
CREATE OR REPLACE FUNCTION public.coach_ai_memory_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND (SELECT count(*) FROM public.coach_ai_memory WHERE coach_id = NEW.coach_id) >= 40 THEN
    RAISE EXCEPTION 'memory_full' USING ERRCODE = 'check_violation';
  END IF;
  NEW.content := btrim(NEW.content);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS coach_ai_memory_guard ON public.coach_ai_memory;
CREATE TRIGGER coach_ai_memory_guard BEFORE INSERT OR UPDATE ON public.coach_ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.coach_ai_memory_guard();

-- Présentation à Sprinty : faite ou remise à plus tard (null = jamais proposée)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sprinty_intro_status text
  CHECK (sprinty_intro_status IS NULL OR sprinty_intro_status IN ('done', 'skipped'));

-- Reprise : la philosophie déjà enregistrée par un coach devient son premier souvenir
INSERT INTO public.coach_ai_memory (coach_id, category, content, source)
SELECT p.id, 'methodes', left(btrim(p.objective), 300), 'import'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'coach' AND btrim(COALESCE(p.objective, '')) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.coach_ai_memory m WHERE m.coach_id = p.id);
