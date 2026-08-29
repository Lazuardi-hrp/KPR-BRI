-- ============================================================
-- KPR BRI — Migrasi 0004_seed_from_legacy
--
-- Memindahkan 16 baris dari src/lib/housing-storage.ts ke basis data.
-- DIHASILKAN OLEH SKRIP dari berkas sumber — jangan sunting dengan tangan;
-- ubah sumbernya lalu bangkitkan ulang (lihat docs/DATA-TODO.md).
--
-- Data ini BELUM DIVERIFIKASI. Lihat §8.1 PRD: jumlah unit diturunkan,
-- koordinat id 9/15/16 kembar, kontak masih placeholder. Setiap baris
-- ditandai needs_review = true sampai tim data BRI mengoreksinya.
--
-- Idempotent: aman dijalankan ulang. Baris yang needs_review-nya sudah
-- dimatikan (artinya sudah dikurasi manusia) TIDAK akan ditimpa.
--
-- Rollback: delete from public.housings where legacy_id is not null;
-- ============================================================

set search_path = public, extensions;

create extension if not exists unaccent with schema extensions;

-- ---- slug dari nama ----------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
stable            -- unaccent() bergantung pada kamusnya, jadi STABLE bukan IMMUTABLE
strict
set search_path = public, extensions
as $$
  select nullif(btrim(regexp_replace(
           regexp_replace(lower(unaccent(p_text)), '[^a-z0-9]+', '-', 'g'),
           '-{2,}', '-', 'g'), '-'), '')
$$;
revoke execute on function public.slugify(text) from public, anon;

-- ---- staging -----------------------------------------------------------
-- Kolom email sengaja TIDAK ADA. Lima domain fiktif pada data lama
-- (greenvalley/sinarindah/bukitsejahtera/majujaya/harmonisent .com) tidak
-- pernah ikut termigrasi, sehingga query verifikasi §8.3 #5 lolos by construction.
drop table if exists public._seed_legacy_housings;
create table public._seed_legacy_housings (
  legacy_id    integer primary key,
  name         text not null,
  address      text not null,
  city         text not null,
  district     text not null,
  village      text not null,
  lat          double precision not null,
  lng          double precision not null,
  avail        integer not null,
  sold_subsidi integer not null default 0,
  price        numeric(14,2) not null,
  phone        text not null,
  contact_name text not null,
  roof_type    text,
  wall_type    text,
  cover_file   text not null,
  extra_files  text[] not null default '{}'
);

