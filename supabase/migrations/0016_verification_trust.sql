-- ============================================================
-- KPR BRI — Migrasi 0016_verification_trust
--
-- Lanjutan 0013. Migrasi itu membuat verifikasi menjadi peristiwa yang jujur;
-- migrasi ini menutup tiga lubang yang membuat kejujurannya bocor, lalu
-- membuka data yang dibutuhkan halaman publik.
--
--   1. NOMOR TELEPON BISA BERUBAH TANPA MENJATUHKAN CENTANG HIJAU.
--      housings_track_changes hanya mengawasi tabel housings. Kontak pemasaran
--      hidup di housing_contacts, jadi mengganti nomornya tidak menyentuh
--      verification_status sama sekali. Lencana "Kontak terverifikasi" lalu
--      menjanjikan sesuatu yang sudah tidak benar — persis kegagalan yang
--      seluruh sistem ini dibangun untuk mencegah.
--
--   2. changed_since UNTUK 'kontak' DAN 'foto' SELALU false.
--      CASE di housing_field_checks tidak punya cabang untuk keduanya, jadi
--      keduanya jatuh ke array kosong. Layar admin tidak pernah bisa memberi
--      tahu bahwa foto atau kontak berubah setelah pemeriksaan terakhir.
--
--   3. NAMA PROPERTI TIDAK PERNAH DIPERIKSA.
--      Enum bidang punya harga, lokasi, pengembang, kontak, foto, dan
--      ketersediaan unit — tetapi bukan identitas propertinya sendiri.
--
-- Ditambah dua hal baru:
--   4. field_checks di v_housing_public — kapan tiap bidang terakhir diperiksa,
--      untuk pengunjung, di jalur baca yang bisa di-cache.
--   5. mark_needs_update() — menandai perlu pembaruan sebagai TINDAKAN yang
--      tercatat, bukan perubahan status diam-diam.
--
-- Rollback: catatan per bagian di bawah.
-- ============================================================

-- ============================================================
-- 1. BIDANG KETUJUH: NAMA
--
--    verify_housing() menghitung "seluruh bidang" lewat enum_range saat
--    dipanggil, bukan dari konstanta. Jadi baris yang sudah 'terverifikasi'
--    mempertahankan statusnya sampai diverifikasi ulang — ambangnya naik untuk
--    pemeriksaan berikutnya saja, tidak surut ke belakang.
--
--    Catatan PostgreSQL: nilai enum yang baru ditambahkan tidak boleh DIPAKAI
--    di transaksi yang sama yang menambahkannya. Migrasi ini dijalankan dalam
--    satu transaksi, jadi aturannya berlaku — dan dipenuhi: tidak ada satu pun
--    'nama' di bawah yang berbentuk literal enum. Yang ditulis 'nama' semuanya
--    adalah housing_field_history.field (kolom TEXT) atau perbandingan teks di
--    dalam CASE; daftar bidangnya sendiri selalu lewat enum_range, yang baru
--    dievaluasi saat kueri berjalan. Jangan menulis 'nama'::verification_field
--    di berkas ini.
--
--    Rollback: tidak ada. Nilai enum tidak bisa dihapus di PostgreSQL tanpa
--    membuat ulang tipenya beserta seluruh kolom yang memakainya.
-- ============================================================

alter type public.verification_field add value if not exists 'nama';

-- ============================================================
-- 2. PERUBAHAN NAMA IKUT TERCATAT
--    Rollback: pasang ulang definisi housings_track_changes dari 0013 §5.
-- ============================================================

create or replace function public.housings_track_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_material boolean := false;
  v_actor    uuid := auth.uid();
begin
  -- Nama (identitas properti) — bidang 'nama', ditambahkan migrasi 0016.
  if new.name is distinct from old.name then
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (new.id, 'nama', old.name, new.name, v_actor);
    v_material := true;
  end if;

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

