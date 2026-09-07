-- ============================================================
-- KPR BRI — Migrasi 0019_kpr_planner
--
-- Kalkulator KPR berubah dari "berapa angsuran rumah ini" menjadi "rumah
-- seharga berapa yang masuk akal bagi penghasilan saya". Tiga akibatnya
-- sampai ke basis data:
--
--   1. Penghasilan dan komitmen bulanan yang diketik calon pembeli kini ikut
--      tersimpan pada prospek. Petugas menelepon sambil tahu kapasitas yang
--      diperhitungkan pengunjung, bukan hanya angsuran yang dilihatnya.
--   2. Teks persetujuan naik ke v2. Data keuangan adalah kategori baru yang
--      tidak tercakup teks v1, dan UU PDP mensyaratkan persetujuan menyebut
--      apa yang benar-benar dikumpulkan.
--   3. Parameter skema (bunga, tenor maksimum, uang muka minimum) pindah ke
--      app_settings. design.md §7.3 melarang menayangkan bunga tebakan;
--      selama mengoreksinya menuntut deploy, koreksinya akan tertunda.
--
-- CATATAN PENTING soal apa yang TIDAK dilakukan migrasi ini: kolom baru di
-- bawah adalah angka yang DILAPORKAN SENDIRI oleh pengunjung, tanpa dokumen
-- dan tanpa verifikasi. Ia bukan analisa kredit, tidak boleh diperlakukan
-- sebagai penilaian kelayakan, dan tidak boleh menjadi dasar keputusan apa
-- pun selain urutan menelepon.
--
-- Rollback: catatan per bagian.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. KAPASITAS YANG DIPERHITUNGKAN CALON PEMBELI
--
--    Sejenis dengan kolom KPR dari 0012: semuanya snapshot pada detik
--    pengiriman, bukan turunan yang ikut berubah kemudian.
--
--    affordability_band disimpan sebagai text + CHECK, bukan enum. Ambangnya
--    (30/35/45%) adalah kebijakan presentasi yang tinggal di src/lib/kpr.ts
--    dan wajar berubah tanpa migrasi; enum akan memaksa migrasi setiap kali
--    sebuah label diganti, dan itu harga yang tidak sepadan untuk empat nilai
--    yang tidak pernah dipakai JOIN.
--
--    Rollback:
--      alter table public.leads
--        drop column monthly_income,
--        drop column monthly_commitments,
--        drop column affordability_band;
-- ============================================================

alter table public.leads
  add column if not exists monthly_income      numeric(14,2),
  add column if not exists monthly_commitments numeric(14,2),
  add column if not exists affordability_band  text;

-- Batas atas ikut dijaga di sini, bukan hanya di zod: nilainya masuk lewat
-- SECURITY DEFINER yang berjalan sebagai pemilik, jadi lapisan aplikasi tidak
-- boleh menjadi satu-satunya yang menolak Rp 1 triliun karena salah ketik.
-- conrelid ikut disaring: conname unik per TABEL, bukan per skema, jadi
-- memeriksa namanya saja bisa melewatkan penambahan hanya karena tabel lain
-- kebetulan memakai nama yang sama.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.leads'::regclass
                    and conname = 'leads_income_ck') then
    alter table public.leads add constraint leads_income_ck
      check (monthly_income is null or monthly_income between 0 and 1000000000);
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.leads'::regclass
                    and conname = 'leads_commitments_ck') then
    alter table public.leads add constraint leads_commitments_ck
      check (monthly_commitments is null or monthly_commitments between 0 and 1000000000);
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.leads'::regclass
                    and conname = 'leads_afford_band_ck') then
    alter table public.leads add constraint leads_afford_band_ck
      check (affordability_band is null
             or affordability_band in ('aman', 'wajar', 'ketat', 'melebihi'));
  end if;
end $$;

comment on column public.leads.monthly_income is
  'Penghasilan bulanan yang DILAPORKAN SENDIRI calon pembeli di kalkulator. '
  'Tidak diverifikasi, tanpa dokumen pendukung, dan BUKAN hasil analisa kredit. '
  'Gunakan hanya sebagai konteks percakapan petugas.';
comment on column public.leads.monthly_commitments is
  'Cicilan lain per bulan yang dilaporkan sendiri calon pembeli. Sama seperti '
  'monthly_income: tidak diverifikasi dan bukan penilaian kelayakan.';
