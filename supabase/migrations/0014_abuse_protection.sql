-- ============================================================
-- KPR BRI — Migrasi 0014_abuse_protection
--
-- Fase kritis (3/3): perlindungan anti-bot dan penyalahgunaan.
--
-- Prinsip yang dipegang: pengguna normal tidak boleh merasakan apa pun.
-- Verifikasi tambahan hanya muncul ketika ada alasan konkret, dan alasannya
-- tercatat — bukan tebakan yang hilang begitu permintaannya selesai.
--
-- Satu batasan lingkungan menentukan bentuk rancangan ini: proyek belum
-- memegang SUPABASE_SERVICE_ROLE_KEY, jadi Server Action berbicara ke basis
-- data sebagai `anon`. Karena itu penjaganya berupa fungsi SECURITY DEFINER
-- yang boleh dipanggil anon — persis pola submit_lead — dengan seluruh
-- keputusan dan seluruh batas ada DI DALAM fungsi, bukan di pemanggilnya.
-- Pemanggil yang tidak jujur tetap tidak bisa menaikkan jatahnya sendiri.
--
-- Tiga lapis, dari murah ke mahal:
--   1. Blokir  — identitas yang sudah terbukti menyalahgunakan, ditolak awal.
--   2. Kuota   — jendela geser per identitas per aksi.
--   3. Skor    — sinyal perilaku menentukan lolos, ditantang, atau ditolak.
--
-- Rollback: catatan per bagian.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. KUOTA PERMINTAAN
--
--    Jendela geser hampiran: hitungan jendela berjalan ditambah sisa bobot
--    jendela sebelumnya. Jendela tetap (fixed window) polos memberi celah
--    ganda tepat di pergantian detik — 5 permintaan di detik terakhir jendela
--    A dan 5 lagi di detik pertama jendela B lolos sebagai "5 per jendela".
--    Hampiran ini menutup celah itu tanpa menyimpan satu baris per permintaan.
--
--    Rollback: drop table public.rate_limit_buckets cascade;
-- ============================================================

create table if not exists public.rate_limit_buckets (
  bucket_key   text        not null,   -- sha256(ip + garam), bukan IP mentah
  action       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket_key, action, window_start)
);
create index if not exists rate_limit_sweep_idx on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;
-- Tanpa policy: tertutup total lewat PostgREST. Satu-satunya jalan masuk
-- adalah fungsi SECURITY DEFINER di bawah.

-- ============================================================
-- 2. CATATAN PENYALAHGUNAAN
--    Rollback: drop table public.abuse_events cascade; drop type public.abuse_kind;
-- ============================================================

create type public.abuse_kind as enum (
  'rate_limit',        -- melewati kuota
  'honeypot',          -- mengisi kolom jebakan yang tak terlihat manusia
  'too_fast',          -- formulir dikirim lebih cepat daripada bisa dibaca
  'stale_form',        -- formulir dikirim jauh setelah dimuat (halaman disimpan bot)
  'challenge_failed',  -- gagal verifikasi tambahan
  'challenge_passed',  -- lolos verifikasi tambahan (dicatat untuk menurunkan skor)
  'blocked',           -- permintaan dari identitas yang sedang diblokir
  'invalid_payload',   -- bentuk kiriman tidak masuk akal
  'auth_fail',         -- gagal masuk berulang
  'scrape_suspect'     -- pola penelusuran massal
);

create table if not exists public.abuse_events (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  kind       public.abuse_kind not null,
  action     text,
  path       text,
  severity   smallint not null default 1,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint abuse_severity_ck check (severity between 0 and 5)
);
create index if not exists abuse_events_ip_idx   on public.abuse_events (ip_hash, created_at desc);
create index if not exists abuse_events_time_idx on public.abuse_events (created_at desc);
create index if not exists abuse_events_kind_idx on public.abuse_events (kind, created_at desc);

alter table public.abuse_events enable row level security;

create policy abuse_events_read_admin on public.abuse_events
  for select to authenticated using (public.is_admin());
grant select on public.abuse_events to authenticated;

-- ============================================================
-- 3. IDENTITAS TERBLOKIR
--
--    Blokir selalu punya masa berlaku. Blokir permanen atas hash IP adalah
--    cara pasti menghukum orang yang salah: alamat IP berpindah tangan, dan
--    satu NAT operator seluler bisa mewakili ribuan calon pembeli sah.
--    Blokir manual oleh admin boleh lebih lama, tetapi tetap bertanggal.
--
--    Rollback: drop table public.blocked_identities;
-- ============================================================

create table if not exists public.blocked_identities (
  ip_hash     text primary key,
  reason      text not null,
  blocked_at  timestamptz not null default now(),
  blocked_until timestamptz not null,
  hits        integer not null default 1,
  created_by  uuid references public.profiles(id) on delete set null,
  is_manual   boolean not null default false
);
create index if not exists blocked_until_idx on public.blocked_identities (blocked_until);