-- ============================================================
-- 3. KONTAK PEMASARAN MENURUNKAN VERIFIKASI
--
--    Ini perbaikan cacat, bukan fitur. Sebelum migrasi ini, mengganti nomor
--    telepon di /admin/perumahan/<id> membiarkan lencana "Terverifikasi" —
--    lengkap dengan baris "Nomor kontak ✓" — tetap tayang untuk nomor yang
--    belum pernah dilihat siapa pun.
--
--    Rollback: drop trigger housing_contacts_track on public.housing_contacts;
--              drop function public.housing_contacts_track();
-- ============================================================

create or replace function public.housing_contacts_track()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := coalesce(new.housing_id, old.housing_id);
  v_material boolean := false;
  v_actor    uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    if new.phone is distinct from old.phone then
      insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
      values (v_id, 'kontak_telepon', old.phone, new.phone, v_actor);
      v_material := true;
    end if;
    if new.name is distinct from old.name then
      insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
      values (v_id, 'kontak_nama', old.name, new.name, v_actor);
      v_material := true;
    end if;
    if new.email is distinct from old.email then
      insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
      values (v_id, 'kontak_email', old.email::text, new.email::text, v_actor);
      v_material := true;
    end if;
  else
    -- INSERT atau DELETE: daftar kontak berubah bentuknya, itu material.
    insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
    values (v_id, 'kontak_telepon',
            case when tg_op = 'DELETE' then old.phone end,
            case when tg_op = 'INSERT' then new.phone end,
            v_actor);
    v_material := true;
  end if;

  if v_material then
    update public.housings
       set last_data_change_at = now(),
           verification_status = case when verification_status = 'terverifikasi'
                                      then 'perlu_pembaruan'::public.verification_status
                                      else verification_status end
     where id = v_id;
  end if;

  return coalesce(new, old);
end $$;
revoke execute on function public.housing_contacts_track() from public, anon, authenticated;

drop trigger if exists housing_contacts_track on public.housing_contacts;
create trigger housing_contacts_track
  after insert or update or delete on public.housing_contacts
  for each row execute function public.housing_contacts_track();

-- ============================================================
-- 4. FOTO — MENINGGALKAN JEJAK, DAN IKUT PADA UPDATE
--
--    0013 sudah menurunkan status saat foto ditambah atau dihapus, tetapi
--    tidak menulis baris riwayat, sehingga bidang 'foto' selalu terbaca
--    "tidak pernah berubah". Trigger lamanya juga tidak menyalakan UPDATE:
--    menukar storage_path atau memindahkan is_cover tidak menurunkan apa pun.
--
--    Rollback: pasang ulang definisi housing_images_touch dari 0013 §5 dan
--              buat ulang triggernya tanpa `or update`.
-- ============================================================

create or replace function public.housing_images_touch()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid := coalesce(new.housing_id, old.housing_id);
  v_jumlah integer;
begin
  if tg_op = 'UPDATE'
     and new.storage_path is not distinct from old.storage_path
     and new.is_cover     is not distinct from old.is_cover
     and new.alt          is not distinct from old.alt then
    -- Hanya metadata yang bergeser (sort_order, width, height, bytes,
    -- blur_data_url). Tidak satu pun dari itu klaim yang diverifikasi
    -- seseorang, jadi jangan jatuhkan status karenanya.
    return coalesce(new, old);
  end if;

  select count(*) into v_jumlah from public.housing_images where housing_id = v_id;

  insert into public.housing_field_history (housing_id, field, nilai_lama, nilai_baru, actor_id)
  values (v_id, 'foto',
          case tg_op when 'INSERT' then (v_jumlah - 1)::text
                     when 'DELETE' then (v_jumlah + 1)::text
                     else v_jumlah::text end,
          v_jumlah::text, auth.uid());

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
create trigger housing_images_touch
  after insert or update or delete on public.housing_images
  for each row execute function public.housing_images_touch();

