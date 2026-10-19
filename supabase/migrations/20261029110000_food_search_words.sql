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
    select f.*,
      public.food_master_search_text(f.display_name, f.search_tags) as txt,
      lower(public.unaccent(f.display_name)) as dn,
      q.t, q.words,
      (select bool_and(public.food_master_search_text(f.display_name, f.search_tags) like '%' || w || '%') from unnest(q.words) w) as direct
    from public.food_master f, q
    where length(q.t) >= 2
  )
  select (h.id, h.source, h.source_id, h.nom_origine, h.display_name, h.search_tags, h.search_priority, h.popularite,
          h.groupe, h.sous_groupe, h.etat, h.facteur_cuisson, h.facteur_source, h.unite_label, h.poids_moyen_g, h.portion_source,
          h.kcal, h.proteines_g, h.glucides_g, h.sucres_g, h.fibres_g, h.lipides_g, h.ag_satures_g, h.ag_monoinsatures_g,
          h.ag_polyinsatures_g, h.omega3_g, h.omega6_g, h.kcal_source, h.eau_g, h.sodium_mg, h.sel_g, h.potassium_mg,
          h.magnesium_mg, h.calcium_mg, h.phosphore_mg, h.fer_mg, h.zinc_mg, h.cuivre_mg, h.manganese_mg, h.selenium_ug,
          h.iode_ug, h.vitamine_a_ug, h.vitamine_b1_mg, h.vitamine_b2_mg, h.vitamine_b3_mg, h.vitamine_b5_mg,
          h.vitamine_b6_mg, h.vitamine_b9_ug, h.vitamine_b12_ug, h.vitamine_c_mg, h.vitamine_d_ug, h.vitamine_e_mg,
          h.vitamine_k1_ug, h.micros_manquants, h.alerte_coherence, h.donnees_pauvres)::public.food_master
  from hits h
  where h.direct or (length(h.t) >= 4 and cardinality(h.words) = 1 and h.t <% h.txt)
  order by
    coalesce(h.direct, false) desc,
    h.search_priority asc,
    (h.dn = h.t or h.dn like h.t || ' (%') desc,
    (h.dn like h.words[1] || '%') desc,
    (h.dn like '% ' || h.words[1] || '%') desc,
    h.popularite asc,
    greatest(similarity(h.dn, h.t), similarity(h.txt, h.t)) desc,
    length(h.display_name) asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
