-- Depots de linge et tickets : enregistrement, numerotation atomique et articles figes.

-- 1. Type enum des statuts de depot
create type public.statut_depot as enum ('depose', 'en_lavage', 'pret', 'livre', 'annule');

-- 2. Contrainte d'unicite composite sur clients pour supporter la cle etrangere composite
alter table public.clients
  add constraint clients_id_pressing_id_key unique (id, pressing_id);

-- 3. Table des compteurs journaliers par pressing
create table public.compteurs_tickets (
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  jour date not null,
  dernier integer not null check (dernier >= 1),
  primary key (pressing_id, jour)
);

alter table public.compteurs_tickets enable row level security;
revoke all on public.compteurs_tickets from anon, authenticated;

-- 4. Table des depots
create table public.depots (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  numero_ticket text not null,
  client_id uuid not null,
  statut public.statut_depot not null default 'depose',
  date_depot timestamptz not null default now(),
  date_retrait_prevue timestamptz not null,
  total_xof integer not null check (total_xof >= 0),
  notes text check (char_length(notes) <= 500),
  cree_par uuid not null references auth.users (id),
  cree_le timestamptz not null default now(),
  constraint depots_pressing_numero_ticket_key unique (pressing_id, numero_ticket),
  constraint depots_id_pressing_key unique (id, pressing_id),
  constraint depots_client_fkey foreign key (client_id, pressing_id) references public.clients (id, pressing_id) on delete restrict,
  constraint depots_dates_check check (date_retrait_prevue >= date_depot)
);

create index depots_pressing_idx on public.depots (pressing_id);
create index depots_client_idx on public.depots (client_id);
create index depots_date_depot_idx on public.depots (pressing_id, date_depot desc);
create index depots_statut_idx on public.depots (pressing_id, statut);

-- 5. Table des articles de depot (copie figee au moment du depot)
create table public.depot_articles (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null,
  depot_id uuid not null,
  prestation_id uuid references public.prestations (id) on delete set null,
  article text not null check (char_length(trim(article)) between 2 and 100),
  service text not null check (char_length(trim(service)) between 2 and 100),
  prix_unitaire_xof integer not null check (prix_unitaire_xof >= 0),
  quantite integer not null check (quantite between 1 and 999),
  constraint depot_articles_depot_fkey foreign key (depot_id, pressing_id) references public.depots (id, pressing_id) on delete cascade
);

create index depot_articles_depot_idx on public.depot_articles (depot_id);

-- 6. Table d'historique des statuts de depot
create table public.depot_historique (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null,
  depot_id uuid not null,
  ancien_statut public.statut_depot,
  nouveau_statut public.statut_depot not null,
  par uuid not null references auth.users (id),
  le timestamptz not null default now(),
  constraint depot_historique_depot_fkey foreign key (depot_id, pressing_id) references public.depots (id, pressing_id) on delete cascade
);

create index depot_historique_depot_idx on public.depot_historique (depot_id);

-- 7. Securite RLS et permissions
alter table public.depots enable row level security;
alter table public.depot_articles enable row level security;
alter table public.depot_historique enable row level security;

revoke all on public.depots from anon, authenticated;
revoke all on public.depot_articles from anon, authenticated;
revoke all on public.depot_historique from anon, authenticated;

grant select on public.depots to authenticated;
grant select on public.depot_articles to authenticated;
grant select on public.depot_historique to authenticated;

create policy depots_lecture on public.depots
  for select to authenticated
  using (public.est_membre(pressing_id));

create policy depot_articles_lecture on public.depot_articles
  for select to authenticated
  using (public.est_membre(pressing_id));

create policy depot_historique_lecture on public.depot_historique
  for select to authenticated
  using (public.est_membre(pressing_id));

