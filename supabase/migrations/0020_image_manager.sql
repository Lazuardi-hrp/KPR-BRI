-- ============================================================
-- KPR BRI — Migrasi 0020_image_manager
--
-- Membuat galeri foto bisa dikelola dari dashboard, bukan lewat skrip.
-- Semua yang ada di sini menutup celah yang muncul begitu orang — bukan
-- migrasi — yang menambah dan menghapus baris housing_images.
--
-- Empat hal yang TIDAK BISA dikerjakan aplikasi dengan benar sendirian:
--
--   1. Menukar sampul. housing_images_one_cover_uq (0001) adalah indeks unik
--      parsial yang TIDAK deferrable: "matikan yang lama" dan "nyalakan yang
--      baru" harus berada dalam satu transaksi. Dua panggilan PostgREST
--      berturut-turut tidak begitu — bila yang kedua gagal, perumahan
--      kehilangan sampulnya dan ubahStatusPerumahan() menolak menerbitkannya.
--
--   2. Mengurutkan ulang. Satu PATCH per foto berarti dua belas perjalanan
--      jaringan dan dua belas titik gagal untuk satu tindakan seret-lepas.
--
--   3. Menghapus sampul. Menghapus baris bersampul meninggalkan perumahan
--      terbit tanpa sampul — kartunya tampil rusak di beranda. Penerusnya
--      harus diangkat dalam transaksi yang sama dengan penghapusannya.
--
--   4. Foto pertama. Sebelum ini, is_cover disetel tangan oleh seed. Unggahan
--      dari dashboard tidak punya siapa pun yang mengingatnya.
--
-- Otorisasi: keempat fungsi di bawah SECURITY INVOKER, jadi RLS tetap yang
-- memutuskan. Pemeriksaan is_admin()/my_developer_id() yang eksplisit di
-- dalamnya BUKAN pengganti RLS — ia ada supaya penolakan berupa galat yang
-- bisa dibaca, bukan "0 baris terpengaruh" yang senyap dan menyesatkan.
--
-- Rollback:
--   drop trigger if exists housing_images_defaults on public.housing_images;
--   drop trigger if exists housing_images_cap      on public.housing_images;
--   drop function if exists public.housing_images_defaults();
--   drop function if exists public.housing_images_cap();
--   drop function if exists public.set_housing_cover(uuid);
--   drop function if exists public.reorder_housing_images(uuid, uuid[]);
--   drop function if exists public.delete_housing_image(uuid);
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. housing_images_defaults — urutan dan sampul otomatis
--
--    sort_order = 0 diperlakukan sebagai "belum ditentukan", bukan "paling
--    depan": itu nilai default kolomnya, jadi setiap baris yang tidak
--    menyebutkannya akan bertumpuk di posisi nol dan urutannya jatuh ke
--    tiebreak id — acak bagi mata manusia.
--
--    SECURITY DEFINER supaya hitungan foto yang sudah ada benar apa adanya.
--    Dengan hak pemanggil, RLS bisa menyembunyikan sebagian baris dan foto
--    kedua akan mengira dirinya yang pertama — lalu melanggar
--    housing_images_one_cover_uq.
-- ============================================================

create or replace function public.housing_images_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_berikut integer;
begin
  if new.sort_order = 0 then
    select coalesce(max(sort_order), -1) + 1 into v_berikut
      from public.housing_images where housing_id = new.housing_id;
    new.sort_order := least(v_berikut, 32767)::smallint;
  end if;

  -- Foto pertama sebuah perumahan selalu menjadi sampul. Tanpa ini, admin
  -- bisa mengunggah selusin foto dan tetap tidak bisa menerbitkan apa pun,
  -- tanpa satu pun pesan yang menjelaskan kenapa.
  if not new.is_cover
     and not exists (select 1 from public.housing_images
                      where housing_id = new.housing_id and is_cover) then
    new.is_cover := true;
  end if;

  return new;
end $$;

revoke execute on function public.housing_images_defaults() from public, anon, authenticated;

drop trigger if exists housing_images_defaults on public.housing_images;
create trigger housing_images_defaults
  before insert on public.housing_images
  for each row execute function public.housing_images_defaults();

-- ============================================================
-- 2. housing_images_cap — batas 12 foto per perumahan
--
--    Bukan batas penyimpanan: bucket 'perumahan' punya batasnya sendiri.
--    Ini batas HALAMAN. Setiap foto pada v_housing_public ikut dalam
--    jsonb_agg yang dikirim ke beranda dan /map untuk 16 perumahan
--    sekaligus, dan galeri publik memuat semuanya. Selusin sudah lebih dari
--    cukup untuk satu perumahan subsidi, dan menaruh batasnya di basis data
--    berarti ia berlaku juga untuk skrip dan SQL langsung.
--
--    Pesannya sengaja berbahasa Indonesia dan layak dibaca pengguna: ia
--    diteruskan apa adanya oleh aplikasi bila pemeriksaan di sisi aplikasi
--    entah bagaimana terlewat.
-- ============================================================

create or replace function public.housing_images_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah integer;
begin
  select count(*) into v_jumlah from public.housing_images where housing_id = new.housing_id;
  if v_jumlah >= 12 then
    raise exception 'Batas 12 foto per perumahan sudah tercapai. Hapus salah satu foto lama lebih dulu.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke execute on function public.housing_images_cap() from public, anon, authenticated;

drop trigger if exists housing_images_cap on public.housing_images;
create trigger housing_images_cap
  before insert on public.housing_images
  for each row execute function public.housing_images_cap();

-- ============================================================
-- 3. set_housing_cover — tukar sampul dalam satu transaksi
-- ============================================================

