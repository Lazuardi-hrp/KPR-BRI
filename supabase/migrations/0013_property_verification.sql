-- ============================================================
-- KPR BRI — Migrasi 0013_property_verification
--
-- Fase kritis (2/3): verifikasi properti.
--
-- Gagasan intinya: label "Terverifikasi" tanpa tanggal tidak berarti apa-apa.
-- Yang dijanjikan ke pengunjung adalah APA yang diperiksa dan KAPAN terakhir
-- diperiksa — maka keduanya harus tersimpan, bukan disimpulkan.
--
-- Tiga mekanisme yang bekerja bersama:
--   1. Verifikasi adalah PERISTIWA (housing_verifications), bukan sekadar
--      kolom boolean. Satu baris per pemeriksaan, lengkap dengan siapa,
--      kapan, bidang mana, dan kapan harus ditinjau lagi.
--   2. Perubahan data material MENURUNKAN status secara otomatis. Kalau harga
--      berubah setelah diverifikasi, labelnya jatuh ke "perlu pembaruan"
--      tanpa menunggu ada orang yang ingat. Ini bagian yang membuat sistemnya
--      jujur — tanpanya, "Terverifikasi 31 Agustus" akan bertahan di layar
--      lama setelah datanya tidak lagi benar.
--   3. Riwayat perubahan per bidang (housing_field_history) — "20 Agustus
--      Rp 620.000.000, 31 Agustus Rp 650.000.000".
--
-- Rollback: catatan per bagian di bawah.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. STATUS VERIFIKASI
--    Rollback: alter table public.housings drop column verification_status, ...;
--              drop type public.verification_status;
-- ============================================================

create type public.verification_status as enum (
  'terverifikasi',    -- Verified
  'menunggu',         -- Pending verification
  'perlu_pembaruan'   -- Needs update
);

alter table public.housings
  add column if not exists verification_status public.verification_status
    not null default 'menunggu',
  add column if not exists verified_at         timestamptz,
  add column if not exists verified_by         uuid references public.profiles(id) on delete set null,
  add column if not exists verification_due_at timestamptz,
  add column if not exists verification_note   text,
  add column if not exists last_data_change_at timestamptz not null default now();

comment on column public.housings.verification_status is
  'Ditampilkan ke pengunjung. Turun otomatis ke perlu_pembaruan bila bidang '
  'material berubah setelah verifikasi terakhir, atau bila lewat tanggal tinjau ulang.';
comment on column public.housings.last_data_change_at is
  'Kapan terakhir bidang material (harga, unit, lokasi, kontak) berubah. '
  'Berbeda dari updated_at, yang ikut berubah oleh penyuntingan sepele.';

create index if not exists housings_verification_idx
  on public.housings (verification_status, verification_due_at)
  where deleted_at is null;

-- Perumahan yang sudah ditandai perlu ditinjau saat migrasi data lama memang
-- berstatus "perlu pembaruan"; sisanya belum pernah diperiksa sama sekali.
update public.housings
   set verification_status = case when needs_review then 'perlu_pembaruan'::public.verification_status
                                  else 'menunggu'::public.verification_status end,
       last_data_change_at = coalesce(updated_at, created_at)
 where verification_status = 'menunggu';

-- ============================================================
-- 2. BIDANG YANG DIPERIKSA
--
--    Daftarnya dikunci sebagai enum, bukan teks bebas: kalau admin bisa
--    mengarang nama bidang, "kapan kontak terakhir diperiksa" tidak bisa
--    dijawab dengan andal.
--
--    Rollback: drop type public.verification_field cascade;
-- ============================================================

create type public.verification_field as enum (
  'harga',              -- Price
  'lokasi',             -- Location
  'pengembang',         -- Developer
  'kontak',             -- Contact number
  'foto',               -- Property images
  'ketersediaan_unit'   -- Unit availability
);