insert into public._seed_legacy_housings values
  (1, 'Perumahan Innara Residence 2', 'JALAN SISINGAMANGARAJA no. 75',
   'Kota Pematangsiantar', 'Siantar Sitalasari', 'Bukit Sofa',
   2.997136, 99.065307, 45, 5, 166000000,
   '0821-1234-5678', 'Ali Atin', 'Atap Genting', 'Dinding Beton',
   'innara.jpg', array['al-falah.jpg','luxury.jpg']),
  (2, 'Perumahan Mutiara Abadi Residence', 'Kelurahan sumber jaya kec.siantar martoba kota pematangsiantar no. 1',
   'Kota Pematangsiantar', 'Siantar Martoba', 'Sumber Jaya',
   2.99007, 99.093158, 78, 0, 166000000,
   '0812-9876-5432', 'Ali Atin', null, null,
   'mutiara.jpg', '{}'::text[]),
  (3, 'MOGAKOVI PERMATA', 'JL. BATU PERMATA 6 no. 6',
   'Kota Pematangsiantar', 'Siantar Sitalasari', 'Bah Kapul',
   2.961727, 99.053849, 32, 0, 166000000,
   '0831-5555-6666', 'Ali Atin', null, null,
   'magakovii.jpg', '{}'::text[]),
  (4, 'SENAYAN FIVE STAR', 'Jalan cipto no. 22',
   'Kota Pematangsiantar', 'Siantar Selatan', 'Simalungun',
   3.011513, 99.076415, 125, 0, 166000000,
   '0856-7777-8888', 'Ali Atin', null, null,
   'sfs.jpg', '{}'::text[]),
  (5, 'PERUMAHAN SUMBAWA MADANI', 'Jl. Sibatu-batu Blok I no. 1',
   'Kota Pematangsiantar', 'Siantar Sitalasari', 'Bah Kapul',
   2.961946, 99.054264, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'sumbawa.jpg', '{}'::text[]),
  (6, 'PURI SETIA NEGARA', 'Jalan Antara, Kelurahan Setia Negara, Kecamatan Siantar Sitalasari, Kota Pematang Siantar. no. -',
   'Kota Pematangsiantar', 'Siantar Sitalasari', 'Setia Negara',
   2.946931, 99.037881, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'puri.jpg', '{}'::text[]),
  (7, 'EVA REGENCY', 'JL. ARTELERI no. 24',
   'Kota Pematangsiantar', 'Siantar Sitalasari', 'Bukit Sofa',
   3.008113, 99.073257, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'eva.jpg', '{}'::text[]),
  (8, 'GRIYA PRIMA LESTARI', 'JLN. ARU no. 6',
   'Kota Pematangsiantar', 'Siantar Barat', 'Bantan',
   2.980541, 99.037384, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'prima.jpg', '{}'::text[]),
  (9, 'GRIYA AL-FALAH IV', 'Jalan Aru no. 6',
   'Kota Pematangsiantar', 'Siantar Barat', 'Bantan',
   3.011792, 99.096234, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'al-falah.jpg', '{}'::text[]),
  (10, 'RAB RESIDENCE VIYATA YUDHA', 'Jalan Hj Ulakma Sinaga, Ruko Graha Harmoni no. 1',
   'Kabupaten Simalungun', 'Siantar', 'Rambung Merah',
   2.959112, 99.034894, 60, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'viyata.jpg', '{}'::text[]),
  (11, 'RAB RESIDENCE SIMPANG KERANG', 'JL Sutomo Ruko Siantar Blok BC no. B17',
   'Kota Pematangsiantar', 'Siantar Timur', 'Pahlawan',
   2.984882, 99.087295, 87, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'kerang.jpg', '{}'::text[]),
  (12, 'PERUMAHAN MUTIARA RINGROAD RESIDENCE', 'Jln Medan outer Ringroad no. D-1',
   'Kota Pematangsiantar', 'Siantar Martoba', 'Tanjung Tongah',
   3.006688, 99.07813, 52, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'ringroad.jpg', '{}'::text[]),
  (13, 'MODERN LUXURY SUMBERJAYA', 'JALAN SUMBER JAYA II, BLOK GADUNG no. -',
   'Kota Pematangsiantar', 'Siantar Martoba', 'Sumber Jaya',
   2.991784, 99.089907, 76, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'luxury.jpg', '{}'::text[]),
  (14, 'DIMENSI VIYATA', 'Jalan Sangnawaluh no. 5 B',
   'Kota Pematangsiantar', 'Siantar Timur', 'Siopat Suhu',
   2.985247, 99.089722, 76, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'dimensi.jpg', '{}'::text[]),
  (15, 'GRAHA ASIDO 7 TAHAP II', 'JL. COKLAT RAYA no. 18',
   'Kota Pematangsiantar', 'Siantar Martoba', 'Sumber Jaya',
   3.011792, 99.096234, 76, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'asido.jpg', '{}'::text[]),
  (16, 'GRIYA TAMA 3', 'JL. COKLAT RAYA no. 18',
   'Kota Pematangsiantar', 'Siantar Martoba', 'Sumber Jaya',
   3.011792, 99.096234, 76, 0, 166000000,
   '0821-2222-3333', 'Ali Atin', null, null,
   'asido.jpg', '{}'::text[]);

-- ---- 1. regions --------------------------------------------------------
insert into public.regions (province, city, district, village)
select distinct 'Sumatera Utara', s.city, s.district, s.village
from public._seed_legacy_housings s
on conflict (province, city, district, village) do nothing;