alter table public.blocked_identities enable row level security;

create policy blocked_read_admin on public.blocked_identities
  for select to authenticated using (public.is_admin());
create policy blocked_write_admin on public.blocked_identities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.blocked_identities to authenticated;

-- ============================================================
-- 4. AMBANG BATAS PER AKSI
--
--    Angka-angka ini adalah keputusan produk dan akan disetel ulang setelah
--    melihat lalu lintas nyata, jadi ia hidup di data, bukan di kode.
--
--    Rollback: delete from public.app_settings where key = 'rate_limits';
-- ============================================================

insert into public.app_settings (key, value, description) values (
  'rate_limits',
  jsonb_build_object(
    -- aksi           => [batas, jendela_detik, batas_tantangan]
    -- batas_tantangan: di atas ini masih dilayani, tapi wajib verifikasi.
    'lead_submit',   jsonb_build_array(5,  3600, 2),
    'kalkulator',    jsonb_build_array(40, 3600, 20),
    'kontak',        jsonb_build_array(20, 3600, 10),
    'login',         jsonb_build_array(8,  900,  3),
    'api_read',      jsonb_build_array(240, 300, 200),
    'default',       jsonb_build_array(60, 3600, 30)),
  'Batas laju per identitas per aksi: [batas, jendela detik, ambang tantangan].')
on conflict (key) do nothing;

-- ============================================================
-- 5. PEMERIKSAAN KUOTA
--
--    Mengembalikan pemakaian efektif TANPA menaikkan hitungan, dan varian
--    yang menaikkannya. Dipisah karena beberapa pemanggil hanya ingin tahu
--    (menampilkan sisa jatah) tanpa ikut memakannya.
--
--    Rollback: drop function public.rate_limit_hit(text, text, integer);
-- ============================================================

create or replace function public.rate_limit_hit(
  p_key    text,
  p_action text,
  p_window integer
)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_start   timestamptz;
  v_prev    timestamptz;
  v_hits    integer;
  v_prevhit integer;
  v_lewat   numeric;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window) * p_window);
  v_prev  := v_start - make_interval(secs => p_window);

  insert into public.rate_limit_buckets (bucket_key, action, window_start, hits)
  values (p_key, p_action, v_start, 1)
  on conflict (bucket_key, action, window_start)
    do update set hits = public.rate_limit_buckets.hits + 1
  returning hits into v_hits;

  select coalesce(hits, 0) into v_prevhit
    from public.rate_limit_buckets
   where bucket_key = p_key and action = p_action and window_start = v_prev;

  -- Bagian jendela berjalan yang sudah terlewat: 0.0 di awal, 1.0 di ujung.
  v_lewat := extract(epoch from now() - v_start) / p_window;
  return v_hits + coalesce(v_prevhit, 0) * (1 - v_lewat);
end $$;
revoke execute on function public.rate_limit_hit(text, text, integer) from public, anon, authenticated;

-- ============================================================
-- 6. PENJAGA PERMINTAAN — satu panggilan, satu keputusan
--
--    Inilah satu-satunya pintu yang dipanggil Server Action sebelum bekerja.
--    Ia menggabungkan blokir, kuota, dan skor perilaku menjadi satu jawaban:
--    'lolos' | 'tantang' | 'tolak'.
--
--    Sinyal perilaku (p_signals) datang dari klien dan KARENA ITU tidak
--    pernah dipercaya untuk menurunkan skor — hanya untuk menaikkannya.
--    Bot yang berbohong dengan mengaku "honeypot kosong, pengisian 30 detik"
--    hanya mendapat perlakuan sama seperti pengguna normal, lalu tetap
--    tertahan oleh kuota dan riwayatnya. Sebaliknya sinyal yang memberatkan
--    tidak bisa dipalsukan untuk menguntungkan pengirimnya.
--
--    Rollback: drop function public.guard_request(text, text, text, jsonb);
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
  v_sisa     integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then
    -- Tanpa identitas tidak ada kuota yang bisa ditegakkan. Menolak lebih
    -- aman daripada melayani permintaan yang tak terhitung.
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
    v_skor := v_skor + 70;   -- manusia tidak pernah mengisi kolom tak terlihat
  end if;
  if coalesce((p_signals ->> 'elapsed_ms')::integer, 999999) < 2500 then
    v_skor := v_skor + 35;   -- lebih cepat daripada membaca formulirnya
  end if;
  if coalesce((p_signals ->> 'elapsed_ms')::integer, 0) > 7200000 then
    v_skor := v_skor + 15;   -- halaman disimpan lalu dikirim ulang berjam-jam kemudian
  end if;
  if not coalesce((p_signals ->> 'interacted')::boolean, true) then
    v_skor := v_skor + 25;   -- tidak ada satu pun ketikan atau klik
  end if;
  if coalesce((p_signals ->> 'ua_kosong')::boolean, false) then
    v_skor := v_skor + 20;
  end if;

  -- Riwayat: pelanggaran terbaru memberati permintaan berikutnya.
  select coalesce(sum(severity), 0) * 6 into v_berat
    from public.abuse_events
   where ip_hash = p_ip_hash
     and created_at > now() - interval '24 hours'
     and kind <> 'challenge_passed';
  v_skor := v_skor + least(coalesce(v_berat, 0), 40);

  -- Lolos tantangan dalam 30 menit terakhir adalah bukti nyata seorang manusia.
  if exists (select 1 from public.abuse_events
              where ip_hash = p_ip_hash and kind = 'challenge_passed'
                and created_at > now() - interval '30 minutes') then
    v_skor := v_skor - 40;
  end if;

  v_skor := greatest(0, least(100, v_skor));

  -- ---- Putusan ----
  if v_pakai > v_batas then
    v_putusan := 'tolak';
    insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
    values (p_ip_hash, 'rate_limit', p_action, p_path, 2,
            jsonb_build_object('pakai', round(v_pakai, 1), 'batas', v_batas));

    -- Pelanggaran kuota yang berulang naik menjadi blokir sementara.
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

      insert into public.admin_notifications (kind, title, body, href, severity)
      values ('keamanan', 'Identitas diblokir otomatis',
              'Satu identitas melewati kuota ' || p_action || ' berulang kali dan diblokir 6 jam.',
              '/admin/keamanan', 2);
    end if;

  elsif v_skor >= 70 then
    v_putusan := 'tolak';
    insert into public.abuse_events (ip_hash, kind, action, path, severity, detail)
    values (p_ip_hash,
            -- Cast eksplisit: hasil CASE bertipe text, dan kolomnya enum.
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
    'coba_lagi_detik', case when v_putusan = 'tolak' then v_jendela else 0 end);
