-- ============================================================
-- KPR BRI — Migrasi 0018_security_hardening
--
-- Melengkapi lapisan anti-penyalahgunaan dari 0014. Yang ditambahkan di sini
-- adalah lima hal yang 0014 sengaja tinggalkan, dan semuanya bermuara pada
-- satu keluhan operasional yang sama: penjaganya sudah bekerja, tetapi
-- hasilnya belum bisa dibaca sebagai peristiwa bisnis.
--
--   1. Penggabungan prospek duplikat — pengiriman ulang oleh orang yang sama
--      untuk perumahan yang sama tidak lagi menjadi baris baru di CRM.
--   2. Perlindungan login — percobaan masuk yang gagal akhirnya tercatat dan
--      berujung blokir. Enum 'auth_fail' sudah ada sejak 0014 tetapi tidak
--      pernah ada satu pun penulisnya.
--   3. Alasan penolakan yang bisa dibedakan — "tunggu sebentar" dan "akses
--      dibatasi" adalah dua keadaan berbeda dan pantas berbunyi berbeda.
--   4. Deteksi lonjakan lalu lintas — 0014 hanya memberi tahu admin ketika
--      SATU identitas berulah. Serangan yang tersebar di ratusan identitas,
--      masing-masing di bawah kuota, lolos tanpa seorang pun diberi tahu.
--   5. Penyelesaian peristiwa — admin bisa menandai sebuah temuan sudah
--      ditangani, sehingga daftarnya menjadi antrean kerja alih-alih log
--      yang hanya bertambah panjang.
--
-- Rollback: catatan per bagian.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. NORMALISASI NOMOR TELEPON
--
--    Satu orang menulis nomornya dengan banyak cara: 0812-3456-7890,
--    +62 812 3456 7890, 62812 3456 7890. Perbandingan apa adanya membuat
--    ketiganya tampak seperti tiga orang berbeda, dan penggabungan duplikat
--    di bagian 2 akan gagal justru pada kasus yang paling sering terjadi.
--
--    IMMUTABLE karena dipakai di indeks ekspresi di bawah. Ia memang murni:
--    keluarannya hanya bergantung pada masukannya.
--
--    Rollback: drop index leads_dedup_idx; drop function public.normalize_phone_id(text);
-- ============================================================

create or replace function public.normalize_phone_id(p text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null then null
    -- Sisakan angkanya saja, lalu satukan ke bentuk kode negara 62.
    when regexp_replace(p, '[^0-9]', '', 'g') = '' then null
    when regexp_replace(p, '[^0-9]', '', 'g') like '0%'
      then '62' || substring(regexp_replace(p, '[^0-9]', '', 'g') from 2)
    when regexp_replace(p, '[^0-9]', '', 'g') like '62%'
      then regexp_replace(p, '[^0-9]', '', 'g')
    when regexp_replace(p, '[^0-9]', '', 'g') like '8%'
      then '62' || regexp_replace(p, '[^0-9]', '', 'g')
    else regexp_replace(p, '[^0-9]', '', 'g')
  end
$$;

-- Pencarian duplikat berjalan pada SETIAP pengiriman prospek. Tanpa indeks
-- ini ia menjadi seq scan atas seluruh tabel leads di jalur terpanas situs.
create index if not exists leads_dedup_idx
  on public.leads (public.normalize_phone_id(phone), housing_id, created_at desc);

-- ============================================================
-- 2. SUBMIT_LEAD — PENGGABUNGAN DUPLIKAT
--
--    Perilaku baru: bila orang yang sama (nomor telepon ternormalisasi)
--    mengirim lagi untuk perumahan yang sama dalam 6 jam dan prospek
--    sebelumnya belum ditutup, kiriman itu MEMPERBARUI prospek yang ada
--    alih-alih membuat yang baru.
--
--    Enam jam, bukan satu menit seperti contoh di brief: pengiriman ganda
--    yang benar-benar mengganggu operasional bukan hanya yang beruntun cepat.
--    Orang yang mengisi formulir pagi hari, tidak dihubungi, lalu mengisi lagi
--    siangnya tetap satu calon pembeli yang sama — dan dua baris untuknya
--    tetap berarti dua petugas menelepon nomor yang sama.
--
--    Yang TIDAK dilakukan saat menggabungkan: membuat notifikasi
--    'prospek_baru' kedua. Justru banjir notifikasi itulah yang membuat
--    admin berhenti membaca notifikasi.
--
--    Nilai kembali berubah dari uuid menjadi jsonb agar pemanggil tahu
--    kirimannya digabungkan — tanpa itu pengguna melihat "terkirim" untuk
--    kelima kalinya dan tetap mengira ada lima pengajuan berjalan.
--
--    Rollback: definisi sebelumnya (mengembalikan uuid) ada di
--    0012_lead_lifecycle.sql bagian 7.
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
  p_consent_version     text    default 'v1',
  p_ip_hash             text    default null,
  p_user_agent          text    default null,
  p_lead_kind           text    default 'form_minat',
  p_source_page         text    default null,
  p_price_snapshot      numeric default null,
  p_est_monthly_payment numeric default null,
  p_down_payment        numeric default null,
  p_tenor_years         integer default null,
  p_interest_rate       numeric default null,
  p_risk_score          integer default 0
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
    risk_score, is_flagged)
  values (
    p_housing_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''),
    nullif(btrim(p_message), ''),
    now(), p_consent_version, p_ip_hash, left(p_user_agent, 400),
    v_kind, nullif(btrim(p_source_page), ''),
    p_price_snapshot, p_est_monthly_payment, p_down_payment,
    p_tenor_years::smallint, p_interest_rate,
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
  text, text, numeric, numeric, numeric, integer, numeric, integer) from public;
