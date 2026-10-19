-- Test d'isolation multi-pressings : equipe, invitations, clients, prestations et fondation.
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

-- 2. Fonctions temporaires d'execution et d'aide
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
  v_state text;
  v_msg text;
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
    get stacked diagnostics
      v_state = returned_sqlstate,
      v_msg = message_text;

    if p_attendu = 'erreur' then
      v_obtenu := 'erreur';
    else
      v_obtenu := v_state || ': ' || v_msg;
    end if;
  end;

  insert into test_resultats (verification, attendu, obtenu, ok)
  values (p_nom, p_attendu, v_obtenu, (v_obtenu = p_attendu));
end;
$$;

create or replace function pg_temp.trouver_id_invitation(p_jeton text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_id uuid;
begin
  v_hash := encode(extensions.digest(convert_to(p_jeton, 'UTF8'), 'sha256'), 'hex');
  select id into v_id from public.invitations where jeton_hash = v_hash;
  return v_id;
end;
$$;

create or replace function pg_temp.forcer_expiration_invitation(p_jeton text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  v_hash := encode(extensions.digest(convert_to(p_jeton, 'UTF8'), 'sha256'), 'hex');
  update public.invitations
  set expire_le = now() - interval '1 day'
  where jeton_hash = v_hash;
end;
$$;

grant all on test_resultats to authenticated;
grant all on sequence test_resultats_id_seq to authenticated;
grant execute on function pg_temp.tester(text, text, text) to authenticated;
grant execute on function pg_temp.trouver_id_invitation(text) to authenticated;
grant execute on function pg_temp.forcer_expiration_invitation(text) to authenticated;

-- 3. Preparation des donnees par le superutilisateur
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'd@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'e@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'f@test.local');

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
declare
  v_jeton_gerant text;
  v_jeton_reception text;
  v_jeton_expire text;
  v_jeton_revoque text;
  v_id_invitation_revoque uuid;
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

  -- Verification clients & prestations B vs A
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

  perform pg_temp.tester(
    '08. B ne peut pas modifier le pressing_id d''un client',
    $sql$update public.clients set pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where telephone = '+2250202020202'$sql$,
    'erreur'
  );

  -- C receptionniste pressing A
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

  -- A proprietaire pressing A
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '12. Proprietaire A peut creer une prestation',
    $sql$insert into public.prestations (pressing_id, article, service, prix_xof) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pantalon', 'Repassage', 1000)$sql$,
    'succes'
  );

  -- Unicite telephone
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

  -- Contraintes check
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

  -- Pas de suppression directe
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

  -- =========================================================================
  -- VERIFICATIONS EQUIPE ET INVITATIONS
  -- =========================================================================

  -- 20. Un receptionniste ne peut pas creer d'invitation
  perform set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  perform pg_temp.tester(
    '20. Receptionniste ne peut pas creer d''invitation',
    $sql$select public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receptionniste')$sql$,
    'erreur'
  );

  -- 21. Personne ne peut inviter un proprietaire
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '21. Personne ne peut inviter un proprietaire',
    $sql$select public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'proprietaire')$sql$,
    'erreur'
  );

  -- A invite D comme gerant
  v_jeton_gerant := public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gerant');

  -- D accepte l'invitation et devient gerant
  perform set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
  perform public.accepter_invitation(v_jeton_gerant);

  -- 22. Un gerant ne peut pas inviter un gerant
  perform pg_temp.tester(
    '22. Gerant ne peut pas inviter un gerant',
    $sql$select public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gerant')$sql$,
    'erreur'
  );

  -- 23. Gerant peut inviter un receptionniste
  perform pg_temp.tester(
    '23. Gerant peut inviter un receptionniste',
    $sql$select public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receptionniste')$sql$,
    'succes'
  );

  -- 24. Un utilisateur d'un autre pressing ne peut ni lister ni revoquer les invitations du pressing A
  -- A cree une invitation specifique pour ce test
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_jeton_revoque := public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receptionniste');
  -- Recuperation certaine de l'identifiant associe a v_jeton_revoque grace a son empreinte unique
  v_id_invitation_revoque := pg_temp.trouver_id_invitation(v_jeton_revoque);

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform pg_temp.tester(
    '24. Utilisateur autre pressing ne voit pas les invitations de A',
    $sql$select count(*) from public.invitations where pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$sql$,
    '0'
  );
  perform pg_temp.tester(
    '25. Utilisateur autre pressing ne peut pas revoquer une invitation de A',
    format($sql$select public.revoquer_invitation('%s'::uuid)$sql$, v_id_invitation_revoque),
    'erreur'
  );

  -- 26. Acceptation donne bien le role prevu (test avec E)
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_jeton_reception := public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receptionniste');

  perform set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
  perform public.accepter_invitation(v_jeton_reception);

  perform pg_temp.tester(
    '26. L''acceptation donne bien le role prevu',
    $sql$select count(*) from public.membres where pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and utilisateur_id = '55555555-5555-5555-5555-555555555555' and role = 'receptionniste'$sql$,
    '1'
  );

  -- 27. Un jeton ne s'accepte qu'une fois
  perform set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
  perform pg_temp.tester(
    '27. Un jeton ne s''accepte qu''une fois',
    format($sql$select public.accepter_invitation('%s')$sql$, v_jeton_reception),
    'erreur'
  );

  -- 28. Un jeton expire est refuse (expiration forcee en superutilisateur)
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_jeton_expire := public.creer_invitation('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receptionniste');
  perform pg_temp.forcer_expiration_invitation(v_jeton_expire);

  perform set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
  perform pg_temp.tester(
    '28. Un jeton expire est refuse',
    format($sql$select public.accepter_invitation('%s')$sql$, v_jeton_expire),
    'erreur'
  );

  -- 29. Revocation effective par le proprietaire
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform public.revoquer_invitation(v_id_invitation_revoque);

  perform pg_temp.tester(
    '29. Invitation revoquee a bien revoquee_le renseigne',
    format($sql$select count(*) from public.invitations where id = '%s' and revoquee_le is not null$sql$, v_id_invitation_revoque),
    '1'
  );

  -- 30. Un jeton revoque est refuse lors de l'acceptation par un nouvel utilisateur
  perform set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
  perform pg_temp.tester(
    '30. Un jeton revoque est refuse a un nouvel utilisateur',
    format($sql$select public.accepter_invitation('%s')$sql$, v_jeton_revoque),
    'erreur'
  );

  -- 31. L'utilisateur refuse n'a pas ete ajoute aux membres
  perform pg_temp.tester(
    '31. Utilisateur non ajoute a l''equipe suite au refus',
    $sql$select count(*) from public.membres where pressing_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and utilisateur_id = '66666666-6666-6666-6666-666666666666'$sql$,
    '0'
  );

  -- 32. Un jeton invente est refuse
  perform pg_temp.tester(
    '32. Un jeton invente est refuse',
    $sql$select public.accepter_invitation('jeton_totalement_inconnu_123456789')$sql$,
    'erreur'
  );

  -- 33. Le dernier proprietaire ne peut etre ni retire ni retrograde
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '33. Le dernier proprietaire ne peut pas modifier son propre role',
    $sql$select public.changer_role_membre('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'gerant')$sql$,
    'erreur'
  );
  perform pg_temp.tester(
    '34. Le dernier proprietaire ne peut pas etre retire',
    $sql$select public.retirer_membre('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111')$sql$,
    'erreur'
  );

  -- 35. Proprietaire A modifie le role de D (gerant -> receptionniste)
  perform pg_temp.tester(
    '35. Proprietaire peut modifier le role d''un membre',
    $sql$select public.changer_role_membre('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'receptionniste')$sql$,
    'succes'
  );

  -- 36. Proprietaire A retire E
  perform pg_temp.tester(
    '36. Proprietaire peut retirer un membre',
    $sql$select public.retirer_membre('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555')$sql$,
    'succes'
  );

  -- 37. lister_equipe d'un pressing etranger est refuse
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform pg_temp.tester(
    '37. lister_equipe d''un pressing etranger est refuse',
    $sql$select count(*) from public.lister_equipe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$sql$,
    'erreur'
  );

  -- 38. Membre de pressing A peut lister l'equipe de pressing A (membres A, C, D = 3)
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform pg_temp.tester(
    '38. Membre peut lister l''equipe de son pressing',
    $sql$select count(*) from public.lister_equipe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$sql$,
    '3'
  );

  -- 39. jeton_hash n'est lisible par personne
  perform pg_temp.tester(
    '39. jeton_hash n''est lisible par personne',
    $sql$select jeton_hash from public.invitations limit 1$sql$,
    'erreur'
  );

end;
$$;

-- 6. Affichage du resultat sous forme d'un tableau unique
select verification, attendu, obtenu, ok from test_resultats order by id;

rollback;