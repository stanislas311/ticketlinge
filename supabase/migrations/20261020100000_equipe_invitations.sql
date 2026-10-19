-- Gestion de l'equipe par lien d'invitation : invitations, membres et securite RLS.

-- 1. Table des invitations
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  role public.role_membre not null check (role in ('gerant', 'receptionniste')),
  jeton_hash text not null unique,
  cree_par uuid not null references auth.users (id),
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null default (now() + interval '7 days'),
  utilisee_le timestamptz,
  utilisee_par uuid references auth.users (id),
  revoquee_le timestamptz
);

create index invitations_pressing_idx on public.invitations (pressing_id);
create index invitations_jeton_hash_idx on public.invitations (jeton_hash);

-- Activation de la securite ligne par ligne (RLS)
alter table public.invitations enable row level security;

-- Droits de table : aucune ecriture directe, lecture sans la colonne jeton_hash
revoke all on public.invitations from anon, authenticated;
grant select (id, pressing_id, role, cree_par, cree_le, expire_le, utilisee_le, utilisee_par, revoquee_le) on public.invitations to authenticated;

-- Regle RLS : lecture reservee aux proprietaires et gerants du pressing
create policy invitations_lecture on public.invitations
  for select to authenticated
  using (public.a_role(pressing_id, array['proprietaire', 'gerant']::public.role_membre[]));

