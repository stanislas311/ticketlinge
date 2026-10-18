-- Test d'isolation entre pressings.
-- A relancer dans l'editeur SQL de Supabase apres chaque migration.
-- Resultat attendu : pressings_visibles_par_b = 1, membres_visibles_par_b = 1,
-- pressings_modifies_par_b = 0. La derniere ligne annule toutes les donnees de test.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.creer_pressing('Pressing A', 'Abidjan', null);

select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select public.creer_pressing('Pressing B', 'Bouake', null);

with tentative as (
  update public.pressings set nom = 'Pirate' where nom = 'Pressing A' returning 1
)
select
  (select count(*) from public.pressings) as pressings_visibles_par_b,
  (select count(*) from public.membres) as membres_visibles_par_b,
  (select count(*) from tentative) as pressings_modifies_par_b;

rollback;