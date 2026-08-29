-- ============================================================
-- KPR BRI — Migrasi 0005_storage
-- Bucket 'perumahan' + kebijakan storage.objects (PRD §11).
--
-- Tiga penyimpangan yang disengaja dari §11 PRD:
--   1. §11 hanya menguji public.is_admin() untuk menulis, sehingga 'pengembang'
--      terkunci dari mengunggah foto perumahannya sendiri — bertentangan dengan
--      matriks §9.2 ("Penuh untuk perumahan miliknya"). Diperbaiki lewat
--      pemeriksaan kepemilikan berbasis path.
--   2. §11 tidak punya kebijakan UPDATE. supabase.storage.upload(upsert: true)
--      melakukan UPDATE pada objek yang sudah ada dan akan gagal tanpanya.
--   3. Batas ukuran dan MIME ditegakkan di storage.buckets, bukan di RLS —
--      itu satu-satunya tempat Storage API memeriksanya.
--
-- Rollback: delete from storage.buckets where id = 'perumahan';
-- ============================================================

set search_path = public, extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perumahan', 'perumahan', true,
        5242880,                                    -- 5 MB (PRD §9.4)
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Nama objek berpola '{housing_id}/{uuid}.webp', tetapi bucket yang sama juga
-- memuat 'developers/{id}/logo.webp'. Cast '::uuid' pada literal 'developers'
-- melempar 22P02, dan PostgreSQL tidak menjamin AND dievaluasi berurutan —
-- jadi cast-nya tidak boleh bisa melempar.
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin return p::uuid; exception when others then return null; end $$;
revoke execute on function public.try_uuid(text) from public, anon;

drop policy if exists perumahan_read_public  on storage.objects;
drop policy if exists perumahan_insert_staff on storage.objects;
drop policy if exists perumahan_update_staff on storage.objects;
drop policy if exists perumahan_delete_staff on storage.objects;

create policy perumahan_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'perumahan');

create policy perumahan_insert_staff on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'perumahan' and (
      public.is_admin()
      or exists (select 1 from public.housings h
                  where h.id = public.try_uuid((storage.foldername(name))[1])
                    and h.developer_id = public.my_developer_id())
    )
  );

create policy perumahan_update_staff on storage.objects
  for update to authenticated
  using (
    bucket_id = 'perumahan' and (
      public.is_admin()
      or exists (select 1 from public.housings h
                  where h.id = public.try_uuid((storage.foldername(name))[1])
                    and h.developer_id = public.my_developer_id())
    )
  )
  with check (
    bucket_id = 'perumahan' and (
      public.is_admin()
      or exists (select 1 from public.housings h
                  where h.id = public.try_uuid((storage.foldername(name))[1])
                    and h.developer_id = public.my_developer_id())
    )
  );

create policy perumahan_delete_staff on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'perumahan' and (
      public.is_admin()
      or exists (select 1 from public.housings h
                  where h.id = public.try_uuid((storage.foldername(name))[1])
                    and h.developer_id = public.my_developer_id())
    )
  );

-- Catatan: karena bucket ini public = true, /storage/v1/object/public/perumahan/*
-- dilayani CDN TANPA mengevaluasi perumahan_read_public. Kebijakan SELECT tetap
-- berlaku untuk list() dan signed URL. Jangan taruh apa pun di bucket ini yang
-- tidak pantas dipasang di billboard.