comment on column public.leads.affordability_band is
  'Band kemampuan bayar hasil hitungan server dari penghasilan yang dilaporkan '
  'dan harga tersimpan — bukan dari angka kiriman klien. Menggambarkan anggaran '
  'pengunjung, BUKAN keputusan atau penilaian BRI.';

-- ============================================================
-- 2. submit_lead v4
--
--    Menambah tiga parameter di EKOR daftar, sehingga pemanggil lama tetap
--    cocok lewat nilai bawaan. Yang lama tetap harus di-drop eksplisit:
--    PostgreSQL akan menyimpan keduanya sebagai overload, dan 0018 bagian
--    penutup sudah mencatat bahwa overload basi yang menumpuk di sebelah yang
--    baru adalah kegagalan yang pernah terjadi di proyek ini.
--
--    Rollback: definisi 16-argumen ada di 0018_security_hardening.sql bagian 3.
-- ============================================================

drop function if exists public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer);

create or replace function public.submit_lead(
  p_housing_id          uuid,
  p_name                text,
  p_phone               text,
  p_email               text    default null,
  p_message             text    default null,
  p_consent_version     text    default 'v2',
  p_ip_hash             text    default null,
  p_user_agent          text    default null,
  p_lead_kind           text    default 'form_minat',
  p_source_page         text    default null,
  p_price_snapshot      numeric default null,
  p_est_monthly_payment numeric default null,
  p_down_payment        numeric default null,
  p_tenor_years         integer default null,
  p_interest_rate       numeric default null,
  p_risk_score          integer default 0,
  p_monthly_income      numeric default null,
  p_monthly_commitments numeric default null,
  p_affordability_band  text    default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_recent   integer;
  v_nama     text;
  v_kind     public.lead_kind;
  v_dup      public.leads%rowtype;
  v_ulang    integer;
  v_telepon  text;
  v_band     text;
begin
  if p_housing_id is not null and not exists (
      select 1 from public.housings h
      where h.id = p_housing_id and h.status = 'published' and h.deleted_at is null) then
    raise exception 'Perumahan tidak ditemukan atau belum dipublikasikan'
      using errcode = 'P0002';
  end if;

  begin
    v_kind := p_lead_kind::public.lead_kind;
  exception when others then
    v_kind := 'form_minat';
  end;

  -- Band yang tidak dikenali dibuang menjadi null alih-alih memicu galat
  -- constraint. Nilai ini datang dari lapisan aplikasi, dan sebuah label yang
  -- meleset tidak sepadan dengan kehilangan seluruh prospeknya.
  v_band := case when p_affordability_band in ('aman', 'wajar', 'ketat', 'melebihi')
                 then p_affordability_band else null end;

  v_telepon := public.normalize_phone_id(p_phone);

  -- ---- Penggabungan duplikat ----
  --
  -- Sengaja dijalankan SEBELUM jaring kuota di bawah. Bila urutannya dibalik,
  -- orang yang mengirim ulang enam kali akan ditolak dengan galat, padahal
  -- yang seharusnya terjadi justru sebaliknya: kirimannya digabungkan diam-diam
  -- dan tidak ada satu pun baris baru yang perlu dihitung terhadap kuota.
  if v_telepon is not null then
    select * into v_dup from public.leads l
     where public.normalize_phone_id(l.phone) = v_telepon
       and l.housing_id is not distinct from p_housing_id
       and l.created_at > now() - interval '6 hours'
       and not public.lead_status_final(l.status)
     order by l.created_at desc
     limit 1;

    if found then
      -- Berapa kali orang ini sudah mengirim ulang untuk prospek tersebut.
      select count(*) into v_ulang from public.lead_notes n
       where n.lead_id = v_dup.id and n.author_id is null;

      update public.leads set
        -- Pesan digabung, bukan ditimpa: kalimat kedua sering memuat
        -- keterangan yang tidak ada di kalimat pertama.
        message = case
          when nullif(btrim(p_message), '') is null then message
          when message is null then btrim(p_message)
          when message = btrim(p_message) then message
          else left(message || E'\n\n— dikirim ulang —\n' || btrim(p_message), 4000)
        end,
        -- Konteks KPR disegarkan bila kiriman baru membawanya: simulasi
        -- terakhir adalah yang paling mendekati keinginan calon pembeli saat
        -- petugas menelepon. price_snapshot ikut disegarkan karena harga
        -- perumahan bisa berubah di antara dua kiriman.
        price_snapshot      = coalesce(p_price_snapshot,      price_snapshot),
        est_monthly_payment = coalesce(p_est_monthly_payment, est_monthly_payment),
        down_payment        = coalesce(p_down_payment,        down_payment),
        tenor_years         = coalesce(p_tenor_years::smallint, tenor_years),
        interest_rate       = coalesce(p_interest_rate,       interest_rate),
        -- Kapasitas mengikuti pola coalesce yang sama. Pengiriman kedua dari
        -- halaman detail (yang tidak menanyakan penghasilan) karenanya tidak
        -- menghapus angka yang sudah diberikan lewat /simulasi.
        monthly_income      = coalesce(p_monthly_income,      monthly_income),
        monthly_commitments = coalesce(p_monthly_commitments, monthly_commitments),
        affordability_band  = coalesce(v_band,                affordability_band),
        -- email::text, bukan ::citext: tipe citext berada di skema extensions
        -- sedangkan fungsi ini mengunci search_path ke public, jadi menyebut
        -- namanya di sini gagal saat dijalankan. Penugasan ke kolomnya
        -- melakukan cast implisit, sehingga tidak perlu disebut sama sekali.
        email               = coalesce(email::text, nullif(btrim(p_email), '')),
        last_activity_at    = now(),
        -- Skor risiko diambil yang tertinggi. Menurunkannya berarti satu
        -- kiriman bersih bisa mencuci jejak kiriman mencurigakan sebelumnya.
        risk_score          = greatest(risk_score, greatest(0, least(100, coalesce(p_risk_score, 0)))),
        is_flagged          = is_flagged or coalesce(p_risk_score, 0) >= 60
      where id = v_dup.id;

      -- author_id null menandai catatan sistem, bukan tulisan petugas.
      insert into public.lead_notes (lead_id, author_id, body)
      values (v_dup.id, null,
              'Pengunjung mengirim ulang formulir untuk perumahan yang sama' ||
              case when p_source_page is not null then ' dari ' || btrim(p_source_page) else '' end ||
              '. Digabungkan ke prospek ini alih-alih membuat prospek baru.');

      -- Dicatat untuk visibilitas, tetapi severity 0 selama masih wajar:
      -- bobot riwayat di guard_request adalah sum(severity), jadi severity 0
      -- membuat penggabungan terlihat oleh admin tanpa ikut menghukum
      -- pengunjung yang sekadar tidak sabar.
      if p_ip_hash is not null then
        insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
        values (p_ip_hash, 'duplicate_lead', 'lead_submit', p_source_page,
                case when v_ulang >= 3 then 1 else 0 end,
                jsonb_build_object('lead_id', v_dup.id, 'pengiriman_ke', v_ulang + 2));
      end if;

      -- Baru pada pengulangan yang sudah tidak masuk akal admin diberi tahu.
      if v_ulang + 2 >= 5 then
        insert into public.admin_notifications (kind, title, body, lead_id, housing_id, href, severity)
        values ('keamanan', 'Pengiriman formulir berulang',
                'Satu nomor mengirim formulir ' || (v_ulang + 2) ||
                ' kali untuk perumahan yang sama dalam 6 jam. Semuanya digabungkan ke satu prospek.',
                v_dup.id, p_housing_id, '/admin/prospek/' || v_dup.id::text, 1);
      end if;

      return jsonb_build_object('id', v_dup.id, 'duplikat', true);
    end if;
  end if;

  -- ---- Jaring terakhir: maks 5 prospek BARU / IP-hash / jam ----
  --
  -- Setelah penggabungan di atas, batas ini hanya tersentuh oleh identitas
  -- yang membuat prospek benar-benar berbeda satu demi satu — yaitu pola
  -- yang memang ingin ditahan, bukan pengunjung yang mengirim ulang.
  if p_ip_hash is not null then
    select count(*) into v_recent from public.leads
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_recent >= 5 then
      raise exception 'Terlalu banyak pengajuan. Coba lagi nanti.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.leads (
    housing_id, name, phone, email, message,
    consent_at, consent_version, ip_hash, user_agent,
    lead_kind, source_page,
    price_snapshot, est_monthly_payment, down_payment, tenor_years, interest_rate,
    monthly_income, monthly_commitments, affordability_band,
    risk_score, is_flagged)
  values (
    p_housing_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''),
    nullif(btrim(p_message), ''),
    now(), p_consent_version, p_ip_hash, left(p_user_agent, 400),
    v_kind, nullif(btrim(p_source_page), ''),
    p_price_snapshot, p_est_monthly_payment, p_down_payment,
    p_tenor_years::smallint, p_interest_rate,
    p_monthly_income, p_monthly_commitments, v_band,
    greatest(0, least(100, coalesce(p_risk_score, 0))),
    coalesce(p_risk_score, 0) >= 60)
  returning id into v_id;

  select h.name into v_nama from public.housings h where h.id = p_housing_id;

  insert into public.admin_notifications (kind, title, body, lead_id, housing_id, href, severity)
  values (
    'prospek_baru',
    'Prospek baru: ' || btrim(p_name),
    coalesce(v_nama, 'Tanpa perumahan') ||
      case when p_est_monthly_payment is not null
           then ' · estimasi angsuran ' || public.format_rupiah(p_est_monthly_payment) || '/bulan'
           else '' end,
    v_id, p_housing_id, '/admin/prospek/' || v_id::text,
    case when coalesce(p_risk_score, 0) >= 60 then 1 else 0 end);

  insert into public.notification_outbox (channel, recipient, template, payload)
  values ('email', 'admin', 'lead_baru', jsonb_build_object('lead_id', v_id));

  return jsonb_build_object('id', v_id, 'duplikat', false);
