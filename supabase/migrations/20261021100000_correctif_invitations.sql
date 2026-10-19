-- Correctif pour lister_equipe : lever l'ambiguite sur utilisateur_id avec l'alias de table.

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
    select 1 from public.membres m
    where m.pressing_id = p_pressing and m.utilisateur_id = v_user
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