end $$;

revoke all on function public.guard_request(text, text, text, jsonb) from public;
grant execute on function public.guard_request(text, text, text, jsonb) to anon, authenticated;

-- ============================================================
-- 7. HASIL TANTANGAN
--
--    Dipanggil setelah Turnstile diverifikasi di server. Lolos menurunkan
--    skor identitas selama 30 menit; gagal memberatkannya.
--
--    Rollback: drop function public.record_challenge(text, boolean, text);
-- ============================================================

create or replace function public.record_challenge(
  p_ip_hash text,
  p_lolos   boolean,
  p_action  text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then return; end if;

  -- Fungsi ini sendiri harus berkuota: tanpa itu ia menjadi cara murah
  -- membanjiri abuse_events dari luar.
  if public.rate_limit_hit(p_ip_hash, 'challenge_record', 3600) > 30 then
    return;
  end if;

  insert into public.abuse_events (ip_hash, kind, action, severity)
  values (p_ip_hash,
          (case when p_lolos then 'challenge_passed' else 'challenge_failed' end)::public.abuse_kind,
          p_action,
          case when p_lolos then 0 else 2 end);
end $$;

revoke all on function public.record_challenge(text, boolean, text) from public;
grant execute on function public.record_challenge(text, boolean, text) to anon, authenticated;

-- ============================================================
-- 8. RINGKASAN KEAMANAN UNTUK DASHBOARD
--    Pertanyaan ketiga dashboard: "apakah ada yang mencurigakan?"
-- ============================================================

create or replace function public.security_metrics()
returns table (
  peristiwa_24j    bigint,
  diblokir_aktif   bigint,
  kuota_terlampaui bigint,
  bot_tertahan     bigint,
  identitas_unik   bigint
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
      where created_at > now() - interval '24 hours');
$$;
grant execute on function public.security_metrics() to authenticated;

-- ============================================================
-- 9. RETENSI
--
--    Hash IP tetap data perilaku. Menyimpannya tanpa batas tidak ada
--    gunanya untuk keamanan dan hanya menambah beban kepatuhan (UU PDP).
--    Kuota: 1 hari. Peristiwa: 30 hari. Blokir kedaluwarsa: 7 hari.
-- ============================================================

create or replace function public.purge_security_data()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; k integer;
begin
  delete from public.rate_limit_buckets where window_start < now() - interval '1 day';
  get diagnostics k = row_count; n := n + k;

  delete from public.abuse_events where created_at < now() - interval '30 days';
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
-- 10. JADWAL pg_cron
--
--    PENTING: cron dievaluasi dalam UTC; operasional WIB = UTC+7.
--      02:30 WIB = '30 19 * * *'
--      06:00 WIB = '0 23 * * *'
--    Salah di sini berarti pemeliharaan berjalan di tengah jam kerja.
--
--    Rollback: select cron.unschedule('<nama>');
-- ============================================================

do $$
begin
  perform cron.unschedule('expire-verifications');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('purge-security');
exception when others then null;
end $$;

select cron.schedule('expire-verifications', '0 23 * * *',
                     $$select public.expire_verifications()$$);
select cron.schedule('purge-security', '30 19 * * *',
                     $$select public.purge_security_data()$$);