-- ============================================================
-- 3. PERISTIWA VERIFIKASI
--    Rollback: drop table public.housing_verifications;
-- ============================================================

create table if not exists public.housing_verifications (
  id             uuid primary key default gen_random_uuid(),
  housing_id     uuid not null references public.housings(id) on delete cascade,
  verified_by    uuid references public.profiles(id) on delete set null,
  verified_email text,                       -- disalin saat itu; bertahan bila akun dihapus
  checked        public.verification_field[] not null default '{}',
  note           text,
  next_review_at timestamptz,
  -- Nilai bidang material pada saat diverifikasi. Inilah yang membuat
  -- "berubah sejak verifikasi terakhir" bisa dijawab tanpa menebak.
  snapshot       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists housing_verifications_housing_idx
  on public.housing_verifications (housing_id, created_at desc);

-- ============================================================
-- 4. RIWAYAT PERUBAHAN PER BIDANG
--
--    audit_logs sudah merekam diff mentah setiap UPDATE, tetapi bentuknya
--    jsonb gabungan — tidak bisa dipakai langsung untuk "Riwayat harga".
--    Tabel ini menormalkan satu baris per bidang per perubahan.
--
--    Rollback: drop table public.housing_field_history;
-- ============================================================

create table if not exists public.housing_field_history (
  id         bigint generated always as identity primary key,
  housing_id uuid not null references public.housings(id) on delete cascade,
  field      text not null,
  nilai_lama text,
  nilai_baru text,
  actor_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists housing_field_history_idx
  on public.housing_field_history (housing_id, field, created_at desc);

-- ============================================================
-- 5. TRIGGER: perubahan material menurunkan status verifikasi
--
--    Bidang mana yang "material" adalah keputusan produk, bukan teknis:
--    yang berubah di sini adalah yang dilihat dan dipercaya calon pembeli.
--    Mengubah roof_type tidak membatalkan verifikasi; mengubah harga iya.
--
--    Rollback: drop trigger housings_track_changes on public.housings;
-- ============================================================

create or replace function public.housings_track_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_material boolean := false;
  v_actor    uuid := auth.uid();
begin
  -- Harga
  if new.price_min is distinct from old.price_min then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'price_min', old.price_min::text, new.price_min::text, v_actor);
    v_material := true;
  end if;
  if new.price_max is distinct from old.price_max then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'price_max', old.price_max::text, new.price_max::text, v_actor);
    v_material := true;
  end if;

  -- Lokasi
  if new.address is distinct from old.address then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'address', old.address, new.address, v_actor);
    v_material := true;
  end if;
  if new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'koordinat',
            old.lat::text || ', ' || old.lng::text,
            new.lat::text || ', ' || new.lng::text, v_actor);
    v_material := true;
  end if;

  -- Pengembang
  if new.developer_id is distinct from old.developer_id then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'developer_id', old.developer_id::text, new.developer_id::text, v_actor);
    v_material := true;
  end if;

  -- Ketersediaan unit
  if new.subsidi_units is distinct from old.subsidi_units
     or new.commercial_units is distinct from old.commercial_units
     or new.sold_subsidi_units is distinct from old.sold_subsidi_units
     or new.sold_commercial_units is distinct from old.sold_commercial_units then
    -- available_units adalah kolom GENERATED: di dalam trigger BEFORE ia belum
    -- dihitung untuk NEW, jadi nilainya disusun ulang di sini alih-alih dibaca.
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'unit_tersedia', old.available_units::text,
            ((new.subsidi_units + new.commercial_units)
             - (new.sold_subsidi_units + new.sold_commercial_units))::text, v_actor);
    v_material := true;
  end if;

  if v_material then
    new.last_data_change_at := now();
    -- Verifikasi yang sedang berjalan mengubah verified_at pada UPDATE yang
    -- sama; itu bukan perubahan data yang perlu menurunkan statusnya sendiri.
    if new.verified_at is not distinct from old.verified_at
       and new.verification_status = 'terverifikasi' then
      new.verification_status := 'perlu_pembaruan';
    end if;
  end if;

  return new;
