-- Test d'isolation multi-pressings : clients, prestations et fondation.
-- A executer dans l'editeur SQL de Supabase.
-- Produit un tableau unique recapitulatif de l'ensemble des verifications.
-- La derniere instruction annule toutes les donnees de test (rollback).

begin;

-- 1. Table temporaire pour collecter les resultats
create temp table test_resultats (
  id serial primary key,
  verification text not null,
  attendu text not null,
  obtenu text not null,
  ok boolean not null
);

-- 2. Fonction temporaire d'execution et de capture des verifications
create or replace function pg_temp.tester(
  p_nom text,
  p_sql text,
  p_attendu text
)
returns void
language plpgsql
security invoker
as $$
declare
  v_obtenu text;
  v_count bigint;
begin
  begin
    if p_attendu in ('succes', 'erreur') then
      execute p_sql;
      v_obtenu := 'succes';
    else
      execute p_sql into v_count;
      v_obtenu := coalesce(v_count::text, '0');
    end if;
  exception when others then
    v_obtenu := 'erreur';
  end;

  insert into test_resultats (verification, attendu, obtenu, ok)
  values (p_nom, p_attendu, v_obtenu, (v_obtenu = p_attendu));
end;
$$;

grant all on test_resultats to authenticated;
grant all on sequence test_resultats_id_seq to authenticated;
grant execute on function pg_temp.tester(text, text, text) to authenticated;

-- 3. Preparation des donnees par le superutilisateur
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local');

-- Pressing A cree directement par le superutilisateur avec ses membres
insert into public.pressings (id, nom, ville) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pressing A', 'Abidjan');

insert into public.membres (pressing_id, utilisateur_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'proprietaire'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'receptionniste');

-- 4. Passage au role authenticated
set local role authenticated;

-- 5. Execution des tests dans un bloc PL/pgSQL
do $$
begin
  -- B cree son pressing B via creer_pressing
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform public.creer_pressing('Pressing B', 'Bouake', null);

  -- Verifications existantes (isolation fondation)
  perform pg_temp.tester(
    '01. Pressings visibles par B',
    $sql$select count(*) from public.pressings$sql$,
    '1'
  );
  perform pg_temp.tester(
    '02. Membres visibles par B',
    $sql$select count(*) from public.membres$sql$,
    '1'
  );
  perform pg_temp.tester(
    '03. Pressing A modifie par B',
    $sql$with t as (update public.pressings set nom = 'Pirate' where nom = 'Pressing A' returning 1) select count(*) from t$sql$,
    '0'
  );

  -- A cree un client et une prestation dans son pressing A
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  insert into public.clients (pressing_id, nom, telephone)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client A1', '+2250101010101');

  insert into public.prestations (pressing_id, article, service, prix_xof)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chemise', 'Lavage', 1500);

  -- Verification 1 : B ne voit aucun client ni aucune prestation du pressing A
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform pg_temp.tester(
    '04. B ne voit aucun client du pressing A',
    $sql$select count(*) from public.clients where pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$sql$,
    '0'
  );
  perform pg_temp.tester(
    '05. B ne voit aucune prestation du pressing A',
    $sql$select count(*) from public.prestations where pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$sql$,
    '0'
  );

  -- Verification 2 : B ne peut pas inserer de client ni de prestation dans le pressing A
  perform pg_temp.tester(
    '06. B ne peut pas inserer de client dans pressing A',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client Pirate', '+2250102030499')$sql$,
    'erreur'
  );
  perform pg_temp.tester(
    '07. B ne peut pas inserer de prestation dans pressing A',
    $sql$insert into public.prestations (pressing_id, article, service, prix_xof) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Veste', 'Lavage', 3000)$sql$,
    'erreur'
  );

  -- B cree un client dans son propre pressing B
  insert into public.clients (pressing_id, nom, telephone)
  values ((select id from public.pressings where nom = 'Pressing B'), 'Client B1', '+2250202020202');

  -- Verification 3 : B ne peut pas modifier le pressing_id d'une ligne existante
  perform pg_temp.tester(
    '08. B ne peut pas modifier le pressing_id d''un client',
    $sql$update public.clients set pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where telephone = '+2250202020202'$sql$,
    'erreur'
  );

  -- Verification 4 : Receptionniste C du pressing A peut creer un client mais PAS creer/modifier une prestation
  perform set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  perform pg_temp.tester(
    '09. Receptionniste C peut creer un client dans pressing A',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client C1', '+2250303030303')$sql$,
    'succes'
  );
  perform pg_temp.tester(
    '10. Receptionniste C ne peut pas creer de prestation',
    $sql$insert into public.prestations (pressing_id, article, service, prix_xof) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Robe', 'Nettoyage', 2500)$sql$,
    'erreur'
  );
  perform pg_temp.tester(
    '11. Receptionniste C ne peut pas modifier de prestation (0 ligne modifiee)',
    $sql$with t as (update public.prestations set prix_xof = 9999 where article = 'Chemise' returning 1) select count(*) from t$sql$,
    '0'
  );

  -- Verification 5 : Proprietaire A peut creer une prestation
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '12. Proprietaire A peut creer une prestation',
    $sql$insert into public.prestations (pressing_id, article, service, prix_xof) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pantalon', 'Repassage', 1000)$sql$,
    'succes'
  );

  -- Verification 6 : Meme telephone accepte dans A et B, mais refuse en doublon dans A
  perform pg_temp.tester(
    '13. Telephone +2250707070707 accepte dans pressing A',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client Partage A', '+2250707070707')$sql$,
    'succes'
  );
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform pg_temp.tester(
    '14. Meme telephone +2250707070707 accepte dans pressing B',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ((select id from public.pressings where nom = 'Pressing B'), 'Client Partage B', '+2250707070707')$sql$,
    'succes'
  );
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '15. Doublon telephone refuse dans pressing A',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Doublon A', '+2250707070707')$sql$,
    'erreur'
  );

  -- Verification 7 : Numero mal forme refuse, prix negatif refuse
  perform pg_temp.tester(
    '16. Telephone mal forme refuse (format E.164)',
    $sql$insert into public.clients (pressing_id, nom, telephone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Invalide', '0102030405')$sql$,
    'erreur'
  );
  perform pg_temp.tester(
    '17. Prix negatif refuse (check prix_xof >= 0)',
    $sql$insert into public.prestations (pressing_id, article, service, prix_xof) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Veste', 'Lavage', -500)$sql$,
    'erreur'
  );

  -- Verification 8 : Aucune suppression directe n'est possible
  perform pg_temp.tester(
    '18. Suppression directe interdite sur clients',
    $sql$delete from public.clients where telephone = '+2250101010101'$sql$,
    'erreur'
  );
  perform pg_temp.tester(
    '19. Suppression directe interdite sur prestations',
    $sql$delete from public.prestations where article = 'Chemise'$sql$,
    'erreur'
  );
end;
$$;

-- 6. Affichage du resultat sous forme d'un tableau unique
select verification, attendu, obtenu, ok from test_resultats order by id;

rollback;