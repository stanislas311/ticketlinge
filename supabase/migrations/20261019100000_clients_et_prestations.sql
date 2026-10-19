-- Clients et prestations (catalogue de tarifs) : isolation par pressing et RLS.

-- 1. Table des clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 2 and 100),
  telephone text not null check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  constraint clients_pressing_telephone_key unique (pressing_id, telephone)
);

create index clients_pressing_idx on public.clients (pressing_id);

-- 2. Table des prestations (catalogue de tarifs)
create table public.prestations (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  article text not null check (char_length(trim(article)) between 2 and 100),
  service text not null check (char_length(trim(service)) between 2 and 100),
  prix_xof integer not null check (prix_xof >= 0),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  constraint prestations_pressing_article_service_key unique (pressing_id, article, service)
);

create index prestations_pressing_idx on public.prestations (pressing_id);

-- Activation de la securite ligne par ligne (RLS)
alter table public.clients enable row level security;
alter table public.prestations enable row level security;

-- Droits de table : revocation totale puis attribution minimale
revoke all on public.clients from anon, authenticated;
revoke all on public.prestations from anon, authenticated;

-- Droits sur clients : pressing_id non modifiable apres creation, suppression directe interdite
grant select on public.clients to authenticated;
grant insert (pressing_id, nom, telephone) on public.clients to authenticated;
grant update (nom, telephone, actif) on public.clients to authenticated;

-- Droits sur prestations : reserve a proprietaire et gerant, pressing_id non modifiable
grant select on public.prestations to authenticated;
grant insert (pressing_id, article, service, prix_xof) on public.prestations to authenticated;
grant update (article, service, prix_xof, actif) on public.prestations to authenticated;

-- Regles RLS : clients
create policy clients_lecture on public.clients
  for select to authenticated
  using (public.est_membre(pressing_id));

create policy clients_insertion on public.clients
  for insert to authenticated
  with check (public.a_role(pressing_id, array['proprietaire', 'gerant', 'receptionniste']::public.role_membre[]));

create policy clients_modification on public.clients
  for update to authenticated
  using (public.a_role(pressing_id, array['proprietaire', 'gerant', 'receptionniste']::public.role_membre[]))
  with check (public.a_role(pressing_id, array['proprietaire', 'gerant', 'receptionniste']::public.role_membre[]));

-- Regles RLS : prestations
create policy prestations_lecture on public.prestations
  for select to authenticated
  using (public.est_membre(pressing_id));

create policy prestations_insertion on public.prestations
  for insert to authenticated
  with check (public.a_role(pressing_id, array['proprietaire', 'gerant']::public.role_membre[]));

create policy prestations_modification on public.prestations
  for update to authenticated
  using (public.a_role(pressing_id, array['proprietaire', 'gerant']::public.role_membre[]))
  with check (public.a_role(pressing_id, array['proprietaire', 'gerant']::public.role_membre[]));