end $$;
revoke execute on function public.housings_track_changes() from public, anon, authenticated;

drop trigger if exists housings_track_changes on public.housings;
create trigger housings_track_changes before update on public.housings
  for each row execute function public.housings_track_changes();

-- Foto adalah bidang material juga, tetapi hidup di tabel lain.
create or replace function public.housing_images_touch()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(new.housing_id, old.housing_id);
begin
  update public.housings
     set last_data_change_at = now(),
         verification_status = case when verification_status = 'terverifikasi'
                                    then 'perlu_pembaruan'::public.verification_status
                                    else verification_status end
   where id = v_id;
  return coalesce(new, old);
end $$;
revoke execute on function public.housing_images_touch() from public, anon, authenticated;

drop trigger if exists housing_images_touch on public.housing_images;
create trigger housing_images_touch after insert or delete on public.housing_images
  for each row execute function public.housing_images_touch();

-- ============================================================
-- 6. RPC: verifikasi perumahan
--
--    security invoker: RLS yang memutuskan siapa boleh memverifikasi apa.
--    Pengembang hanya bisa memverifikasi perumahannya sendiri karena
--    housings_update_staff yang menolak, bukan karena ada pemeriksaan peran
--    tambahan di dalam fungsi yang bisa menyimpang dari kebijakan.
--
--    Rollback: drop function public.verify_housing(uuid, text[], text, integer);
-- ============================================================

