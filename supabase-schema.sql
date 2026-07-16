-- =====================================================================
--  MAISON ANARA — Schéma backend
--  À coller dans Supabase  →  SQL Editor  →  New query  →  Run
--  Ré-exécutable sans danger (drop policy if exists + on conflict).
-- =====================================================================

-- ------------------------------------------------------------------
-- 1. PRODUITS
-- ------------------------------------------------------------------
create table if not exists public.produits (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nom          text not null,
  slug         text unique not null,
  description  text,
  categorie    text,
  prix         numeric(10,2) not null default 0,
  prix_promo   numeric(10,2),                          -- optionnel
  teintes      jsonb not null default '[]'::jsonb,     -- [{"nom":"Rouge cerise","hex":"#A6242A"}]
  photos       jsonb not null default '[]'::jsonb,     -- ["https://.../photo.jpg"]
  dimensions   text,
  delai        text,
  visible      boolean not null default true,          -- affiché sur le site oui/non
  ordre        int not null default 0                  -- ordre d'affichage
);

-- ------------------------------------------------------------------
-- 2. COMMANDES
-- ------------------------------------------------------------------
create table if not exists public.commandes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_nom    text not null,
  client_tel    text not null,
  client_ville  text,
  produit_id    uuid references public.produits(id) on delete set null,
  produit_nom   text,                                  -- copie du nom au moment de la commande
  teinte        text,
  quantite      int not null default 1,
  prix_unitaire numeric(10,2),
  total         numeric(10,2),
  statut        text not null default 'Nouveau',       -- Nouveau→Confirmé→Acompte reçu→Expédié→Livré→Retourné
  acompte_recu  boolean not null default false,
  notes         text,
  source        text not null default 'site'           -- site | whatsapp | instagram | manuel
);

-- ------------------------------------------------------------------
-- 3. EVENEMENTS (analytics)
-- ------------------------------------------------------------------
create table if not exists public.evenements (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  type        text not null,                           -- visite | vue_produit | clic_commander | commande
  page        text,
  produit_id  uuid,
  meta        jsonb
);

create index if not exists idx_commandes_created  on public.commandes(created_at desc);
create index if not exists idx_evenements_created  on public.evenements(created_at desc);
create index if not exists idx_evenements_type     on public.evenements(type);
create index if not exists idx_produits_slug       on public.produits(slug);

-- =====================================================================
--  ROW LEVEL SECURITY  (sécurité obligatoire)
-- =====================================================================
alter table public.produits   enable row level security;
alter table public.commandes  enable row level security;
alter table public.evenements enable row level security;

-- ---- PRODUITS : lecture publique des produits visibles, admin = tout ----
drop policy if exists "produits_lecture_publique" on public.produits;
create policy "produits_lecture_publique" on public.produits
  for select to anon using (visible = true);

drop policy if exists "produits_admin_all" on public.produits;
create policy "produits_admin_all" on public.produits
  for all to authenticated using (true) with check (true);

-- ---- COMMANDES : création publique uniquement, admin = tout ----
drop policy if exists "commandes_insert_public" on public.commandes;
create policy "commandes_insert_public" on public.commandes
  for insert to anon with check (true);

drop policy if exists "commandes_admin_all" on public.commandes;
create policy "commandes_admin_all" on public.commandes
  for all to authenticated using (true) with check (true);

-- ---- EVENEMENTS : insertion publique uniquement, admin = lecture ----
drop policy if exists "evenements_insert_public" on public.evenements;
create policy "evenements_insert_public" on public.evenements
  for insert to anon with check (true);

drop policy if exists "evenements_admin_read" on public.evenements;
create policy "evenements_admin_read" on public.evenements
  for select to authenticated using (true);

-- =====================================================================
--  STORAGE (photos produits)
--  ⚠️ Créez d'abord le bucket PUBLIC nommé "produits" dans l'onglet Storage,
--     puis ces politiques réservent l'écriture à l'admin connecté.
-- =====================================================================
drop policy if exists "produits_storage_lecture_publique" on storage.objects;
create policy "produits_storage_lecture_publique" on storage.objects
  for select using (bucket_id = 'produits');

drop policy if exists "produits_storage_admin_insert" on storage.objects;
create policy "produits_storage_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'produits');

drop policy if exists "produits_storage_admin_update" on storage.objects;
create policy "produits_storage_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'produits');

drop policy if exists "produits_storage_admin_delete" on storage.objects;
create policy "produits_storage_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'produits');

-- =====================================================================
--  DONNÉES DE DÉPART — les 2 produits actuels
-- =====================================================================
insert into public.produits (nom, slug, description, categorie, prix, prix_promo, teintes, photos, dimensions, delai, visible, ordre)
values
(
  'Selma', 'selma',
  'Silhouette rétro, base galbée façonnée à la main et abat-jour ivoire à la texture minérale. Selma diffuse une lumière chaude et intime — la pièce qui change l''atmosphère d''une chambre ou d''un salon.',
  'Lampe de table', 849, null,
  '[{"nom":"Rouge cerise","hex":"#A6242A"},{"nom":"Ivoire","hex":"#F1E9DA"},{"nom":"Vert sauge","hex":"#7B8464"},{"nom":"Bleu nuit","hex":"#28324E"}]'::jsonb,
  '["images/lampe-selma.jpg"]'::jsonb,
  'H 46 cm × Ø 19 cm', '5 à 7 jours ouvrés', true, 1
),
(
  'Rita', 'rita',
  'Suspension sculpturale laquée à la main, au galbe généreux. Une pièce qui habille une entrée, un coin repas ou une vitrine.',
  'Suspension', 699, null,
  '[{"nom":"Rouge cerise","hex":"#A6242A"},{"nom":"Ivoire","hex":"#F1E9DA"},{"nom":"Vert sauge","hex":"#7B8464"},{"nom":"Bleu nuit","hex":"#28324E"}]'::jsonb,
  '["images/suspension-rita.jpg"]'::jsonb,
  null, '5 à 7 jours ouvrés', true, 2
)
on conflict (slug) do nothing;