-- ---- 2. housings -------------------------------------------------------
-- developer_id sengaja NULL: data lama tidak menyebut satu pun nama
-- pengembang sungguhan, dan mengarang satu akan tercatat di developers_audit
-- lalu tampil ke publik lewat v_housing_public.developer_name. NULL juga
-- postur RLS teraman — 'developer_id = my_developer_id()' bernilai NULL,
-- jadi tidak ada pengembang yang bisa mengklaim baris tak beratribusi ini.
--
-- Derivasi unit (§8.1 D-1): subsidi_units = availableUnits + soldSubsidiUnits.
-- Untuk id 1 ini memperbaiki 562% yang mustahil menjadi 90%. Untuk 15 baris
-- lain hasilnya 100% — bukan klaim bahwa tidak ada yang terjual, melainkan
-- pengakuan bahwa angka terjual tidak diketahui. Mengarangnya justru lebih buruk.
insert into public.housings as h (
  legacy_id, slug, name, developer_id, region_id, address, lat, lng,
  price_min, price_max,
  subsidi_units, sold_subsidi_units, commercial_units, sold_commercial_units,
  roof_type, wall_type, status, published_at, needs_review
)
select
  s.legacy_id,
  public.slugify(s.name),
  s.name,
  null::uuid,
  r.id,
  s.address,
  s.lat, s.lng,
  s.price, s.price,
  s.avail + s.sold_subsidi,
  s.sold_subsidi,
  0, 0,
  s.roof_type, s.wall_type,
  'published'::housing_status,
  now(),
  true
from public._seed_legacy_housings s
join public.regions r
  on  r.province = 'Sumatera Utara'
  and r.city     = s.city
  and r.district = s.district
  and r.village  = s.village
on conflict (legacy_id) do update set
  -- slug sengaja tidak ikut diperbarui: itu URL publik yang mungkin sudah diedit.
  name               = excluded.name,
  region_id          = excluded.region_id,
  address            = excluded.address,
  lat                = excluded.lat,
  lng                = excluded.lng,
  price_min          = excluded.price_min,
  price_max          = excluded.price_max,
  subsidi_units      = excluded.subsidi_units,
  sold_subsidi_units = excluded.sold_subsidi_units,
  roof_type          = excluded.roof_type,
  wall_type          = excluded.wall_type
where h.needs_review;   -- <- jangan pernah menimpa baris yang sudah dikurasi

-- ---- 3. housing_contacts ----------------------------------------------
-- Nama & telepon dipertahankan (satu-satunya jalur kontak yang ada);
-- email dikosongkan, bukan dipalsukan.
insert into public.housing_contacts (housing_id, name, phone, email, role_label, is_primary)
select h.id, s.contact_name, s.phone, null::citext, 'Marketing', true
from public._seed_legacy_housings s
join public.housings h on h.legacy_id = s.legacy_id
where not exists (
  select 1 from public.housing_contacts c where c.housing_id = h.id and c.is_primary
);

-- ---- 4. housing_images -------------------------------------------------
-- storage_path diisi path publik lama ('/kpr-assets/x.jpg'), BUKAN kunci
-- bucket. Saat migrasi ini jalan, berkasnya belum ada di Storage; menulis
-- kunci bucket lebih dulu akan membuat semua gambar 404 sampai unggahan
-- selesai. Peralihan dilakukan oleh 0007_storage_paths.sql setelah
-- scripts/upload-housing-images.mjs terverifikasi.
insert into public.housing_images (housing_id, storage_path, alt, sort_order, is_cover)
select h.id, '/kpr-assets/' || f.file, s.name, f.ord, false
from public._seed_legacy_housings s
join public.housings h on h.legacy_id = s.legacy_id
cross join lateral unnest(array[s.cover_file] || s.extra_files)
  with ordinality as f(file, ord)
on conflict (housing_id, storage_path) do update
  set sort_order = excluded.sort_order, alt = excluded.alt;

-- Sampul dipromosikan terpisah: menyisipkan is_cover = true di statement yang
-- sama dengan DO UPDATE berisiko melanggar housing_images_one_cover_uq sesaat,
-- dan pada eksekusi ulang akan melawan sampul pilihan admin.
update public.housing_images i
   set is_cover = true
  from public._seed_legacy_housings s
  join public.housings h on h.legacy_id = s.legacy_id
 where i.housing_id   = h.id
   and i.storage_path = '/kpr-assets/' || s.cover_file
   and not exists (select 1 from public.housing_images j
                    where j.housing_id = h.id and j.is_cover);

-- ---- 5. app_settings ---------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('public.stats_happy_families', '1000'::jsonb,
   'Klaim pemasaran, BUKAN agregat basis data. sum(sold_subsidi_units) sebenarnya = 5.'),
  ('public.consent_version', '"v1"'::jsonb,
   'Versi teks persetujuan yang sedang berlaku (PRD §13.2).'),
  ('admin_email', '""'::jsonb,
   'Penerima notifikasi prospek. Diisi tim BRI; tanpa awalan public. agar tidak terbaca anon.')
on conflict (key) do nothing;

drop table public._seed_legacy_housings;
