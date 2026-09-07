-- ============================================================
-- KPR BRI — Migrasi 0022_analytics
--
-- Membuat housing_events benar-benar terpakai. Tabelnya ada sejak 0001 dan
-- sejak itu hanya SATU baris jenis yang pernah ditulis ('click_kontak', dari
-- tombol WhatsApp); 'view_detail', 'click_peta', dan 'submit_lead' tidak
-- pernah punya penulis, session_hash dan referrer tidak pernah terisi, dan
-- tidak ada satu pun kueri yang membacanya. PRD §fase 5 memang menyiapkannya
-- untuk pekerjaan ini.
--
-- Migrasi ini melakukan empat hal:
--   1. Menutup jalur tulis yang terbuka lebar (bagian 1).
--   2. Memberi satu-satunya pintu masuk yang terkendali: record_event().
--   3. Menambah indeks waktu yang dibutuhkan agregasi harian.
--   4. Enam fungsi metrik untuk /admin/analitik.
--
-- Bergantung pada 0021: 'kunjungan' dan 'pakai_kalkulator' harus sudah ada
-- sebagai nilai enum sebelum berkas ini dijalankan.
--
-- Rollback:
--   drop function public.analytics_band(integer), public.analytics_rujukan(integer,integer),
--                 public.analytics_jam(integer), public.analytics_lokasi(integer),
--                 public.analytics_properti(integer,integer), public.analytics_harian(integer),
--                 public.analytics_funnel(integer), public.record_event(uuid,event_type,text,text);
--   drop index public.housing_events_created_idx;
--   create policy events_insert_public on public.housing_events
--     for insert to anon, authenticated with check (true);
--   grant insert on public.housing_events to anon, authenticated;
--   delete from public.app_settings where key = 'rate_limits';  -- lalu jalankan ulang 0014 bagian 4
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. MENUTUP JALUR TULIS
--
-- `events_insert_public` berbunyi `for insert to anon with check (true)`, dan
-- kunci anon ikut terkirim di dalam bundel peramban. Artinya siapa pun yang
-- membuka DevTools bisa menembak PostgREST langsung dan menuliskan baris
-- analitik sebanyak yang ia mau — jenis apa pun, perumahan apa pun, sesi apa
-- pun. Selama tabelnya tidak pernah dibaca, itu tidak merugikan siapa-siapa.
-- Begitu ia menjadi dasar dasbor yang dipakai mengambil keputusan pemasaran,
-- ia menjadi corong racun.
--
-- Pola yang benar sudah ada di repositori ini: `leads` juga menerima tulisan
-- dari publik, tetapi lewat submit_lead() SECURITY DEFINER — bukan lewat
-- INSERT langsung. record_event() memberi housing_events perlakuan yang sama.
-- ============================================================

drop policy if exists events_insert_public on public.housing_events;
revoke insert on public.housing_events from anon, authenticated;

