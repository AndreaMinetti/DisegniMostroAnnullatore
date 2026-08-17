-- ESEGUI QUESTO FILE UNA SOLA VOLTA NEL SQL EDITOR DI SUPABASE.
-- Prima abilita: Authentication > Providers > Anonymous Sign-Ins.

begin;

create extension if not exists pgcrypto;

-- Archivio privato: nessun URL pubblico delle immagini.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'drawings',
  'drawings',
  false,
  10485760,
  array['image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null unique,
  consent_parent boolean not null,
  consent_publication boolean not null,
  processed_client_side boolean not null default false,
  created_at timestamptz not null default now(),

  constraint consent_parent_required check (consent_parent = true),
  constraint consent_publication_required check (consent_publication = true),
  constraint path_must_be_incoming check (storage_path like 'incoming/%')
);

alter table public.submissions enable row level security;

-- Rimuove le policy omonime, così lo script può essere rieseguito.
drop policy if exists "anonymous users can insert own submission" on public.submissions;
create policy "anonymous users can insert own submission"
on public.submissions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and consent_parent = true
  and consent_publication = true
  and storage_path like ('incoming/' || (select auth.uid())::text || '/%')
);

-- Nessuna policy SELECT/UPDATE/DELETE sulla tabella:
-- il browser pubblico non può leggere o modificare le registrazioni.
-- Tu le vedrai dal Dashboard Supabase.

drop policy if exists "anonymous users can upload to own folder" on storage.objects;
create policy "anonymous users can upload to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'drawings'
  and (storage.foldername(name))[1] = 'incoming'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- Supabase Storage può restituire i dati dell'oggetto dopo l'upload.
-- Questa policy permette a ciascun utente anonimo di vedere SOLO i propri file.
drop policy if exists "anonymous users can read own uploaded objects" on storage.objects;
create policy "anonymous users can read own uploaded objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'drawings'
  and (storage.foldername(name))[1] = 'incoming'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- Nessuna policy pubblica di UPDATE o DELETE.
-- Le immagini restano private e vengono gestite da te nel Dashboard.

commit;