-- ============================================================
-- 5. housing_field_checks — CABANG YANG HILANG
--
--    'kontak', 'foto', dan 'nama' kini punya pemetaan ke nama bidang di
--    housing_field_history, jadi changed_since bisa bernilai true untuk
--    ketiganya. Sebelumnya ketiganya jatuh ke array kosong dan diam.
--
--    Rollback: pasang ulang definisi dari 0013 §7.
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
                    when 'nama'              then array['nama']
                    when 'harga'             then array['price_min', 'price_max']
                    when 'lokasi'            then array['address', 'koordinat']
                    when 'pengembang'        then array['developer_id']
                    when 'kontak'            then array['kontak_telepon', 'kontak_nama', 'kontak_email']
                    when 'foto'              then array['foto']
                    when 'ketersediaan_unit' then array['unit_tersedia']
                    else array[]::text[] end)
            limit 1), false) as changed_since
  from terakhir t
  order by t.field;
$$;
grant execute on function public.housing_field_checks(uuid) to authenticated;

-- ============================================================
-- 6. mark_needs_update — MENANDAI SEBAGAI TINDAKAN, BUKAN SAKELAR
--
--    Petugas yang menemukan data meragukan butuh jalan keluar selain
--    "verifikasi sebagian", yang menghasilkan status sama tetapi berbohong
--    tentang apa yang sudah diperiksa. Fungsi ini menulis baris
--    housing_verifications dengan checked kosong, sehingga tindakannya muncul
--    di lini masa riwayat dengan nama dan alasannya — bukan status yang
--    tiba-tiba berubah tanpa siapa pun bertanggung jawab.
--
--    security invoker, sama alasannya dengan verify_housing: kebijakan
--    housings_update_staff yang menolak, bukan pemeriksaan peran kedua di
--    dalam fungsi yang bisa menyimpang darinya.
--
--    Rollback: drop function public.mark_needs_update(uuid, text);
-- ============================================================