-- 8. Fonction atomique de creation de depot
create or replace function public.creer_depot(
  p_pressing uuid,
  p_client uuid,
  p_date_retrait timestamptz,
  p_articles jsonb,
  p_notes text default null
)
returns table (
  depot_id uuid,
  numero_ticket text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_client_actif boolean;
  v_nb_articles integer;
  v_notes_propres text;
  v_jour date;
  v_jour_str text;
  v_dernier integer;
  v_num_ticket text;
  v_nouveau_depot_id uuid;
  v_total_calcule bigint := 0;
  v_date_retrait timestamptz;
  v_ligne record;
  v_prest record;
  v_prestation_ids uuid[] := array[]::uuid[];
  v_quantites integer[] := array[]::integer[];
  v_articles text[] := array[]::text[];
  v_services text[] := array[]::text[];
  v_prix_unitaires integer[] := array[]::integer[];
  v_index integer;
  v_index_prestation integer;
  v_quantite_agregee integer;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  -- 1. Verification de l'appartenance de l'appelant au pressing
  if not public.a_role(
    p_pressing,
    array['proprietaire', 'gerant', 'receptionniste']::public.role_membre[]
  ) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  -- 2. Verification du client
  select c.actif into v_client_actif
  from public.clients c
  where c.id = p_client and c.pressing_id = p_pressing;

  if v_client_actif is null then
    raise exception 'Client introuvable dans ce pressing' using errcode = 'P0002';
  end if;

  if not v_client_actif then
    raise exception 'Le client selectionne est inactif' using errcode = 'P0008';
  end if;

  -- 3. Verification de la date de retrait (tolerance 5 min dans le passe, max 365 jours)
  if p_date_retrait is null
     or p_date_retrait < (now() - interval '5 minutes')
     or p_date_retrait > (now() + interval '365 days') then
    raise exception 'La date de retrait doit etre comprise entre maintenant et 365 jours' using errcode = '23514';
  end if;
  v_date_retrait := greatest(p_date_retrait, now());

  -- 4. Nettoyage et verification des notes
  v_notes_propres := nullif(trim(coalesce(p_notes, '')), '');
  if v_notes_propres is not null and char_length(v_notes_propres) > 500 then
    raise exception 'Les notes ne peuvent pas depasser 500 caracteres' using errcode = '23514';
  end if;

  -- 5. Validation du tableau d'articles JSON
  if p_articles is null or jsonb_typeof(p_articles) <> 'array' then
    raise exception 'La liste des articles doit etre un tableau JSON' using errcode = '23514';
  end if;

  v_nb_articles := jsonb_array_length(p_articles);
  if v_nb_articles < 1 or v_nb_articles > 50 then
    raise exception 'Le depot doit comporter entre 1 et 50 lignes' using errcode = '23514';
  end if;

  -- Ingestion et validation elementaire des elements JSON
  for v_ligne in select value from jsonb_array_elements(p_articles)
  loop
    declare
      v_pid_txt text := v_ligne.value ->> 'prestation_id';
      v_qte_num numeric;
      v_pid uuid;
      v_qte integer;
    begin
      if v_pid_txt is null or trim(v_pid_txt) = '' then
        raise exception 'Chaque ligne doit comporter un prestation_id' using errcode = '23514';
      end if;

      begin
        v_pid := v_pid_txt::uuid;
      exception when others then
        raise exception 'Identifiant de prestation invalide' using errcode = '23514';
      end;

      if jsonb_typeof(v_ligne.value -> 'quantite') is distinct from 'number' then
        raise exception 'La quantite doit etre un nombre entier' using errcode = '23514';
      end if;

      v_qte_num := (v_ligne.value ->> 'quantite')::numeric;
      if v_qte_num is null
         or v_qte_num <> trunc(v_qte_num)
         or v_qte_num < 1
         or v_qte_num > 999 then
        raise exception 'La quantite doit etre un entier compris entre 1 et 999' using errcode = '23514';
      end if;

      v_qte := v_qte_num::integer;

      v_index_prestation := array_position(v_prestation_ids, v_pid);
      if v_index_prestation is null then
        v_prestation_ids := array_append(v_prestation_ids, v_pid);
        v_quantites := array_append(v_quantites, v_qte);
      else
        v_quantite_agregee := v_quantites[v_index_prestation] + v_qte;
        if v_quantite_agregee > 999 then
          raise exception 'La quantite cumulee pour une prestation ne peut pas depasser 999' using errcode = '23514';
        end if;
        v_quantites[v_index_prestation] := v_quantite_agregee;
      end if;
    end;
  end loop;

  -- Verification de chaque prestation en base et calcul des totaux
  for v_index in 1 .. coalesce(array_length(v_prestation_ids, 1), 0)
  loop
    select pr.article, pr.service, pr.prix_xof, pr.actif into v_prest
    from public.prestations pr
    where pr.id = v_prestation_ids[v_index] and pr.pressing_id = p_pressing;

    if v_prest.article is null then
      raise exception 'Prestation introuvable dans ce pressing' using errcode = 'P0002';
    end if;

    if not v_prest.actif then
      raise exception 'Une des prestations selectionnees est inactive' using errcode = 'P0008';
    end if;

    v_articles := array_append(v_articles, v_prest.article);
    v_services := array_append(v_services, v_prest.service);
    v_prix_unitaires := array_append(v_prix_unitaires, v_prest.prix_xof);

    v_total_calcule := v_total_calcule
      + (v_prest.prix_xof::bigint * v_quantites[v_index]::bigint);
  end loop;

  if v_total_calcule > 2147483647 then
    raise exception 'Le total du depot depasse le montant maximal autorise' using errcode = '23514';
  end if;

  -- 6. Generation atomique du numero de ticket (fuseau Africa/Abidjan)
  v_jour := (now() at time zone 'Africa/Abidjan')::date;
  v_jour_str := to_char(v_jour, 'YYYYMMDD');

  insert into public.compteurs_tickets as c (pressing_id, jour, dernier)
  values (p_pressing, v_jour, 1)
  on conflict (pressing_id, jour)
  do update set dernier = c.dernier + 1
  returning c.dernier into v_dernier;

  v_num_ticket := 'DP-' || v_jour_str || '-'
    || lpad(v_dernier::text, greatest(4, char_length(v_dernier::text)), '0');

  -- 7. Insertion du depot
  insert into public.depots (
    pressing_id,
    numero_ticket,
    client_id,
    statut,
    date_depot,
    date_retrait_prevue,
    total_xof,
    notes,
    cree_par
  ) values (
    p_pressing,
    v_num_ticket,
    p_client,
    'depose',
    now(),
    v_date_retrait,
    v_total_calcule,
    v_notes_propres,
    v_user
  ) returning id into v_nouveau_depot_id;

  -- 8. Insertion des articles figes
  for v_index in 1 .. coalesce(array_length(v_prestation_ids, 1), 0)
  loop
    insert into public.depot_articles (
      pressing_id,
      depot_id,
      prestation_id,
      article,
      service,
      prix_unitaire_xof,
      quantite
    ) values (
      p_pressing,
      v_nouveau_depot_id,
      v_prestation_ids[v_index],
      v_articles[v_index],
      v_services[v_index],
      v_prix_unitaires[v_index],
      v_quantites[v_index]
    );
  end loop;

  -- 9. Ligne initiale d'historique
  insert into public.depot_historique (
    pressing_id,
    depot_id,
    ancien_statut,
    nouveau_statut,
    par
  ) values (
    p_pressing,
    v_nouveau_depot_id,
    null,
    'depose',
    v_user
  );

  return query select v_nouveau_depot_id, v_num_ticket;
end;
$$;

revoke all on function public.creer_depot(uuid, uuid, timestamptz, jsonb, text) from public, anon;
grant execute on function public.creer_depot(uuid, uuid, timestamptz, jsonb, text) to authenticated;

-- 9. Fonction de modification de la date de retrait
create or replace function public.modifier_date_retrait(
  p_depot uuid,
  p_date_retrait timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_depot record;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  select d.id, d.pressing_id, d.statut, d.date_depot
  into v_depot
  from public.depots d
  where d.id = p_depot
    and public.a_role(
      d.pressing_id,
      array['proprietaire', 'gerant', 'receptionniste']::public.role_membre[]
    )
  for update;

  if not found then
    raise exception 'Depot introuvable' using errcode = 'P0002';
  end if;

  if v_depot.statut in ('livre', 'annule') then
    raise exception 'Impossible de modifier la date de retrait d un depot termine ou annule' using errcode = 'P0009';
  end if;

  if p_date_retrait is null
     or p_date_retrait < v_depot.date_depot
     or p_date_retrait > (v_depot.date_depot + interval '365 days') then
    raise exception 'La date de retrait doit etre posterieure au depot et inferieure a 365 jours' using errcode = '23514';
  end if;

  update public.depots
  set date_retrait_prevue = p_date_retrait
  where id = v_depot.id;
end;
$$;

revoke all on function public.modifier_date_retrait(uuid, timestamptz) from public, anon;
grant execute on function public.modifier_date_retrait(uuid, timestamptz) to authenticated;
