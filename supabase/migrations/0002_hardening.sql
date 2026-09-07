-- ============================================================
-- KPR BRI — Migrasi 0002_hardening
--
-- Menutup tiga hal yang dijanjikan PRD tetapi tidak ada di 0001:
--   1. GRANT tingkat tabel (§9.2 "lapis 1"). Supabase memberi anon/authenticated
--      hak penuh atas tabel `public` secara bawaan, sehingga tanpa blok ini yang
--      menahan `anon` hanyalah RLS — satu lapis, bukan dua.
--   2. Trigger auth.users -> profiles (§9.1). Tanpa ini `profiles` tidak pernah
--      terbuat, `is_admin()` selalu false, dan tidak ada yang bisa jadi admin.
--   3. Kolom penanda kualitas data + perluasan v_housing_public untuk UI.
-- Plus satu perbaikan bug pada filter harga `search_housings`.
--
-- Rollback: lihat catatan di tiap bagian.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. OTORISASI LAPIS 1 — GRANT tingkat tabel
--    Rollback: grant all on all tables in schema public to anon, authenticated;
-- ============================================================

revoke all on all tables in schema public from anon, authenticated;

-- Tabel yang memang dibaca publik. `anon` tetap butuh SELECT pada `housings`
-- karena v_housing_public memakai security_invoker dan RPC nearest/search
-- berjalan sebagai security invoker — mencabutnya mematikan halaman publik.
-- Yang menyaring baris tetap RLS.
grant select on
  public.housings, public.housing_images, public.housing_contacts,
  public.developers, public.regions, public.app_settings
  to anon, authenticated;

-- Analitik: publik hanya boleh menulis, tidak boleh membaca.
grant insert on public.housing_events to anon, authenticated;
grant select on public.housing_events to authenticated;

-- Data pribadi & jejak audit: `anon` tidak diberi hak apa pun. Percobaan akses
-- ditolak sebelum RLS sempat dievaluasi.
grant select, insert, update, delete on
  public.leads, public.lead_notes, public.profiles
  to authenticated;
grant select on public.audit_logs to authenticated;

-- Staf menulis lewat sesi login; RLS yang memutuskan baris mana.
grant insert, update, delete on
  public.housings, public.housing_images, public.housing_contacts,
  public.developers, public.regions, public.app_settings
  to authenticated;

-- public.notification_outbox: sengaja tanpa grant sama sekali (service_role saja).

-- Tabel baru di masa depan tidak boleh otomatis terbuka untuk anon.
alter default privileges in schema public revoke all on tables from anon;

-- ============================================================
-- 2. PROFIL OTOMATIS SAAT PENDAFTARAN
--    Peran bawaan selalu 'viewer'. Kenaikan ke 'admin' dilakukan manual —
--    tidak pernah otomatis (PRD §9.1).
--    Rollback: drop trigger on_auth_user_created on auth.users;
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tangkap juga akun yang mungkin sudah dibuat sebelum trigger ini ada.
insert into public.profiles (id, full_name, role)
select u.id, '', 'viewer' from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ============================================================
-- 3. PENANDA KUALITAS DATA
--    Rollback: alter table public.housings drop column needs_review;
-- ============================================================

alter table public.housings
  add column if not exists needs_review boolean not null default false;

comment on column public.housings.needs_review is
  'true = sebagian angka diturunkan saat migrasi dari housing-storage.ts dan '
  'belum diverifikasi tim data BRI (PRD §8.1 D-1..D-5). Lihat docs/DATA-TODO.md.';

-- LQIP: image-blur.ts dikunci pada path /kpr-assets/*.jpg. Begitu gambar
-- dilayani dari Storage, kunci-kunci itu meleset dan blur diam-diam mati.
alter table public.housing_images
  add column if not exists blur_data_url text;

-- ============================================================
-- 4. PERBAIKAN BUG: filter harga search_housings
--
--    Sebelumnya KEDUA batas dibandingkan terhadap price_min:
--      and (p_min_price is null or h.price_min >= p_min_price)   -- salah
--      and (p_max_price is null or h.price_min <= p_max_price)   -- benar
--
--    Baris kedua benar (unit termurah masuk anggaran). Baris pertama salah:
--    perumahan dengan rentang 100-500 juta hilang dari pencarian "minimal
--    200 juta", padahal punya unit di angka itu. Yang benar adalah irisan
--    rentang: h.price_min <= p_max_price AND h.price_max >= p_min_price.
-- ============================================================

create or replace function public.search_housings(
  p_q text default null,
  p_district text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, slug citext, name text, address text,
  lat double precision, lng double precision,
  price_min numeric, available_units integer, rank real
)
language sql stable security invoker set search_path = public as $$
  select h.id, h.slug, h.name, h.address, h.lat, h.lng,
         h.price_min, h.available_units,
         case when p_q is null then 1::real
              else ts_rank(h.search_tsv, plainto_tsquery('simple', p_q)) end as rank
  from public.housings h
  left join public.regions r on r.id = h.region_id
  where h.status = 'published'
    and h.deleted_at is null
    and (p_q is null or h.search_tsv @@ plainto_tsquery('simple', p_q) or h.name ilike '%' || p_q || '%')
    and (p_district is null or r.district = p_district)
    and (p_min_price is null or coalesce(h.price_max, h.price_min) >= p_min_price)
    and (p_max_price is null or h.price_min <= p_max_price)
  order by rank desc, h.name asc
  limit least(p_limit, 100) offset greatest(p_offset, 0);
$$;

-- ============================================================
-- 5. v_housing_public — lima kolom yang dipakai UI tapi belum diekspos
--
--    housing-popup.tsx membaca sold_subsidi_units/sold_commercial_units,
--    image-slideshow.tsx butuh seluruh galeri (view lama hanya membawa
--    cover_path), dan admin perlu legacy_id + needs_review.
--    Galeri diagregasi di dalam view supaya satu query cukup untuk seluruh
--    halaman — tidak ada N+1 per perumahan.
--    Rollback: definisi lama ada di 0001_init.sql.
-- ============================================================

drop view if exists public.v_housing_public;

create view public.v_housing_public
with (security_invoker = true) as
select h.id, h.legacy_id, h.slug, h.name, h.address, h.lat, h.lng,
       h.price_min, h.price_max,
       h.subsidi_units, h.sold_subsidi_units,
       h.commercial_units, h.sold_commercial_units,
       h.total_units, h.available_units,
       case when h.total_units > 0
            then round(h.available_units::numeric * 100 / h.total_units)
            else null end as availability_percent,
       h.roof_type, h.wall_type, h.foundation_type,
       h.building_area, h.land_area, h.bedrooms, h.bathrooms,
       h.needs_review,
       d.name as developer_name,
       r.district, r.village,
       (select i.storage_path from public.housing_images i
         where i.housing_id = h.id and i.is_cover limit 1) as cover_path,
       (select jsonb_agg(jsonb_build_object(
                 'path', i.storage_path,
                 'alt',  i.alt,
                 'blur', i.blur_data_url)
               order by i.is_cover desc, i.sort_order, i.id)
          from public.housing_images i where i.housing_id = h.id) as images,
       (select jsonb_build_object('name', c.name, 'phone', c.phone, 'email', c.email)
          from public.housing_contacts c
         where c.housing_id = h.id
         order by c.is_primary desc, c.created_at
         limit 1) as contact,
       h.published_at
from public.housings h
left join public.developers d on d.id = h.developer_id
left join public.regions    r on r.id = h.region_id
where h.status = 'published' and h.deleted_at is null;

grant select on public.v_housing_public to anon, authenticated;