grant execute on function public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer) to anon, authenticated;

-- ============================================================
-- 3. PERLINDUNGAN LOGIN
--
--    Supabase Auth punya pembatasnya sendiri, tetapi ia tidak tahu apa-apa
--    tentang risiko yang sudah dikumpulkan lapisan ini dan tidak menuliskan
--    apa pun ke halaman Keamanan. Tanpa fungsi ini, brute force terhadap
--    /admin/login adalah satu-satunya aksi bernilai tinggi di situs yang
--    tidak meninggalkan jejak sama sekali di dasbor.
--
--    Yang TIDAK disimpan: alamat surel yang dicoba. Menyimpannya berarti
--    membangun daftar surel petugas di tabel yang dibaca lebih longgar
--    daripada tabel profil — persis kebocoran yang sedang dicegah.
--
--    Rollback: drop function public.record_auth_fail(text);
-- ============================================================

create or replace function public.record_auth_fail(p_ip_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_gagal   integer;
  v_blokir  boolean := false;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then
    return jsonb_build_object('dicatat', false);
  end if;

  -- Fungsi ini boleh dipanggil anon, jadi ia harus berkuota sendiri —
  -- kalau tidak, ia justru menjadi cara termurah membanjiri abuse_events.
  if public.rate_limit_hit(p_ip_hash, 'auth_fail_record', 900) > 40 then
    return jsonb_build_object('dicatat', false);
  end if;

  insert into public.abuse_events (ip_hash, kind, action, path, severity)
  values (p_ip_hash, 'auth_fail', 'login', '/admin/login', 2);

  select count(*) into v_gagal from public.abuse_events
   where ip_hash = p_ip_hash and kind = 'auth_fail'
     and created_at > now() - interval '15 minutes';

  -- Sepuluh kegagalan dalam 15 menit bukan lagi orang yang lupa kata sandinya.
  -- Blokirnya satu jam, bukan permanen: petugas yang benar-benar terkunci
  -- harus bisa bekerja lagi tanpa menunggu administrator.
  if v_gagal >= 10 then
    insert into public.blocked_identities (ip_hash, reason, blocked_until, hits)
    values (p_ip_hash, 'Percobaan masuk gagal berulang kali', now() + interval '1 hour', 1)
    on conflict (ip_hash) do update
      set blocked_until = greatest(public.blocked_identities.blocked_until,
                                   now() + interval '1 hour'),
          hits   = public.blocked_identities.hits + 1,
          reason = excluded.reason;
    v_blokir := true;

    insert into public.admin_notifications (kind, title, body, href, severity)
    values ('keamanan', 'Percobaan masuk berulang diblokir',
            'Satu identitas gagal masuk ' || v_gagal ||
            ' kali dalam 15 menit dan diblokir selama 1 jam.',
            '/admin/keamanan', 2);
  end if;

  return jsonb_build_object('dicatat', true, 'gagal', v_gagal, 'diblokir', v_blokir);
end $$;

revoke all on function public.record_auth_fail(text) from public;
grant execute on function public.record_auth_fail(text) to anon, authenticated;

-- ============================================================
-- 4. GUARD_REQUEST — ALASAN PENOLAKAN YANG BISA DIBEDAKAN
--
--    Perubahan tunggal terhadap 0014 bagian 6: setiap penolakan kini membawa
--    'alasan' yang bisa dipetakan aplikasi ke kalimat yang berbeda.
--
--    "Mohon tunggu sebentar" dan "akses dibatasi sementara" menggambarkan dua
--    keadaan yang berbeda bagi pengunjung — yang pertama berarti coba lagi
--    sebentar lagi, yang kedua berarti jangan coba lagi sekarang. Menyamakan
--    keduanya membuat pengunjung sah yang kebetulan melewati kuota mengira
--    dirinya diblokir, lalu pergi.
--
--    Seluruh ambang, bobot, dan urutan lapisannya tidak berubah.
--
--    Rollback: definisi sebelumnya ada di 0014_abuse_protection.sql bagian 6.
-- ============================================================

create or replace function public.guard_request(
  p_ip_hash text,
  p_action  text,
  p_path    text default null,
  p_signals jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_conf     jsonb;
  v_batas    integer;
  v_jendela  integer;
  v_tantang  integer;
  v_pakai    numeric;
  v_skor     integer := 0;
  v_berat    integer;
  v_blok     public.blocked_identities%rowtype;
  v_putusan  text;
  v_alasan   text := null;
  v_sisa     integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then
    return jsonb_build_object('putusan', 'tolak', 'skor', 100,
                              'alasan', 'identitas_tidak_ada', 'coba_lagi_detik', 60);
  end if;

  -- ---- Lapis 1: blokir ----
  select * into v_blok from public.blocked_identities
   where ip_hash = p_ip_hash and blocked_until > now();
  if found then
    insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
    values (p_ip_hash, 'blocked', p_action, p_path, 3,
            jsonb_build_object('alasan', v_blok.reason));
    return jsonb_build_object(
      'putusan', 'tolak', 'skor', 100, 'alasan', 'diblokir',
      'coba_lagi_detik', greatest(1, extract(epoch from v_blok.blocked_until - now())::integer));
  end if;

  -- ---- Lapis 2: kuota ----
  select value into v_conf from public.app_settings where key = 'rate_limits';
  v_conf := coalesce(v_conf -> p_action, v_conf -> 'default',
                     jsonb_build_array(60, 3600, 30));
  v_batas   := (v_conf ->> 0)::integer;
  v_jendela := (v_conf ->> 1)::integer;
  v_tantang := (v_conf ->> 2)::integer;

  v_pakai := public.rate_limit_hit(p_ip_hash, p_action, v_jendela);
  v_sisa  := greatest(0, v_batas - ceil(v_pakai)::integer);

  -- ---- Lapis 3: skor perilaku ----
  if coalesce((p_signals ->> 'honeypot')::boolean, false) then
    v_skor := v_skor + 70;
  end if;
  if coalesce((p_signals ->> 'elapsed_ms')::integer, 999999) < 2500 then
    v_skor := v_skor + 35;
  end if;
  if coalesce((p_signals ->> 'elapsed_ms')::integer, 0) > 7200000 then
    v_skor := v_skor + 15;
  end if;
  if not coalesce((p_signals ->> 'interacted')::boolean, true) then
    v_skor := v_skor + 25;
  end if;
  if coalesce((p_signals ->> 'ua_kosong')::boolean, false) then
    v_skor := v_skor + 20;
  end if;

  select coalesce(sum(severity), 0) * 6 into v_berat
    from public.abuse_events
   where ip_hash = p_ip_hash
     and created_at > now() - interval '24 hours'
     and kind <> 'challenge_passed';
  v_skor := v_skor + least(coalesce(v_berat, 0), 40);

  if exists (select 1 from public.abuse_events
              where ip_hash = p_ip_hash and kind = 'challenge_passed'
                and created_at > now() - interval '30 minutes') then
    v_skor := v_skor - 40;
  end if;

  v_skor := greatest(0, least(100, v_skor));

  -- ---- Putusan ----
  if v_pakai > v_batas then
    v_putusan := 'tolak';
    v_alasan  := 'kuota';
    insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
    values (p_ip_hash, 'rate_limit', p_action, p_path, 2,
            jsonb_build_object('pakai', round(v_pakai, 1), 'batas', v_batas));

    if (select count(*) from public.abuse_events
         where ip_hash = p_ip_hash and kind = 'rate_limit'
           and created_at > now() - interval '1 hour') >= 5 then
      insert into public.blocked_identities (ip_hash, reason, blocked_until, hits)
      values (p_ip_hash, 'Melewati kuota berulang kali', now() + interval '6 hours', 1)
      on conflict (ip_hash) do update
        set blocked_until = greatest(public.blocked_identities.blocked_until,
                                     now() + interval '6 hours'),
            hits = public.blocked_identities.hits + 1,
            reason = excluded.reason;

      -- Sejak permintaan BERIKUTNYA identitas ini ditolak oleh lapis 1, jadi
      -- alasannya berubah menjadi blokir mulai sekarang.
      v_alasan := 'diblokir';

      insert into public.admin_notifications (kind, title, body, href, severity)
      values ('keamanan', 'Identitas diblokir otomatis',
              'Satu identitas melewati kuota ' || p_action || ' berulang kali dan diblokir 6 jam.',
              '/admin/keamanan', 2);
    end if;

  elsif v_skor >= 70 then
    v_putusan := 'tolak';
    v_alasan  := 'perilaku';
    insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
    values (p_ip_hash,
            (case when coalesce((p_signals ->> 'honeypot')::boolean, false)
                  then 'honeypot' else 'invalid_payload' end)::public.abuse_kind,
            p_action, p_path, 3, p_signals);

  elsif v_skor >= 30 or v_pakai > v_tantang then
    v_putusan := 'tantang';
    if coalesce((p_signals ->> 'elapsed_ms')::integer, 999999) < 2500 then
      insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
      values (p_ip_hash, 'too_fast', p_action, p_path, 1, p_signals);
    end if;

  else
    v_putusan := 'lolos';
  end if;

  return jsonb_build_object(
    'putusan', v_putusan,
    'skor', v_skor,
    'sisa', v_sisa,
    'alasan', v_alasan,
    'coba_lagi_detik', case when v_putusan = 'tolak' then v_jendela else 0 end);
end $$;

revoke all on function public.guard_request(text, text, text, jsonb) from public;
grant execute on function public.guard_request(text, text, text, jsonb) to anon, authenticated;

-- ============================================================
-- 5. PENYELESAIAN PERISTIWA
--
--    Tanpa ini halaman Keamanan hanyalah log yang bertambah panjang: admin
--    tidak punya cara menyatakan "yang ini sudah saya periksa". Setelah
--    beberapa ratus baris, daftar yang tidak bisa dituntaskan akan berhenti
--    dibaca — dan pengawasan yang tidak dibaca sama saja dengan tidak ada.
--
--    Rollback: alter table public.abuse_events drop column resolved_at, drop column resolved_by;
--              drop function public.resolve_abuse_event(bigint, boolean);
-- ============================================================

alter table public.abuse_events
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

create index if not exists abuse_events_open_idx
  on public.abuse_events (created_at desc) where resolved_at is null;

create policy abuse_events_update_admin on public.abuse_events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update on public.abuse_events to authenticated;

-- Fungsi, bukan UPDATE langsung dari aplikasi: resolved_by harus selalu
-- pemanggilnya sendiri. Bila aplikasi yang mengisinya, satu admin bisa
-- menandai temuan atas nama admin lain — jejak audit yang berbohong lebih
-- buruk daripada tidak ada jejak sama sekali.
create or replace function public.resolve_abuse_event(
  p_id      bigint,
  p_selesai boolean default true
)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.abuse_events
     set resolved_at = case when p_selesai then now() else null end,
         resolved_by = case when p_selesai then auth.uid() else null end
   where id = p_id;
end $$;

revoke all on function public.resolve_abuse_event(bigint, boolean) from public, anon;
grant execute on function public.resolve_abuse_event(bigint, boolean) to authenticated;

-- ============================================================
-- 6. DETEKSI LONJAKAN LALU LINTAS
--
--    Kelemahan nyata 0014: seluruh keputusannya per identitas. Seribu
--    identitas berbeda yang masing-masing mengirim empat prospek tidak pernah
--    melewati kuota mana pun, tidak pernah menghasilkan satu pun peristiwa,
--    dan tidak pernah memberi tahu siapa pun — padahal itulah bentuk
--    serangan yang paling merusak pipeline pemasaran.
--
--    Deteksi di sini membaca rate_limit_buckets, yang menghitung SELURUH
--    permintaan, bukan hanya yang sudah ditandai mencurigakan.
--
--    Rollback: select cron.unschedule('detect-spike');
--              drop function public.detect_traffic_spike();
--              drop table public.security_alerts;
--              delete from public.app_settings where key = 'spike_thresholds';
-- ============================================================

create table if not exists public.security_alerts (
  id          bigint generated always as identity primary key,
  action      text        not null,
  requests    integer     not null,
  identities  integer     not null,
  suspicious  integer     not null default 0,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);
create index if not exists security_alerts_time_idx on public.security_alerts (created_at desc);

alter table public.security_alerts enable row level security;

create policy security_alerts_read_admin on public.security_alerts
  for select to authenticated using (public.is_admin());
create policy security_alerts_update_admin on public.security_alerts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update on public.security_alerts to authenticated;

-- Ambang per aksi: [permintaan minimum, identitas berbeda minimum].
-- Syarat identitas berbeda memisahkan lonjakan tersebar — yang tidak bisa
-- ditangani lapisan per identitas — dari satu orang yang berulah, yang sudah
-- ditangani kuota. Tanpa syarat itu, setiap kali satu bot diblokir admin akan
-- menerima peringatan kedua tentang kejadian yang sama.
insert into public.app_settings (key, value, description) values (
  'spike_thresholds',
  jsonb_build_object(
    'lead_submit', jsonb_build_array(60,  6),
    'login',       jsonb_build_array(40,  4),
    'kontak',      jsonb_build_array(150, 8),
    'kalkulator',  jsonb_build_array(400, 10),
    'api_read',    jsonb_build_array(2000, 15),
    'default',     jsonb_build_array(500, 10)),
  'Ambang deteksi lonjakan per aksi: [permintaan/jam, identitas berbeda minimum].')
on conflict (key) do nothing;

create or replace function public.detect_traffic_spike()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_conf   jsonb;
  v_amb    jsonb;
  r        record;
  v_curiga integer;
  n        integer := 0;
begin
  select value into v_conf from public.app_settings where key = 'spike_thresholds';

  for r in
    select b.action,
           sum(b.hits)::integer            as requests,
           count(distinct b.bucket_key)::integer as identities
      from public.rate_limit_buckets b
     where b.window_start > now() - interval '1 hour'
       -- Kuota internal (challenge_record, auth_fail_record) bukan lalu lintas
       -- pengunjung; memasukkannya membuat angkanya berbohong.
       and b.action not in ('challenge_record', 'auth_fail_record')
     group by b.action
  loop
    v_amb := coalesce(v_conf -> r.action, v_conf -> 'default',
                      jsonb_build_array(500, 10));

    if r.requests >= (v_amb ->> 0)::integer
       and r.identities >= (v_amb ->> 1)::integer then

      -- Satu peringatan per aksi per jam. Peringatan yang berulang tiap lima
      -- menit selama serangan berlangsung akan mengubur peringatan lain.
      if not exists (
        select 1 from public.security_alerts a
         where a.action = r.action and a.created_at > now() - interval '1 hour')
      then
        select count(*) into v_curiga from public.abuse_events e
         where e.action = r.action
           and e.created_at > now() - interval '1 hour'
           and e.kind <> 'challenge_passed';

        insert into public.security_alerts (action, requests, identities, suspicious)
        values (r.action, r.requests, r.identities, coalesce(v_curiga, 0));

        insert into public.admin_notifications (kind, title, body, href, severity)
        values ('keamanan', 'Lonjakan lalu lintas terdeteksi',
                r.requests || ' permintaan ' || r.action || ' dari ' || r.identities ||
                ' identitas berbeda dalam satu jam terakhir. Kuota per identitas tetap berlaku.',
                '/admin/keamanan', 2);

        n := n + 1;
      end if;
    end if;
  end loop;

  return n;
end $$;

revoke execute on function public.detect_traffic_spike() from public, anon, authenticated;
grant execute on function public.detect_traffic_spike() to service_role;

-- ============================================================
-- 7. METRIK KEAMANAN — TAMBAHAN
--
--    Menambah dua angka yang dibutuhkan halaman Keamanan setelah bagian 5
--    dan 6: berapa temuan yang masih terbuka, dan berapa peringatan lonjakan
--    yang belum ditangani.
--
--    Rollback: definisi sebelumnya ada di 0014_abuse_protection.sql bagian 8.
-- ============================================================

drop function if exists public.security_metrics();

create or replace function public.security_metrics()
returns table (
  peristiwa_24j    bigint,
  diblokir_aktif   bigint,
  kuota_terlampaui bigint,
  bot_tertahan     bigint,
  identitas_unik   bigint,
  belum_selesai    bigint,
  lonjakan_terbuka bigint
)
language sql stable security invoker set search_path = public as $$
  select
    (select count(*) from public.abuse_events
      where created_at > now() - interval '24 hours' and kind <> 'challenge_passed'),
    (select count(*) from public.blocked_identities where blocked_until > now()),
    (select count(*) from public.abuse_events
      where kind = 'rate_limit' and created_at > now() - interval '24 hours'),
    (select count(*) from public.abuse_events
      where kind in ('honeypot', 'too_fast', 'challenge_failed', 'invalid_payload')
        and created_at > now() - interval '24 hours'),
    (select count(distinct ip_hash) from public.abuse_events
      where created_at > now() - interval '24 hours'),
    -- Hanya yang berbobot: penggabungan duplikat dan verifikasi yang lolos
    -- bukan pekerjaan yang menunggu siapa pun.
    (select count(*) from public.abuse_events
      where resolved_at is null and severity > 0
        and kind not in ('challenge_passed', 'duplicate_lead')
        and created_at > now() - interval '7 days'),
    (select count(*) from public.security_alerts where resolved_at is null);
$$;
grant execute on function public.security_metrics() to authenticated;

-- ============================================================
-- 8. RETENSI
--
--    security_alerts ikut dibersihkan. Tanpa ini ia adalah satu-satunya tabel
--    keamanan yang tumbuh selamanya.
--
--    Rollback: definisi sebelumnya ada di 0014_abuse_protection.sql bagian 9.
-- ============================================================

create or replace function public.purge_security_data()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; k integer;
begin
  delete from public.rate_limit_buckets where window_start < now() - interval '1 day';
  get diagnostics k = row_count; n := n + k;

  delete from public.abuse_events where created_at < now() - interval '30 days';
  get diagnostics k = row_count; n := n + k;

  delete from public.security_alerts where created_at < now() - interval '90 days';
  get diagnostics k = row_count; n := n + k;

  delete from public.blocked_identities
   where blocked_until < now() - interval '7 days' and not is_manual;
  get diagnostics k = row_count; n := n + k;

  delete from public.admin_notifications
   where read_at is not null and read_at < now() - interval '30 days';
  get diagnostics k = row_count; n := n + k;

  return n;
end $$;
revoke execute on function public.purge_security_data() from public, anon, authenticated;
grant execute on function public.purge_security_data() to service_role;

-- ============================================================
-- 9. JADWAL pg_cron
--
--    Lima menit adalah kompromi: cukup sering agar serangan tidak berjalan
--    setengah jam tanpa diketahui, cukup jarang agar pemindaian agregat tidak
--    menjadi beban tetap. Deteksinya sendiri membaca jendela satu jam, jadi
--    memperpendek selang tidak membuatnya lebih peka — hanya lebih boros.
--
--    Rollback: select cron.unschedule('detect-spike');
-- ============================================================

do $$
begin
  perform cron.unschedule('detect-spike');
exception when others then null;
end $$;

select cron.schedule('detect-spike', '*/5 * * * *',
                     $$select public.detect_traffic_spike()$$);

-- ============================================================
-- CATATAN: temuan advisor yang SENGAJA DIBIARKAN
--
--   * record_auth_fail dapat dieksekusi anon sebagai SECURITY DEFINER
--     (WARN 0028). Alasannya sama persis dengan guard_request di 0015: ia
--     HARUS bisa dipanggil sebelum pengunjung punya sesi — justru kegagalan
--     masuklah yang berarti belum ada sesi. Fungsinya tidak menerima apa pun
--     selain hash identitas, tidak mengembalikan data milik siapa pun, dan
--     berkuota sendiri (40 per 15 menit) supaya tidak bisa dipakai
--     membanjiri abuse_events dari luar.
--
--   * submit_lead tetap muncul di daftar yang sama setelah tanda tangannya
--     berubah. Pertimbangannya tidak berubah; lihat 0015.
--
--   * detect_traffic_spike dan purge_security_data TIDAK muncul: keduanya
--     hanya diberikan ke service_role dan dipanggil pg_cron.
-- ============================================================
