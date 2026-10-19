-- Base nutritionnelle Sprintys (Ciqual 2020 + USDA, voir tools/nutrition-db/build_master_db.py).
-- Table en lecture seule pour l'app, remplie par import CSV (tools/nutrition-db/out/master_nutrition_db.csv).
-- L'ancienne table ciqual_foods reste en place : la recherche bascule derrière un interrupteur côté app.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create table if not exists public.food_master (
  id text primary key,                       -- « ciqual-20800 », « usda-1234 »
  source text not null,
  source_id text not null,
  nom_origine text not null,
  display_name text not null,
  search_tags text not null default '',
  search_priority smallint not null check (search_priority between 1 and 3),
  popularite integer not null default 999,   -- rang dans la liste des aliments de niveau 1 (petit = plus courant)
  groupe text,
  sous_groupe text,
  etat text,
  facteur_cuisson numeric,
  facteur_source text,
  unite_label text not null default '1 portion',
  poids_moyen_g numeric not null default 100,
  portion_source text,
  kcal numeric not null default 0,
  proteines_g numeric not null default 0,
  glucides_g numeric not null default 0,
  sucres_g numeric not null default 0,
  fibres_g numeric not null default 0,
  lipides_g numeric not null default 0,
  ag_satures_g numeric not null default 0,
  ag_monoinsatures_g numeric not null default 0,
  ag_polyinsatures_g numeric not null default 0,
  omega3_g numeric not null default 0,
  omega6_g numeric not null default 0,
  kcal_source text,
  eau_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  sel_g numeric not null default 0,
  potassium_mg numeric not null default 0,
  magnesium_mg numeric not null default 0,
  calcium_mg numeric not null default 0,
  phosphore_mg numeric not null default 0,
  fer_mg numeric not null default 0,
  zinc_mg numeric not null default 0,
  cuivre_mg numeric not null default 0,
  manganese_mg numeric not null default 0,
  selenium_ug numeric not null default 0,
  iode_ug numeric not null default 0,
  vitamine_a_ug numeric not null default 0,
  vitamine_b1_mg numeric not null default 0,
  vitamine_b2_mg numeric not null default 0,
  vitamine_b3_mg numeric not null default 0,
  vitamine_b5_mg numeric not null default 0,
  vitamine_b6_mg numeric not null default 0,
  vitamine_b9_ug numeric not null default 0,
  vitamine_b12_ug numeric not null default 0,
  vitamine_c_mg numeric not null default 0,
  vitamine_d_ug numeric not null default 0,
  vitamine_e_mg numeric not null default 0,
  vitamine_k1_ug numeric not null default 0,
  micros_manquants integer not null default 0,
  alerte_coherence boolean not null default false,
  donnees_pauvres boolean not null default false
);

alter table public.food_master enable row level security;

-- Données publiques de référence : lecture pour les comptes connectés, aucune écriture depuis l'app.
drop policy if exists food_master_read on public.food_master;
create policy food_master_read on public.food_master for select to authenticated using (true);

-- Index de recherche (texte sans accents, similarité trigramme)
create or replace function public.food_master_search_text(p_display text, p_tags text)
returns text language sql immutable parallel safe as
$$ select lower(public.unaccent(coalesce(p_display, '') || ' ' || coalesce(p_tags, ''))) $$;

create index if not exists food_master_trgm_idx
  on public.food_master using gin (public.food_master_search_text(display_name, search_tags) gin_trgm_ops);
create index if not exists food_master_priority_idx on public.food_master (search_priority);

-- Recherche : priorité 1 -> 3, puis similarité. Un mot saisi qui est le début d'un mot du nom ou des tags compte
-- comme une correspondance forte (autocomplétion dès 2 lettres).
create or replace function public.search_foods(p_query text, p_limit integer default 20)
returns setof public.food_master
language sql stable security invoker set search_path = public as
$$
  with q as (
    select lower(public.unaccent(trim(coalesce(p_query, '')))) as t
  )
  select f.*
  from public.food_master f, q
  where length(q.t) >= 2
    and (
      public.food_master_search_text(f.display_name, f.search_tags) like '%' || q.t || '%'
      or public.food_master_search_text(f.display_name, f.search_tags) % q.t
    )
  order by
    f.search_priority asc,
    (lower(public.unaccent(f.display_name)) like q.t || '%') desc,
    (lower(public.unaccent(f.display_name)) like '% ' || q.t || '%') desc,
    f.popularite asc,
    greatest(
      similarity(lower(public.unaccent(f.display_name)), q.t),
      similarity(public.food_master_search_text(f.display_name, f.search_tags), q.t)
    ) desc,
    length(f.display_name) asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

grant execute on function public.search_foods(text, integer) to authenticated;

comment on table public.food_master is
  'Source : Table de composition nutritionnelle des aliments Ciqual 2020 (ANSES, Licence Ouverte) ; USDA FoodData Central (domaine public) pour les lignes source = USDA.';
