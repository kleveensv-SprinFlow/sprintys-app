-- Recherche par mots : tous les mots saisis doivent se retrouver (« jus orange » trouve « Jus d'orange »),
-- les correspondances exactes passent avant les approximations (« pates » ne ramène plus « pâte molle »).
create or replace function public.search_foods(p_query text, p_limit integer default 20)
returns setof public.food_master
language sql stable security invoker set search_path = public as
$$
  with q as (
    select lower(public.unaccent(trim(coalesce(p_query, '')))) as t,
           array_remove(string_to_array(lower(public.unaccent(trim(coalesce(p_query, '')))), ' '), '') as words
  ),
  hits as (
    select f.id, f.search_priority, f.popularite, f.display_name,
      public.food_master_search_text(f.display_name, f.search_tags) as txt,
      lower(public.unaccent(f.display_name)) as dn,
      q.t, q.words,
      (select bool_and(public.food_master_search_text(f.display_name, f.search_tags) like '%' || w || '%') from unnest(q.words) w) as direct
    from public.food_master f, q
    where length(q.t) >= 2
  ),
  ranked as (
    select h.id,
      row_number() over (order by
        coalesce(h.direct, false) desc,
        h.search_priority asc,
        (h.dn = h.t or h.dn like h.t || ' (%') desc,
        (h.dn like h.words[1] || '%') desc,
        (h.dn like '% ' || h.words[1] || '%') desc,
        h.popularite asc,
        greatest(similarity(h.dn, h.t), similarity(h.txt, h.t)) desc,
        length(h.display_name) asc) as rn
    from hits h
    where coalesce(h.direct, false) or (length(h.t) >= 4 and cardinality(h.words) = 1 and h.t <% h.txt)
  )
  select f.*
  from ranked r
  join public.food_master f on f.id = r.id
  order by r.rn
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
