CREATE POLICY "Enable read access for all users" ON public.exercises_catalog FOR SELECT USING (true);