end $$;

revoke all on function public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer,
  numeric, numeric, text) from public;
grant execute on function public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer,
  numeric, numeric, text) to anon, authenticated;

-- ============================================================
-- 3. PARAMETER SKEMA KPR DI app_settings
--
--    Awalan `public.` menentukan segalanya: policy settings_read_public
--    (0001 baris 520) menyaring `key like 'public.%'`. Nama lain tidak
--    terbaca anon sama sekali, dan kalkulatornya akan diam-diam jatuh ke
--    angka cadangan yang dikompilasi — gagal tanpa suara, persis yang
--    paling mahal untuk dilacak.
--
--    Rollback: delete from public.app_settings where key = 'public.kpr_skema';
-- ============================================================

insert into public.app_settings (key, value, description) values (
  'public.kpr_skema',
  jsonb_build_object(
    'subsidi', jsonb_build_object(
      'bunga', 5, 'tenorMax', 20, 'tenorDefault', 15,
      'dpMinPersen', 1, 'dpDefaultPersen', 10),
    'komersial', jsonb_build_object(
      'bunga', 9.5, 'tenorMax', 30, 'tenorDefault', 15,
      'dpMinPersen', 15, 'dpDefaultPersen', 20),
    'ditinjau_pada', to_char(current_date, 'YYYY-MM-DD')
  ),
  'Parameter simulasi KPR yang BERLAKU: bunga (persen per tahun), tenor maksimum, '
  'dan uang muka minimum per skema. design.md §7.3 melarang menayangkan bunga tebakan — '
  'perbarui `ditinjau_pada` setiap kali angkanya dikonfirmasi ulang ke BRI. '
  'Nilai yang tidak sah diabaikan aplikasi dan digantikan cadangan di src/lib/kpr.ts.'
)
on conflict (key) do update
  set value = excluded.value, description = excluded.description;

-- ============================================================
-- 4. TEKS PERSETUJUAN v2
--
--    Kalkulator kini menanyakan penghasilan dan cicilan lain. Itu kategori
--    data yang tidak disebut teks v1, dan UU PDP No. 27/2022 menuntut
--    persetujuan menyebut apa yang benar-benar dikumpulkan. Prospek lama
--    tetap menyimpan 'v1' pada kolomnya — justru itu gunanya versi.
--
--    Rollback: update public.app_settings
--                set value = '"v1"'::jsonb where key = 'public.consent_version';
-- ============================================================

insert into public.app_settings (key, value, description) values
  ('public.consent_version', '"v2"'::jsonb,
   'Versi teks persetujuan yang sedang berlaku (PRD §13.2). v2 menambahkan data '
   'keuangan yang dilaporkan sendiri (penghasilan, cicilan lain) pada kalkulator. '
   'Teksnya ada di src/lib/schemas/lead.ts — keduanya wajib berubah bersama.')
on conflict (key) do update
  set value = excluded.value, description = excluded.description;