create or replace function public.set_housing_cover(p_image_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_housing uuid;
  v_sudah   boolean;
begin
  select i.housing_id, i.is_cover into v_housing, v_sudah
    from public.housing_images i
    join public.housings h on h.id = i.housing_id
   where i.id = p_image_id
     and h.deleted_at is null
     and (public.is_admin() or h.developer_id = public.my_developer_id());

  if v_housing is null then
    raise exception 'Foto tidak ditemukan atau bukan wewenang Anda.'
      using errcode = 'no_data_found';
  end if;

  if v_sudah then return; end if;   -- sudah menjadi sampul; tidak ada yang perlu diubah

  -- Urutannya wajib: matikan dulu, nyalakan kemudian. Terbalik, indeks unik
  -- parsial menolak UPDATE kedua dan sampul lama tidak pernah lepas.
  update public.housing_images
     set is_cover = false
   where housing_id = v_housing and is_cover and id <> p_image_id;

  update public.housing_images
     set is_cover = true
   where id = p_image_id;

  -- Nol baris di sini hanya bisa berarti RLS menolak UPDATE-nya. Tanpa
  -- pemeriksaan ini fungsinya "berhasil" tanpa mengubah apa pun — dan
  -- perumahannya baru saja kehilangan sampul lamanya pada UPDATE di atas.
  if not found then
    raise exception 'Anda tidak berhak mengubah foto perumahan ini.'
      using errcode = 'insufficient_privilege';
  end if;
end $$;

revoke execute on function public.set_housing_cover(uuid) from public, anon;
grant  execute on function public.set_housing_cover(uuid) to authenticated;

-- ============================================================
-- 4. reorder_housing_images — satu perjalanan untuk seluruh galeri
--
--    Daftarnya harus UTUH: setiap foto milik perumahan itu disebut tepat
--    sekali. Menerima daftar sebagian akan menyisakan foto pada posisi
--    lamanya dan menghasilkan sort_order kembar — dua foto bertukar tempat
--    setiap kali halaman dimuat ulang, tanpa ada yang mengubah apa pun.
-- ============================================================

create or replace function public.reorder_housing_images(p_housing_id uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_ada    integer;
  v_kirim  integer;
  v_terubah integer;
begin
  if not exists (select 1 from public.housings h
                  where h.id = p_housing_id
                    and h.deleted_at is null
                    and (public.is_admin() or h.developer_id = public.my_developer_id())) then
    raise exception 'Anda tidak berhak mengubah foto perumahan ini.'
      using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_ada from public.housing_images where housing_id = p_housing_id;
  select count(distinct u) into v_kirim from unnest(p_ids) u;

  if v_ada <> v_kirim then
    raise exception 'Urutan foto tidak utuh. Muat ulang halaman lalu coba lagi.'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.housing_images i
     set sort_order = o.posisi
    from (select u.id, (u.urut - 1)::smallint as posisi
            from unnest(p_ids) with ordinality as u(id, urut)) o
   where i.id = o.id
     and i.housing_id = p_housing_id;

  -- Setiap foto perumahan ini harus tersentuh. Kurang dari itu berarti RLS
  -- menyaring sebagian baris, dan galeri berakhir setengah terurut — persis
  -- keadaan sort_order kembar yang dicegah pemeriksaan keutuhan di atas.
  get diagnostics v_terubah = row_count;
  if v_terubah <> v_ada then
    raise exception 'Anda tidak berhak mengubah foto perumahan ini.'
      using errcode = 'insufficient_privilege';
  end if;
end $$;

revoke execute on function public.reorder_housing_images(uuid, uuid[]) from public, anon;
grant  execute on function public.reorder_housing_images(uuid, uuid[]) to authenticated;

-- ============================================================
-- 5. delete_housing_image — hapus baris, angkat penerus sampul
--
--    Mengembalikan storage_path supaya aplikasi tahu berkas mana yang harus
--    ikut dihapus dari bucket. Baris dihapus lebih dulu, berkasnya belakangan:
--    urutan sebaliknya bisa meninggalkan baris yang menunjuk berkas yang
--    sudah tidak ada — gambar rusak di situs publik. Berkas yatim yang
--    tertinggal karena penghapusan objek gagal tidak terlihat siapa pun.
-- ============================================================

create or replace function public.delete_housing_image(p_image_id uuid)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_housing uuid;
  v_path    text;
  v_sampul  boolean;
begin
  select i.housing_id, i.storage_path, i.is_cover
    into v_housing, v_path, v_sampul
    from public.housing_images i
    join public.housings h on h.id = i.housing_id
   where i.id = p_image_id
     and h.deleted_at is null
     and (public.is_admin() or h.developer_id = public.my_developer_id());

  if v_housing is null then
    raise exception 'Foto tidak ditemukan atau bukan wewenang Anda.'
      using errcode = 'no_data_found';
  end if;

  delete from public.housing_images where id = p_image_id;

  -- Pembacaan di atas sudah menguji predikat yang sama dengan
  -- housing_images_write_staff, jadi ini seharusnya tidak pernah terpicu.
  -- Ia ada supaya perbedaan yang muncul kelak antara kedua predikat itu
  -- berhenti di sini, bukan di aplikasi — yang akan menghapus berkasnya dari
  -- bucket berdasarkan path yang dikembalikan fungsi ini sementara barisnya
  -- masih berdiri, dan menyisakan gambar rusak di halaman publik.
  if not found then
    raise exception 'Anda tidak berhak menghapus foto perumahan ini.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_sampul then
    update public.housing_images
       set is_cover = true
     where id = (select id from public.housing_images
                  where housing_id = v_housing
                  order by sort_order, created_at
                  limit 1);
  end if;

  return v_path;
end $$;

revoke execute on function public.delete_housing_image(uuid) from public, anon;
grant  execute on function public.delete_housing_image(uuid) to authenticated;
