-- Fondation multi-pressings : pressings, membres, isolation par RLS.

create type public.role_membre as enum ('proprietaire', 'gerant', 'receptionniste');

create table public.pressings (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(trim(nom)) between 2 and 100),
  ville text not null check (char_length(trim(ville)) between 2 and 100),
  telephone text,
  plan text not null default 'essai' check (plan in ('essai', 'standard', 'pro')),
  fin_essai timestamptz not null default (now() + interval '30 days'),
  cree_le timestamptz not null default now()
);

create table public.membres (
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  role public.role_membre not null,
  cree_le timestamptz not null default now(),
  primary key (pressing_id, utilisateur_id)
);

create index membres_utilisateur_idx on public.membres (utilisateur_id);

alter table public.pressings enable row level security;
alter table public.membres enable row level security;

-- Fonctions d'aide : security definer pour eviter la recursion des regles RLS.
create or replace function public.est_membre(p_pressing uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membres m
    where m.pressing_id = p_pressing
      and m.utilisateur_id = (select auth.uid())
  );
$$;

create or replace function public.a_role(p_pressing uuid, p_roles public.role_membre[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membres m
    where m.pressing_id = p_pressing
      and m.utilisateur_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

revoke all on function public.est_membre(uuid) from public, anon;
revoke all on function public.a_role(uuid, public.role_membre[]) from public, anon;
grant execute on function public.est_membre(uuid) to authenticated;
grant execute on function public.a_role(uuid, public.role_membre[]) to authenticated;

-- Droits de table : lecture pour les connectes, aucune ecriture directe sauf nom/ville/telephone.
revoke all on public.pressings from anon, authenticated;
revoke all on public.membres from anon, authenticated;
grant select on public.pressings to authenticated;
grant select on public.membres to authenticated;
grant update (nom, ville, telephone) on public.pressings to authenticated;

-- Regles RLS
create policy pressings_lecture on public.pressings
  for select to authenticated
  using (public.est_membre(id));

create policy pressings_modification on public.pressings
  for update to authenticated
  using (public.a_role(id, array['proprietaire']::public.role_membre[]))
  with check (public.a_role(id, array['proprietaire']::public.role_membre[]));

create policy membres_lecture on public.membres
  for select to authenticated
  using (public.est_membre(pressing_id));

-- Inscription : cree le pressing et son proprietaire en une seule operation.
create or replace function public.creer_pressing(
  p_nom text,
  p_ville text,
  p_telephone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if (select count(*) from public.membres
      where utilisateur_id = v_user and role = 'proprietaire') >= 3 then
    raise exception 'Nombre maximal de pressings atteint' using errcode = 'P0001';
  end if;

  insert into public.pressings (nom, ville, telephone)
  values (trim(p_nom), trim(p_ville), nullif(trim(coalesce(p_telephone, '')), ''))
  returning id into v_id;

  insert into public.membres (pressing_id, utilisateur_id, role)
  values (v_id, v_user, 'proprietaire');

  return v_id;
end;
$$;

revoke all on function public.creer_pressing(text, text, text) from public, anon;
grant execute on function public.creer_pressing(text, text, text) to authenticated;
