-- Réglage de la recherche d'aliments (suite de 20261029090000_food_master) :
-- 1) un nom exactement égal à la saisie (ou « saisie (cru) ») passe avant les noms qui commencent seulement par elle
--    (« pomme » avant « pomme de terre », « beurre » avant « beurre de cacahuète »),
-- 2) la tolérance aux fautes utilise word_similarity : « poullet » retrouve « poulet » sans ramener du bruit.

create or replace function public.search_foods(p_query text, p_limit integer default 20)
returns setof public.food_master
language sql stable security invoker set search_path = public as
$$
  with q as (select lower(public.unaccent(trim(coalesce(p_query, '')))) as t)
  select f.*
  from public.food_master f, q
  where length(q.t) >= 2
    and (public.food_master_search_text(f.display_name, f.search_tags) like '%' || q.t || '%'
         or (length(q.t) >= 4 and q.t <% public.food_master_search_text(f.display_name, f.search_tags)))
  order by
    f.search_priority asc,
    (lower(public.unaccent(f.display_name)) = q.t
       or lower(public.unaccent(f.display_name)) like q.t || ' (%') desc,
    (lower(public.unaccent(f.display_name)) like q.t || '%') desc,
    (lower(public.unaccent(f.display_name)) like '% ' || q.t || '%') desc,
    f.popularite asc,
    greatest(similarity(lower(public.unaccent(f.display_name)), q.t),
             similarity(public.food_master_search_text(f.display_name, f.search_tags), q.t)) desc,
    length(f.display_name) asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