create or replace function public.verify_housing(
  p_housing_id  uuid,
  p_checked     text[],
  p_note        text default null,
  p_review_days integer default 30
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_fields public.verification_field[];
  v_row    public.housings%rowtype;
  v_id     uuid;
  v_next   timestamptz;
  v_email  text;
  v_semua  integer;
begin
  select * into v_row from public.housings where id = p_housing_id and deleted_at is null;
  if not found then
    raise exception 'Perumahan tidak ditemukan' using errcode = 'P0002';
  end if;

  select array_agg(f::public.verification_field) into v_fields
    from unnest(coalesce(p_checked, '{}')) as f
   where f = any (enum_range(null::public.verification_field)::text[]);
  v_fields := coalesce(v_fields, '{}');

  v_next := now() + make_interval(days => greatest(1, least(coalesce(p_review_days, 30), 365)));
  select email into v_email from auth.users where id = auth.uid();
  select count(*) into v_semua from unnest(enum_range(null::public.verification_field));

  insert into public.housing_verifications
    (housing_id, verified_by, verified_email, checked, note, next_review_at, snapshot)
  values (
    p_housing_id, auth.uid(), v_email, v_fields, nullif(btrim(p_note), ''), v_next,
    jsonb_build_object(
      'price_min',       v_row.price_min,
      'price_max',       v_row.price_max,
      'address',         v_row.address,
      'lat',             v_row.lat,
      'lng',             v_row.lng,
      'developer_id',    v_row.developer_id,
      'available_units', v_row.available_units))
  returning id into v_id;

  -- Terverifikasi penuh hanya bila SELURUH bidang dicentang. Sebagian saja
  -- tetap "perlu pembaruan" — pengunjung tidak boleh melihat centang hijau
  -- untuk properti yang ketersediaan unitnya belum sempat dicek.
  update public.housings
     set verification_status = case when array_length(v_fields, 1) = v_semua
                                    then 'terverifikasi'::public.verification_status
                                    else 'perlu_pembaruan'::public.verification_status end,
         verified_at         = now(),
         verified_by         = auth.uid(),
         verification_due_at = v_next,
         verification_note   = nullif(btrim(p_note), ''),
         needs_review        = (array_length(v_fields, 1) is distinct from v_semua),
         updated_by          = auth.uid()
   where id = p_housing_id;

  return v_id;
end $$;
grant execute on function public.verify_housing(uuid, text[], text, integer) to authenticated;

-- ============================================================
-- 7. RINGKASAN PER BIDANG UNTUK LAYAR VERIFIKASI ADMIN
--
--    Menjawab "Ketersediaan unit — terakhir dicek 2 hari lalu ⚠" untuk tiap
--    bidang sekaligus, dalam satu perjalanan ke basis data.
--
--    Rollback: drop function public.housing_field_checks(uuid);
-- ============================================================

create or replace function public.housing_field_checks(p_housing_id uuid)
returns table (
  field            text,
  last_checked_at  timestamptz,
  checked_by       text,
  changed_since    boolean
)
language sql stable security invoker set search_path = public as $$
  with bidang as (
    select unnest(enum_range(null::public.verification_field))::text as field
  ),
  terakhir as (
    select b.field,
           (select max(v.created_at) from public.housing_verifications v
             where v.housing_id = p_housing_id
               and b.field::public.verification_field = any (v.checked)) as last_checked_at
    from bidang b
  )
  select t.field,
         t.last_checked_at,
         (select v.verified_email from public.housing_verifications v
           where v.housing_id = p_housing_id and v.created_at = t.last_checked_at
           limit 1) as checked_by,
         -- Berubah setelah pemeriksaan terakhir bidang ini?
         coalesce((
           select true from public.housing_field_history fh
            where fh.housing_id = p_housing_id
              and t.last_checked_at is not null
              and fh.created_at > t.last_checked_at
              and fh.field = any (case t.field
                    when 'harga'             then array['price_min', 'price_max']
                    when 'lokasi'            then array['address', 'koordinat']
                    when 'pengembang'        then array['developer_id']
                    when 'ketersediaan_unit' then array['unit_tersedia']
                    else array[]::text[] end)
            limit 1), false) as changed_since
  from terakhir t
  order by t.field;
$$;
grant execute on function public.housing_field_checks(uuid) to authenticated;

-- ============================================================
-- 8. KADALUWARSA OTOMATIS
--
--    Dijalankan pg_cron (lihat bagian 11). Verifikasi punya masa berlaku:
--    tanpa ini, satu klik pada bulan Agustus akan terus menampilkan centang
--    hijau sepanjang tahun.
--
--    Rollback: drop function public.expire_verifications();
-- ============================================================

create or replace function public.expire_verifications()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  for r in
    update public.housings
       set verification_status = 'perlu_pembaruan'
     where verification_status = 'terverifikasi'
       and verification_due_at is not null
       and verification_due_at < now()
       and deleted_at is null
    returning id, name
  loop
    insert into public.admin_notifications (kind, title, body, housing_id, href, severity)
    values ('verifikasi',
            'Verifikasi kedaluwarsa: ' || r.name,
            'Masa berlaku verifikasi habis. Data ini masih tampil ke pengunjung.',
            r.id, '/admin/verifikasi/' || r.id::text, 1);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.expire_verifications() from public, anon, authenticated;
grant execute on function public.expire_verifications() to service_role;

-- ============================================================
-- 9. RLS + GRANT tabel baru
-- ============================================================

alter table public.housing_verifications  enable row level security;
alter table public.housing_field_history  enable row level security;

-- Publik boleh melihat KAPAN dan APA yang diverifikasi untuk perumahan yang
-- terbit — itu justru inti janji kepercayaannya. Yang tidak dibuka adalah
-- catatan internal (note) dan snapshot; keduanya disaring di view, bukan di sini.
create policy housing_verifications_read_public on public.housing_verifications
  for select to anon, authenticated
  using (exists (select 1 from public.housings h
                 where h.id = housing_id and h.status = 'published' and h.deleted_at is null));

create policy housing_verifications_write_staff on public.housing_verifications
  for insert to authenticated
  with check (exists (select 1 from public.housings h where h.id = housing_id
                      and (public.is_admin() or h.developer_id = public.my_developer_id())));

create policy housing_field_history_read_staff on public.housing_field_history
  for select to authenticated
  using (exists (select 1 from public.housings h where h.id = housing_id
                 and (public.is_admin() or h.developer_id = public.my_developer_id())));

-- Hibah tingkat KOLOM untuk anon. v_housing_public memakai security_invoker,
-- jadi subkuerinya berjalan sebagai `anon` dan memang butuh hak baca di sini —
-- tetapi hanya pada kolom yang memang dijanjikan ke publik. `note`, `snapshot`,
-- dan `verified_email` adalah catatan kerja internal dan tidak ikut terbuka.
grant select (id, housing_id, checked, next_review_at, created_at)
  on public.housing_verifications to anon;
grant select on public.housing_verifications to authenticated;
grant insert on public.housing_verifications to authenticated;
grant select on public.housing_field_history to authenticated;

-- ============================================================
-- 10. v_housing_public — bidang verifikasi untuk halaman publik
--
--    Hanya status dan tanggal yang keluar. `note` dan `snapshot` adalah
--    catatan kerja internal dan sengaja tidak ikut.
--
--    Rollback: definisi sebelumnya ada di 0002_hardening.sql.
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
       h.verification_status,
       h.verified_at,
       h.verification_due_at,
       h.last_data_change_at,
       (select array_agg(f::text)
          from public.housing_verifications v, unnest(v.checked) f
         where v.housing_id = h.id
           and v.created_at = (select max(v2.created_at) from public.housing_verifications v2
                                where v2.housing_id = h.id)) as verified_fields,
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

-- ============================================================
-- 11. ANTREAN VERIFIKASI ADMIN
--    Menjawab pertanyaan kedua dashboard: "data properti mana yang perlu
--    perhatian?" — diurutkan berdasarkan mendesaknya, bukan abjad.
-- ============================================================

create or replace function public.verification_queue(p_limit integer default 50)
returns table (
  id                  uuid,
  name                text,
  slug                text,
  status              text,
  verification_status text,
  verified_at         timestamptz,
  verification_due_at timestamptz,
  last_data_change_at timestamptz,
  hari_terlambat      integer,
  prioritas           integer
)
language sql stable security invoker set search_path = public as $$
  select h.id, h.name, h.slug::text, h.status::text,
         h.verification_status::text, h.verified_at, h.verification_due_at,
         h.last_data_change_at,
         greatest(0, extract(day from now() - h.verification_due_at)::integer) as hari_terlambat,
         case
           -- Terbit tapi belum pernah diverifikasi: paling mendesak, karena
           -- data yang belum diperiksa itulah yang sedang dilihat pengunjung.
           when h.status = 'published' and h.verification_status = 'menunggu'        then 0
           when h.status = 'published' and h.verification_status = 'perlu_pembaruan' then 1
           when h.verification_status = 'terverifikasi'
                and h.verification_due_at < now() + interval '7 days'                then 2
           when h.verification_status = 'menunggu'                                   then 3
           else 4
         end as prioritas
  from public.housings h
  where h.deleted_at is null
  order by prioritas, h.verification_due_at nulls first, h.name
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;
grant execute on function public.verification_queue(integer) to authenticated;

create or replace function public.verification_metrics()
returns table (
  terverifikasi   bigint,
  menunggu        bigint,
  perlu_pembaruan bigint,
  jatuh_tempo     bigint,
  terbit_belum_verif bigint
)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where verification_status = 'terverifikasi'),
    count(*) filter (where verification_status = 'menunggu'),
    count(*) filter (where verification_status = 'perlu_pembaruan'),
    count(*) filter (where verification_status = 'terverifikasi'
                       and verification_due_at < now() + interval '7 days'),
    count(*) filter (where status = 'published' and verification_status <> 'terverifikasi')
  from public.housings
  where deleted_at is null;
$$;
grant execute on function public.verification_metrics() to authenticated;