-- ------------------------------------------------------------
-- record_event() — satu-satunya pintu masuk.
--
-- SECURITY DEFINER, jadi ia menulis meski pemanggilnya sudah tidak punya
-- hak INSERT sama sekali. Yang membatasi bukan lagi hak tabel melainkan
-- bentuk fungsi ini: kolomnya tetap, jenisnya wajib nilai enum yang sah,
-- referrer dipangkas menjadi ASAL saja, dan session dibatasi panjangnya.
--
-- Tiga hal yang sengaja TIDAK dilakukan di sini:
--
--   * Tidak memvalidasi housing_id ke housings. Foreign key sudah
--     melakukannya, dan menambah SELECT di jalur panas hanya untuk
--     mengulangnya adalah biaya per peristiwa tanpa hasil.
--   * Tidak menolak apa pun dengan galat. Pemanggilnya adalah suar latar
--     belakang; galat yang dilempar ke sana tidak ada yang membaca, tetapi
--     tetap menghabiskan koneksi. Masukan yang tidak masuk akal dibuang
--     diam-diam.
--   * Tidak menyentuh kuota. Itu urusan guard_request() di lapisan aplikasi,
--     yang sudah punya seluruh konteks identitasnya.
--
-- Referrer: hanya skema+host yang disimpan. URL penuh dari situs lain bisa
-- membawa string kueri berisi apa saja — termasuk data pribadi milik orang
-- yang bahkan bukan pengunjung kita. Menyimpan asalnya menjawab "dari mana
-- mereka datang" tanpa memungut satu pun dari itu.
-- ------------------------------------------------------------
create or replace function public.record_event(
  p_housing_id uuid,
  p_kind       public.event_type,
  p_session    text,
  p_referrer   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesi text;
  v_ref  text;
begin
  -- Sesi kosong tetap dicatat: peristiwanya nyata sekalipun kita tidak tahu
  -- siapa. Yang dibuang hanya nilai yang mustahil (kepanjangan, artinya
  -- bukan dari klien kita).
  v_sesi := nullif(left(coalesce(p_session, ''), 64), '');

  -- Sudah dipangkas menjadi asal di klien; dipangkas lagi di sini karena
  -- apa pun yang datang dari klien bisa dipalsukan.
  v_ref := nullif(left(coalesce(p_referrer, ''), 200), '');
  if v_ref is not null and v_ref !~ '^https?://[A-Za-z0-9.:-]+$' then
    v_ref := null;
  end if;

  insert into public.housing_events (housing_id, kind, session_hash, referrer)
  values (p_housing_id, p_kind, v_sesi, v_ref);
end;
$$;

revoke all on function public.record_event(uuid, public.event_type, text, text) from public;
grant execute on function public.record_event(uuid, public.event_type, text, text)
  to anon, authenticated;

-- ============================================================
-- 2. INDEKS
--
-- Dua indeks yang ada berawalan housing_id dan kind. Deret harian menyapu
-- rentang waktu LINTAS seluruh jenis dan seluruh perumahan, jadi tidak satu
-- pun dari keduanya bisa dipakai untuk itu.
-- ============================================================
create index if not exists housing_events_created_idx
  on public.housing_events (created_at desc);

-- ============================================================
-- 3. KUOTA UNTUK AKSI 'peristiwa'
--
-- Tanpa entri sendiri, guard_request() jatuh ke 'default' = 60 per jam
-- dengan ambang tantangan 30. Dua-duanya salah untuk suar analitik:
-- 60 peristiwa per jam habis oleh satu orang yang benar-benar menelusuri
-- katalog, dan sebuah TANTANGAN Turnstile untuk permintaan latar belakang
-- adalah kotak verifikasi yang muncul entah dari mana pada halaman yang
-- sedang dibaca dengan tenang.
--
-- Karena itu ambang tantangan disamakan dengan batasnya: putusan 'tantang'
-- tidak pernah bisa terjadi untuk aksi ini. Yang tersisa hanyalah 'lolos'
-- atau 'tolak', dan 'tolak' pun berakhir sebagai baris yang tidak ditulis —
-- bukan sebagai apa pun yang dilihat pengunjung.
-- ============================================================
update public.app_settings
   set value = jsonb_set(value, '{peristiwa}', jsonb_build_array(300, 3600, 300), true),
       description = 'Batas laju per identitas per aksi: [batas, jendela detik, ambang tantangan].'
 where key = 'rate_limits';

-- ============================================================
-- 4. FUNGSI METRIK
--
-- Semuanya `security invoker`, seperti lead_metrics()/verification_metrics():
-- RLS yang memutuskan siapa melihat apa, bukan penyaringan di lapisan
-- aplikasi yang akan menjadi tempat kedua yang bisa salah.
--
-- Konsekuensinya harus diketahui sebelum membaca angka mana pun:
-- `events_read_staff` berbunyi `using (public.is_admin())`, jadi seorang
-- 'pengembang' mendapat NOL BARIS, bukan galat. Itulah sebabnya
-- /admin/analitik dibatasi untuk admin di lapisan halaman — dasbor penuh nol
-- lebih menyesatkan daripada pintu yang terkunci.
--
-- Memperluasnya ke pengembang adalah perubahan satu kebijakan:
--   create policy events_read_developer on public.housing_events
--     for select to authenticated using (
--       housing_id in (select id from public.housings
--                       where developer_id = public.my_developer_id()));
-- Sengaja TIDAK diambil sekarang: peristiwa tanpa housing_id ('kunjungan')
-- tidak bisa diatribusikan ke pengembang mana pun, sehingga corong mereka
-- akan kehilangan tahap teratasnya dan tampak seolah setiap pengunjung
-- langsung mendarat di properti mereka.
--
-- ZONA WAKTU. Seluruh pengelompokan harian dan per jam memakai
-- 'Asia/Jakarta', bukan UTC. Ini bukan kerapian: WIB adalah UTC+7, jadi
-- setiap peristiwa antara pukul 00.00 dan 07.00 WIB jatuh ke TANGGAL
-- SEBELUMNYA bila dikelompokkan dalam UTC. Kesalahan yang sama pernah
-- didokumentasikan untuk pg_cron di docs/RUNBOOK.md §6.
-- ============================================================

-- ------------------------------------------------------------
-- 4a. analytics_funnel — satu baris, corong lengkap + jendela pembanding.
--
-- Setiap tahap dihitung sebagai SESI YANG BERBEDA, bukan jumlah peristiwa.
-- Corong menggambarkan perpindahan ORANG dari satu tahap ke tahap
-- berikutnya; menghitung peristiwa membuat satu orang yang membuka sepuluh
-- halaman detail tampil sebagai sepuluh orang, dan tahap kedua menjadi lebih
-- lebar daripada tahap pertama — corong yang melebar ke bawah adalah corong
-- yang salah baca, bukan kabar baik.
--
-- 'kunjungan' diturunkan dari sesi yang punya peristiwa APA PUN, bukan dari
-- peristiwa berjenis 'kunjungan'. Sebabnya praktis: suar di layout bisa saja
-- gagal terkirim sementara suar berikutnya berhasil. Menghitung sesi yang
-- terlihat membuat angkanya memperbaiki dirinya sendiri alih-alih kehilangan
-- orang yang jelas-jelas ada jejaknya.
--
-- 'prospek' dan 'pengajuan' TIDAK berasal dari housing_events melainkan dari
-- leads/lead_status_history — di sanalah kebenarannya, ditulis server saat
-- pengiriman berhasil. Suar bisa diblokir pemblokir iklan; baris prospek
-- tidak bisa.
--
-- 'tampilan' adalah satu-satunya angka MENTAH di sini (jumlah peristiwa,
-- bukan sesi). Ia menjawab pertanyaan yang berbeda — seberapa banyak halaman
-- properti dibuka — dan diberi label berbeda di layar supaya tidak pernah
-- disalahartikan sebagai jumlah orang.
-- ------------------------------------------------------------
create or replace function public.analytics_funnel(p_days integer default 30)
returns table (
  kunjungan             bigint,
  lihat_properti        bigint,
  pakai_kalkulator      bigint,
  kontak                bigint,
  prospek               bigint,
  pengajuan             bigint,
  tampilan              bigint,
  kunjungan_lalu        bigint,
  lihat_properti_lalu   bigint,
  pakai_kalkulator_lalu bigint,
  kontak_lalu           bigint,
  prospek_lalu          bigint,
  pengajuan_lalu        bigint,
  tampilan_lalu         bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (
    select now() - make_interval(days => greatest(p_days, 1))     as mulai,
           now() - make_interval(days => greatest(p_days, 1) * 2) as mulai_lalu
  ),
  e as (
    select h.kind, h.session_hash, h.created_at, r.mulai
      from public.housing_events h cross join r
     where h.created_at >= r.mulai_lalu
  ),
  l as (
    select l.created_at, r.mulai
      from public.leads l cross join r
     where l.created_at >= r.mulai_lalu
  ),
  s as (
    select s.created_at, r.mulai
      from public.lead_status_history s cross join r
     where s.ke = 'pengajuan' and s.created_at >= r.mulai_lalu
  )
  select
    (select count(distinct session_hash) from e where created_at >= mulai),
    (select count(distinct session_hash) from e where created_at >= mulai and kind = 'view_detail'),
    (select count(distinct session_hash) from e where created_at >= mulai and kind = 'pakai_kalkulator'),
    (select count(distinct session_hash) from e where created_at >= mulai and kind = 'click_kontak'),
    (select count(*) from l where created_at >= mulai),
    (select count(*) from s where created_at >= mulai),
    (select count(*) from e where created_at >= mulai and kind = 'view_detail'),
    (select count(distinct session_hash) from e where created_at < mulai),
    (select count(distinct session_hash) from e where created_at < mulai and kind = 'view_detail'),
    (select count(distinct session_hash) from e where created_at < mulai and kind = 'pakai_kalkulator'),
    (select count(distinct session_hash) from e where created_at < mulai and kind = 'click_kontak'),
    (select count(*) from l where created_at < mulai),
    (select count(*) from s where created_at < mulai),
    (select count(*) from e where created_at < mulai and kind = 'view_detail');
$$;
grant execute on function public.analytics_funnel(integer) to authenticated;

-- ------------------------------------------------------------
-- 4b. analytics_harian — deret waktu, satu baris per hari.
--
-- generate_series lebih dulu, LEFT JOIN sesudahnya. Hari tanpa data harus
-- keluar sebagai nol, bukan hilang: garis tren yang melompati hari kosong
-- menyambungkan dua titik yang tidak bersebelahan dan menggambar kenaikan
-- yang tidak pernah terjadi.
-- ------------------------------------------------------------
create or replace function public.analytics_harian(p_days integer default 30)
returns table (
  hari        date,
  pengunjung  bigint,
  tampilan    bigint,
  kalkulator  bigint,
  kontak      bigint,
  prospek     bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with hari_list as (
    select generate_series(
             (now() at time zone 'Asia/Jakarta')::date - (greatest(p_days, 1) - 1),
             (now() at time zone 'Asia/Jakarta')::date,
             interval '1 day')::date as d
  ),
  ev as (
    select (created_at at time zone 'Asia/Jakarta')::date as d,
           kind, session_hash
      from public.housing_events
     where created_at >= now() - make_interval(days => greatest(p_days, 1) + 1)
  ),
  pr as (
    select (created_at at time zone 'Asia/Jakarta')::date as d
      from public.leads
     where created_at >= now() - make_interval(days => greatest(p_days, 1) + 1)
  )
  select
    hl.d,
    coalesce(count(distinct ev.session_hash), 0),
    coalesce(count(*) filter (where ev.kind = 'view_detail'), 0),
    coalesce(count(*) filter (where ev.kind = 'pakai_kalkulator'), 0),
    coalesce(count(*) filter (where ev.kind = 'click_kontak'), 0),
    coalesce((select count(*) from pr where pr.d = hl.d), 0)
  from hari_list hl
  left join ev on ev.d = hl.d
  group by hl.d
  order by hl.d;
$$;
grant execute on function public.analytics_harian(integer) to authenticated;

-- ------------------------------------------------------------
-- 4c. analytics_properti — perumahan mana yang bekerja.
--
-- Konversi dihitung di sini, bukan di TypeScript, karena pembaginya bisa nol
-- dan jawaban yang benar untuk 0 tampilan adalah NULL ("belum bisa
-- dihitung"), bukan 0% ("buruk"). Perbedaannya penting: perumahan yang baru
-- terbit kemarin tidak pantas berada di dasar tabel peringkat.
-- ------------------------------------------------------------
create or replace function public.analytics_properti(
  p_days  integer default 30,
  p_limit integer default 10
)
returns table (
  housing_id uuid,
  name       text,
  slug       text,
  tampilan   bigint,
  kontak     bigint,
  prospek    bigint,
  konversi   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (select now() - make_interval(days => greatest(p_days, 1)) as mulai),
  ev as (
    select e.housing_id,
           count(*) filter (where e.kind = 'view_detail')  as tampilan,
           count(*) filter (where e.kind = 'click_kontak') as kontak
      from public.housing_events e cross join r
     where e.created_at >= r.mulai and e.housing_id is not null
     group by e.housing_id
  ),
  pr as (
    select l.housing_id, count(*) as prospek
      from public.leads l cross join r
     where l.created_at >= r.mulai and l.housing_id is not null
     group by l.housing_id
  )
  select h.id,
         h.name,
         h.slug::text,
         coalesce(ev.tampilan, 0),
         coalesce(ev.kontak, 0),
         coalesce(pr.prospek, 0),
         case when coalesce(ev.tampilan, 0) = 0 then null
              else round(coalesce(pr.prospek, 0)::numeric * 100 / ev.tampilan, 1)
         end
    from public.housings h
    left join ev on ev.housing_id = h.id
    left join pr on pr.housing_id = h.id
   where h.deleted_at is null
     and (coalesce(ev.tampilan, 0) > 0 or coalesce(pr.prospek, 0) > 0)
   order by coalesce(ev.tampilan, 0) desc, coalesce(pr.prospek, 0) desc, h.name
   limit greatest(p_limit, 1);
$$;
grant execute on function public.analytics_properti(integer, integer) to authenticated;

-- ------------------------------------------------------------
-- 4d. analytics_lokasi — minat per kecamatan.
--
-- Perumahan tanpa region_id dikelompokkan sebagai 'Tanpa kecamatan' alih-alih
-- dibuang. Membuangnya membuat jumlah kolom ini tidak sama dengan jumlah di
-- kartu ringkasan, dan selisih yang tak dijelaskan selalu berakhir sebagai
-- pertanyaan "datanya mana yang benar".
-- ------------------------------------------------------------
create or replace function public.analytics_lokasi(p_days integer default 30)
returns table (
  district text,
  tampilan bigint,
  prospek  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (select now() - make_interval(days => greatest(p_days, 1)) as mulai),
  ev as (
    select h.region_id, count(*) as tampilan
      from public.housing_events e
      join public.housings h on h.id = e.housing_id
     cross join r
     where e.created_at >= r.mulai and e.kind = 'view_detail'
     group by h.region_id
  ),
  pr as (
    select h.region_id, count(*) as prospek
      from public.leads l
      join public.housings h on h.id = l.housing_id
     cross join r
     where l.created_at >= r.mulai
     group by h.region_id
  ),
  gab as (
    select coalesce(ev.region_id, pr.region_id) as region_id,
           coalesce(ev.tampilan, 0) as tampilan,
           coalesce(pr.prospek, 0)  as prospek
      from ev full outer join pr on pr.region_id = ev.region_id
  )
  select coalesce(reg.district, 'Tanpa kecamatan'),
         sum(gab.tampilan),
         sum(gab.prospek)
    from gab
    left join public.regions reg on reg.id = gab.region_id
   group by coalesce(reg.district, 'Tanpa kecamatan')
   order by sum(gab.tampilan) desc, sum(gab.prospek) desc;
$$;
grant execute on function public.analytics_lokasi(integer) to authenticated;

-- ------------------------------------------------------------
-- 4e. analytics_jam — kapan orang datang (WIB).
--
-- dow: 0 = Minggu, mengikuti extract(dow). Dipetakan ke nama hari di
-- TypeScript, bukan di sini — nama hari adalah urusan tampilan.
--
-- Gunanya bukan rasa ingin tahu: SLA kontak pertama empat jam
-- (docs/RUNBOOK.md §6b) hanya bisa dipenuhi bila ada orang yang berjaga saat
-- prospeknya benar-benar masuk.
-- ------------------------------------------------------------
create or replace function public.analytics_jam(p_days integer default 30)
returns table (
  dow    integer,
  jam    integer,
  jumlah bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select extract(dow  from created_at at time zone 'Asia/Jakarta')::integer,
         extract(hour from created_at at time zone 'Asia/Jakarta')::integer,
         count(*)
    from public.housing_events
   where created_at >= now() - make_interval(days => greatest(p_days, 1))
   group by 1, 2;
$$;
grant execute on function public.analytics_jam(integer) to authenticated;

-- ------------------------------------------------------------
-- 4f. analytics_rujukan — dari mana pengunjung datang.
--
-- Hanya asal (skema+host); record_event() sudah menolak apa pun yang lebih
-- panjang dari itu. Kunjungan langsung dan tautan dari dalam situs sendiri
-- masuk sebagai NULL dan sengaja tidak ditampilkan sebagai "langsung" —
-- keduanya tidak bisa dibedakan, dan menamai gabungan itu "langsung" adalah
-- menebak.
-- ------------------------------------------------------------
create or replace function public.analytics_rujukan(
  p_days  integer default 30,
  p_limit integer default 8
)
returns table (
  asal   text,
  jumlah bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select referrer,
         count(distinct session_hash)
    from public.housing_events
   where created_at >= now() - make_interval(days => greatest(p_days, 1))
     and referrer is not null
   group by referrer
   order by count(distinct session_hash) desc, referrer
   limit greatest(p_limit, 1);
$$;
grant execute on function public.analytics_rujukan(integer, integer) to authenticated;

-- ------------------------------------------------------------
-- 4g. analytics_band — sebaran kemampuan bayar prospek.
--
-- Angkanya dilaporkan sendiri calon pembeli dan band-nya dihitung ulang
-- server (0019). Ia BUKAN penilaian kelayakan kredit dan tidak boleh dipakai
-- sebagai dasar keputusan — hanya gambaran seperti apa orang yang tertarik.
-- Prospek tanpa data penghasilan keluar sebagai band NULL, dan itu angka
-- yang berguna tersendiri: seberapa sering formulir dikirim tanpa lewat
-- kalkulator sama sekali.
-- ------------------------------------------------------------
create or replace function public.analytics_band(p_days integer default 30)
returns table (
  band   text,
  jumlah bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select affordability_band,
         count(*)
    from public.leads
   where created_at >= now() - make_interval(days => greatest(p_days, 1))
   group by affordability_band;
$$;
grant execute on function public.analytics_band(integer) to authenticated;