-- 2. Fonction de creation d'invitation
create or replace function public.creer_invitation(
  p_pressing uuid,
  p_role public.role_membre
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_mon_role public.role_membre;
  v_nb_en_attente integer;
  v_jeton text;
  v_hash text;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  select role into v_mon_role
  from public.membres
  where pressing_id = p_pressing and utilisateur_id = v_user;

  if v_mon_role is null then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  if p_role = 'proprietaire' or p_role not in ('gerant', 'receptionniste') then
    raise exception 'Le role proprietaire ne peut pas etre attribue par invitation' using errcode = '42501';
  end if;

  if v_mon_role = 'receptionniste' then
    raise exception 'Droits insuffisants pour creer une invitation' using errcode = '42501';
  end if;

  if v_mon_role = 'gerant' and p_role <> 'receptionniste' then
    raise exception 'Un gerant ne peut inviter qu un receptionniste' using errcode = '42501';
  end if;

  select count(*) into v_nb_en_attente
  from public.invitations
  where pressing_id = p_pressing
    and utilisee_le is null
    and revoquee_le is null
    and expire_le > now();

  if v_nb_en_attente >= 20 then
    raise exception 'Limite maximale d invitations en attente atteinte (20 maximum)' using errcode = 'P0001';
  end if;

  v_jeton := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');
  v_hash := encode(extensions.digest(convert_to(v_jeton, 'UTF8'), 'sha256'), 'hex');

  insert into public.invitations (pressing_id, role, jeton_hash, cree_par)
  values (p_pressing, p_role, v_hash, v_user);

  return v_jeton;
end;
$$;

revoke all on function public.creer_invitation(uuid, public.role_membre) from public, anon;
grant execute on function public.creer_invitation(uuid, public.role_membre) to authenticated;

-- 3. Fonction d'acceptation d'invitation
create or replace function public.accepter_invitation(
  p_jeton text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_hash text;
  v_invitation record;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  v_hash := encode(extensions.digest(convert_to(trim(coalesce(p_jeton, '')), 'UTF8'), 'sha256'), 'hex');

  select * into v_invitation
  from public.invitations
  where jeton_hash = v_hash
  for update;

  if not found then
    raise exception 'Invitation invalide ou expiree' using errcode = 'P0002';
  end if;

  if v_invitation.utilisee_le is not null
     or v_invitation.revoquee_le is not null
     or v_invitation.expire_le <= now() then
    raise exception 'Invitation invalide ou expiree' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.membres
    where pressing_id = v_invitation.pressing_id and utilisateur_id = v_user
  ) then
    raise exception 'Vous etes deja membre de ce pressing' using errcode = 'P0003';
  end if;

  insert into public.membres (pressing_id, utilisateur_id, role)
  values (v_invitation.pressing_id, v_user, v_invitation.role);

  update public.invitations
  set utilisee_le = now(),
      utilisee_par = v_user
  where id = v_invitation.id;

  return v_invitation.pressing_id;
end;
$$;

revoke all on function public.accepter_invitation(text) from public, anon;
grant execute on function public.accepter_invitation(text) to authenticated;

-- 4. Fonction de revocation d'invitation
create or replace function public.revoquer_invitation(
  p_invitation uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_invitation record;
  v_mon_role public.role_membre;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  select * into v_invitation
  from public.invitations
  where id = p_invitation
  for update;

  if not found then
    raise exception 'Invitation introuvable' using errcode = 'P0002';
  end if;

  select role into v_mon_role
  from public.membres
  where pressing_id = v_invitation.pressing_id and utilisateur_id = v_user;

  if v_mon_role is null or v_mon_role = 'receptionniste' then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  if v_mon_role = 'gerant' and v_invitation.role <> 'receptionniste' then
    raise exception 'Un gerant ne peut revoquer que les invitations de receptionniste' using errcode = '42501';
  end if;

  if v_invitation.utilisee_le is not null then
    raise exception 'Cette invitation a deja ete utilisee' using errcode = 'P0004';
  end if;

  update public.invitations
  set revoquee_le = coalesce(revoquee_le, now())
  where id = v_invitation.id;
end;
$$;

revoke all on function public.revoquer_invitation(uuid) from public, anon;
grant execute on function public.revoquer_invitation(uuid) to authenticated;

-- 5. Fonctions de gestion des membres (role et depart)
create or replace function public.changer_role_membre(
  p_pressing uuid,
  p_utilisateur uuid,
  p_role public.role_membre
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_cible_role public.role_membre;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.membres
    where pressing_id = p_pressing and utilisateur_id = v_user and role = 'proprietaire'
  ) then
    raise exception 'Seul le proprietaire peut modifier les roles' using errcode = '42501';
  end if;

  if p_utilisateur = v_user then
    raise exception 'Vous ne pouvez pas modifier votre propre role' using errcode = 'P0005';
  end if;

  if p_role not in ('gerant', 'receptionniste') then
    raise exception 'Le role proprietaire ne peut pas etre attribue par cette operation' using errcode = 'P0006';
  end if;

  select role into v_cible_role
  from public.membres
  where pressing_id = p_pressing and utilisateur_id = p_utilisateur;

  if v_cible_role is null then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;

  if v_cible_role = 'proprietaire' then
    if (select count(*) from public.membres where pressing_id = p_pressing and role = 'proprietaire') <= 1 then
      raise exception 'Impossible de modifier le role du dernier proprietaire' using errcode = 'P0007';
    end if;
  end if;

  update public.membres
  set role = p_role
  where pressing_id = p_pressing and utilisateur_id = p_utilisateur;
end;
$$;

revoke all on function public.changer_role_membre(uuid, uuid, public.role_membre) from public, anon;
grant execute on function public.changer_role_membre(uuid, uuid, public.role_membre) to authenticated;

create or replace function public.retirer_membre(
  p_pressing uuid,
  p_utilisateur uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_cible_role public.role_membre;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.membres
    where pressing_id = p_pressing and utilisateur_id = v_user and role = 'proprietaire'
  ) then
    raise exception 'Seul le proprietaire peut retirer un membre' using errcode = '42501';
  end if;

  select role into v_cible_role
  from public.membres
  where pressing_id = p_pressing and utilisateur_id = p_utilisateur;

  if v_cible_role is null then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;

  if v_cible_role = 'proprietaire' then
    if (select count(*) from public.membres where pressing_id = p_pressing and role = 'proprietaire') <= 1 then
      raise exception 'Impossible de retirer le dernier proprietaire' using errcode = 'P0007';
    end if;
  end if;

  delete from public.membres
  where pressing_id = p_pressing and utilisateur_id = p_utilisateur;
end;
$$;

revoke all on function public.retirer_membre(uuid, uuid) from public, anon;
grant execute on function public.retirer_membre(uuid, uuid) to authenticated;

-- 6. Fonction de consultation securisee de l'equipe
create or replace function public.lister_equipe(
  p_pressing uuid
)
returns table (
  utilisateur_id uuid,
  email text,
  role public.role_membre,
  cree_le timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.membres
    where pressing_id = p_pressing and utilisateur_id = v_user
  ) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  return query
  select
    m.utilisateur_id,
    u.email::text,
    m.role,
    m.cree_le
  from public.membres m
  join auth.users u on u.id = m.utilisateur_id
  where m.pressing_id = p_pressing
  order by m.cree_le asc;
end;
$$;

revoke all on function public.lister_equipe(uuid) from public, anon;
grant execute on function public.lister_equipe(uuid) to authenticated;