create or replace function public.mark_needs_update(
  p_housing_id uuid,
  p_note       text default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id    uuid;
  v_email text;
begin
  if not exists (select 1 from public.housings
                  where id = p_housing_id and deleted_at is null) then
    raise exception 'Perumahan tidak ditemukan' using errcode = 'P0002';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.housing_verifications
    (housing_id, verified_by, verified_email, checked, note, next_review_at, snapshot)
  values (p_housing_id, auth.uid(), v_email, '{}', nullif(btrim(p_note), ''), null,
          jsonb_build_object('tindakan', 'perlu_pembaruan'))
  returning id into v_id;

  update public.housings
     set verification_status = 'perlu_pembaruan',
         verification_note   = nullif(btrim(p_note), ''),
         verification_due_at = null,
         needs_review        = true,
         updated_by          = auth.uid()
   where id = p_housing_id;

  return v_id;
end $$;
grant execute on function public.mark_needs_update(uuid, text) to authenticated;

-- ============================================================
-- 7. v_housing_public — KESEGARAN PER BIDANG UNTUK PENGUNJUNG
--
--    Halaman detail menjanjikan "Ketersediaan unit — terakhir dicek 5 hari
--    lalu". Data itu sudah ada di housing_verifications dan anon sudah berhak
--    membacanya (kebijakan housing_verifications_read_public + hibah kolom di
--    0013 §9) — yang belum ada hanyalah bentuk yang bisa diambil sekali jalan.
--
--    Sengaja sebuah KOLOM VIEW, bukan RPC. createAnonClient() menandai fetch
--    dengan next: { tags: ['housings'], revalidate: 300 }, dan penandaan itu
--    hanya berlaku untuk GET. Sebuah .rpc() adalah POST yang tidak bisa
--    di-cache, dan memanggilnya dari /perumahan/[slug] akan mematikan
--    `export const revalidate = 300` di halaman itu.
--
--    Kolom keluaran view yang tidak ikut di-SELECT dipangkas perencana, jadi
--    kueri daftar (landing, /map) yang memakai KOLOM tanpa field_checks tidak
--    membayar subkueri ini sama sekali.
--
--    note, snapshot, dan verified_email tetap tidak ikut — itu catatan kerja
--    internal.
--
--    Rollback: definisi sebelumnya ada di 0013 §10.
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
       (select jsonb_agg(jsonb_build_object('field', c.field,
                                            'last_checked_at', c.last_checked_at)
                         order by c.field)
          from (select b.field::text as field,
                       (select max(v.created_at) from public.housing_verifications v
                         where v.housing_id = h.id
                           and b.field = any (v.checked)) as last_checked_at
                  from unnest(enum_range(null::public.verification_field)) as b(field)
               ) c) as field_checks,
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
-- 8. verification_queue — LOKASI DAN BAHAN SKOR
--
--    Tabel di /admin/verifikasi punya kolom Lokasi dan Skor. Keduanya butuh
--    data yang sudah ada di baris perumahan; mengambilnya per baris dari
--    layar akan menjadi N+1 untuk 200 baris. Skornya sendiri dihitung di
--    TypeScript (src/lib/verification.ts) supaya kartu publik, halaman detail,
--    dan tabel admin memakai satu rumus yang sama.
--
--    Rollback: definisi sebelumnya ada di 0013 §11.
-- ============================================================

drop function if exists public.verification_queue(integer);

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
  prioritas           integer,
  district            text,
  village             text,
  price_min           numeric,
  developer_id        uuid,
  punya_kontak        boolean,
  jumlah_foto         integer,
  total_units         integer,
  needs_review        boolean,
  verified_fields     text[]
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
         end as prioritas,
         r.district, r.village,
         h.price_min,
         h.developer_id,
         exists (select 1 from public.housing_contacts c
                  where c.housing_id = h.id and coalesce(btrim(c.phone), '') <> '') as punya_kontak,
         (select count(*)::integer from public.housing_images i where i.housing_id = h.id) as jumlah_foto,
         h.total_units,
         h.needs_review,
         (select array_agg(f::text)
            from public.housing_verifications v, unnest(v.checked) f
           where v.housing_id = h.id
             and v.created_at = (select max(v2.created_at) from public.housing_verifications v2
                                  where v2.housing_id = h.id)) as verified_fields
  from public.housings h
  left join public.regions r on r.id = h.region_id
  where h.deleted_at is null
  order by prioritas, h.verification_due_at nulls first, h.name
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;
grant execute on function public.verification_queue(integer) to authenticated;

-- ============================================================
-- 9. TUTUP HAK EKSEKUSI PUBLIC PADA SELURUH RPC VERIFIKASI
--
--    Ini cacat yang sama persis dengan yang dicatat RUNBOOK §7 dan sudah
--    pernah menggigit proyek ini di migrasi 0003 → 0007:
--
--      "Mencabut hak dari `anon` saja tidak cukup. ACL fungsi PostgreSQL punya
--       entri PUBLIC (=X/...) yang diwarisi anon. Selalu revoke ... from public
--       lalu beri ulang secara eksplisit."
--
--    `grant execute ... to authenticated` TIDAK menghapus hak bawaan PUBLIC.
--    Akibatnya seluruh RPC verifikasi bisa dipanggil dengan kunci anon lewat
--    POST /rest/v1/rpc/<nama>. Yang paling nyata: verification_queue
--    mengembalikan 16 baris berisi needs_review, developer_id, prioritas, dan
--    hari_terlambat — keadaan kerja internal yang bukan bagian dari janji
--    publik. Penulisan sendiri tetap tertahan RLS karena semua fungsi ini
--    security invoker, jadi ini kebocoran BACA, bukan tulis.
--
--    verify_housing, housing_field_checks, dan verification_metrics berasal
--    dari 0013 dan punya cacat yang sama sejak awal; diperbaiki sekalian di
--    sini supaya tidak ada satu pun RPC verifikasi yang tersisa terbuka.
--
--    Rollback: grant execute on function <nama> to public;  (jangan.)
-- ============================================================

revoke execute on function public.verify_housing(uuid, text[], text, integer) from public, anon;
grant  execute on function public.verify_housing(uuid, text[], text, integer) to authenticated;

revoke execute on function public.mark_needs_update(uuid, text) from public, anon;
grant  execute on function public.mark_needs_update(uuid, text) to authenticated;

revoke execute on function public.housing_field_checks(uuid) from public, anon;
grant  execute on function public.housing_field_checks(uuid) to authenticated;

revoke execute on function public.verification_queue(integer) from public, anon;
grant  execute on function public.verification_queue(integer) to authenticated;

revoke execute on function public.verification_metrics() from public, anon;
grant  execute on function public.verification_metrics() to authenticated;
