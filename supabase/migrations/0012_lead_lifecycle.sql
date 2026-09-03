-- ============================================================
-- KPR BRI — Migrasi 0012_lead_lifecycle
--
-- Fase kritis (1/3): manajemen prospek.
--
-- Yang berubah:
--   1. Siklus hidup prospek diperluas dari 5 menjadi 8 tahap, mengikuti
--      alur operasional nyata: baru -> dihubungi -> terkualifikasi ->
--      tindak_lanjut -> pengajuan -> disetujui/ditolak/ditutup.
--   2. Prospek menyimpan konteks yang dipakai petugas saat menelepon:
--      harga properti saat itu, estimasi angsuran, tenor, uang muka.
--      Harga perumahan bisa berubah besok; yang relevan adalah angka yang
--      DILIHAT calon pembeli ketika ia menyatakan minat.
--   3. Riwayat status (lead_status_history) — siapa memindahkan ke tahap
--      mana dan kapan. Tanpa ini "8 prospek perlu tindak lanjut" hanyalah
--      angka tanpa pertanggungjawaban.
--   4. Antrean notifikasi admin (admin_notifications) untuk lonceng di
--      dashboard, terpisah dari notification_outbox yang mengurus email.
--   5. SLA kontak pertama (first_contact_due_at) — dasar penanda visual
--      "belum dihubungi" yang diminta di fase kritis.
--
-- Rollback: catatan per bagian di bawah.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. SIKLUS HIDUP PROSPEK
--
--    ALTER TYPE ... ADD VALUE tidak bisa dipakai di sini: nilainya harus
--    dipakai pada transaksi terpisah dari deklarasinya, sedangkan migrasi ini
--    berjalan dalam satu transaksi. Karena itu tipenya ditukar, bukan
--    ditambahi. Indeks pada kolom status dibangun ulang otomatis oleh
--    ALTER COLUMN ... TYPE.
--
--    Pemetaan nilai lama:
--      diproses -> tindak_lanjut   (sedang ditangani, belum ada keputusan)
--      selesai  -> ditutup         (berakhir tanpa penilaian menang/kalah)
--      batal    -> ditolak         (berakhir negatif)
--
--    Rollback: tukar balik dengan pemetaan kebalikannya. Nilai baru
--    (terkualifikasi, pengajuan, disetujui) tidak punya padanan lama —
--    petakan ke 'diproses'.
-- ============================================================

alter type public.lead_status rename to lead_status_lama;

create type public.lead_status as enum (
  'baru',            -- New
  'dihubungi',       -- Contacted
  'terkualifikasi',  -- Qualified
  'tindak_lanjut',   -- Follow-up
  'pengajuan',       -- Application
  'disetujui',       -- Approved
  'ditolak',         -- Rejected
  'ditutup'          -- Closed
);

-- purge_expired_leads() menyebut nilai enum lama secara literal; ia harus
-- dilepas sebelum tipenya hilang, lalu dibuat ulang di bagian 6.
drop function if exists public.purge_expired_leads();

alter table public.leads alter column status drop default;
alter table public.leads
  alter column status type public.lead_status
  using (case status::text
           when 'baru'      then 'baru'
           when 'dihubungi' then 'dihubungi'
           when 'diproses'  then 'tindak_lanjut'
           when 'selesai'   then 'ditutup'
           when 'batal'     then 'ditolak'
           else 'baru'
         end)::public.lead_status;
alter table public.leads alter column status set default 'baru';

drop type public.lead_status_lama;

-- Tahap akhir dikelompokkan sekali di sini supaya definisi "prospek selesai"
-- tidak tersebar di belasan query yang bisa saling menyimpang.
create or replace function public.lead_status_final(s public.lead_status)
returns boolean language sql immutable set search_path = '' as $$
  select s in ('disetujui', 'ditolak', 'ditutup')
$$;

-- ============================================================
-- 2. ASAL PROSPEK
--
--    `source` yang lama bertipe text bebas dan selalu berisi 'web'. Kolom
--    baru memisahkan dua pertanyaan berbeda: AKSI apa yang dilakukan
--    (lead_kind) dan DARI HALAMAN mana (source_page).
--
--    Rollback: alter table public.leads drop column lead_kind, drop column source_page;
-- ============================================================

create type public.lead_kind as enum (
  'form_minat',   -- formulir minat di halaman detail
  'kalkulator',   -- simulasi KPR lalu minta dihubungi
  'ajukan_kpr',   -- tombol "Ajukan KPR"
  'minta_info',   -- permintaan informasi tambahan
  'whatsapp'      -- menekan tombol WhatsApp
);

alter table public.leads
  add column if not exists lead_kind   public.lead_kind not null default 'form_minat',
  add column if not exists source_page text;

-- ============================================================
-- 3. KONTEKS KPR YANG DILIHAT CALON PEMBELI
--
--    Semuanya snapshot, bukan turunan. price_snapshot sengaja tidak dibaca
--    ulang dari housings saat petugas membuka prospek: yang perlu diketahui
--    petugas adalah angka yang membuat orang ini tertarik, bukan angka hari ini.
--
--    Rollback: alter table public.leads drop column price_snapshot, ... ;
-- ============================================================

alter table public.leads
  add column if not exists price_snapshot      numeric(14,2),
  add column if not exists est_monthly_payment numeric(14,2),
  add column if not exists down_payment        numeric(14,2),
  add column if not exists tenor_years         smallint,
  add column if not exists interest_rate       numeric(5,2),
  add column if not exists first_contact_due_at timestamptz,
  add column if not exists last_activity_at     timestamptz not null default now(),
  add column if not exists risk_score           smallint not null default 0,
  add column if not exists is_flagged           boolean  not null default false,
  add constraint leads_tenor_ck check (tenor_years is null or tenor_years between 1 and 30),
  add constraint leads_risk_ck  check (risk_score between 0 and 100);

comment on column public.leads.price_snapshot is
  'Harga perumahan pada detik prospek dikirim. Sengaja tidak mengikuti '
  'perubahan harga berikutnya — petugas perlu tahu angka yang dilihat calon pembeli.';
comment on column public.leads.first_contact_due_at is
  'Batas waktu kontak pertama. Lewat batas ini prospek tampil sebagai terlambat '
  'di dashboard. Diisi otomatis oleh trigger leads_set_sla.';

-- SLA kontak pertama. Nilainya dapat diatur lewat app_settings; 4 jam kerja
-- adalah bawaan yang bisa dipenuhi tim kecil tanpa piket malam.
create or replace function public.lead_sla_hours()
returns integer language sql stable set search_path = public as $$
  select coalesce(
    (select nullif(value #>> '{}', '')::integer from public.app_settings
      where key = 'public.lead_sla_hours'),
    4)
$$;

create or replace function public.leads_set_sla()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.first_contact_due_at is null then
    new.first_contact_due_at := new.created_at + make_interval(hours => public.lead_sla_hours());
  end if;
  return new;
end $$;
revoke execute on function public.leads_set_sla() from public, anon, authenticated;

drop trigger if exists leads_set_sla on public.leads;
create trigger leads_set_sla before insert on public.leads
  for each row execute function public.leads_set_sla();

update public.leads
   set first_contact_due_at = created_at + make_interval(hours => 4)
 where first_contact_due_at is null;

-- Prospek yang belum dihubungi dan sudah lewat SLA — pertanyaan pertama
-- dashboard ("siapa yang harus dihubungi?") dijawab dari indeks ini.
create index if not exists leads_overdue_idx
  on public.leads (first_contact_due_at)
  where status = 'baru';
-- Penugasan sudah punya indeks dari 0010 (leads_assigned_idx, parsial pada
-- assigned_to is not null). Nama itu SUDAH DIPAKAI, jadi `create index if not
-- exists` dengan nama yang sama di sini tidak akan membuat apa pun — ia hanya
-- akan terlihat seolah membuat. Indeksnya sengaja tidak diduplikasi.

-- ============================================================
-- 4. RIWAYAT STATUS
--    Rollback: drop table public.lead_status_history;
-- ============================================================

create table if not exists public.lead_status_history (
  id         bigint generated always as identity primary key,
  lead_id    uuid not null references public.leads(id) on delete cascade,
  dari       public.lead_status,
  ke         public.lead_status not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists lead_status_history_lead_idx
  on public.lead_status_history (lead_id, created_at desc);

create or replace function public.leads_log_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_status_history (lead_id, dari, ke, actor_id)
    values (new.id, null, new.status, null);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.lead_status_history (lead_id, dari, ke, actor_id)
    values (new.id, old.status, new.status, auth.uid());

    -- Stempel waktu turunan diisi di sini, bukan di lapisan aplikasi, supaya
    -- perubahan status lewat SQL mentah pun tetap konsisten.
    if new.status <> 'baru' and new.contacted_at is null then
      new.contacted_at := now();
    end if;
    if public.lead_status_final(new.status) and new.closed_at is null then
      new.closed_at := now();
    elsif not public.lead_status_final(new.status) then
      new.closed_at := null;
    end if;
  end if;

  new.last_activity_at := now();
  return new;
end $$;
revoke execute on function public.leads_log_status() from public, anon, authenticated;

-- BEFORE UPDATE supaya perubahan pada contacted_at/closed_at ikut tersimpan
-- dalam baris yang sama; AFTER INSERT karena baris harus ada dulu untuk FK.
drop trigger if exists leads_log_status_upd on public.leads;
create trigger leads_log_status_upd before update on public.leads
  for each row execute function public.leads_log_status();

drop trigger if exists leads_log_status_ins on public.leads;
create trigger leads_log_status_ins after insert on public.leads
  for each row execute function public.leads_log_status();

-- ============================================================
-- 5. NOTIFIKASI ADMIN (lonceng dashboard)
--
--    Terpisah dari notification_outbox: outbox mengurus PENGIRIMAN keluar
--    (email, WhatsApp) dengan percobaan ulang; tabel ini murni tampilan
--    di dalam aplikasi dan tidak pernah gagal-kirim.
--
--    Status "sudah dibaca" bersifat bersama, bukan per pengguna. Untuk tim
--    beranggota beberapa orang yang menangani satu kotak masuk yang sama,
--    itu justru perilaku yang benar: satu orang menandai, semua ikut bersih.
--
--    Rollback: drop table public.admin_notifications;
-- ============================================================

create type public.notif_kind as enum ('prospek_baru', 'verifikasi', 'keamanan', 'sistem');

create table if not exists public.admin_notifications (
  id         uuid primary key default gen_random_uuid(),
  kind       public.notif_kind not null,
  title      text not null,
  body       text,
  lead_id    uuid references public.leads(id)    on delete cascade,
  housing_id uuid references public.housings(id) on delete cascade,
  href       text,
  severity   smallint not null default 0,   -- 0 info, 1 perhatian, 2 mendesak
  read_at    timestamptz,
  read_by    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_notif_severity_ck check (severity between 0 and 2)
);
create index if not exists admin_notif_unread_idx
  on public.admin_notifications (created_at desc) where read_at is null;
create index if not exists admin_notif_kind_idx
  on public.admin_notifications (kind, created_at desc);

alter table public.admin_notifications  enable row level security;
alter table public.lead_status_history  enable row level security;

-- Staf membaca; penulisan hanya lewat SECURITY DEFINER (submit_lead dkk).
create policy admin_notif_read_staff on public.admin_notifications
  for select to authenticated
  using (public.is_admin() or public.jwt_role() = 'pengembang');
create policy admin_notif_update_staff on public.admin_notifications
  for update to authenticated
  using (public.is_admin() or public.jwt_role() = 'pengembang')
  with check (true);

create policy lead_status_history_read_staff on public.lead_status_history
  for select to authenticated
  using (exists (select 1 from public.leads l
                 where l.id = lead_id
                   and (public.is_admin()
                        or exists (select 1 from public.housings h
                                   where h.id = l.housing_id
                                     and h.developer_id = public.my_developer_id()))));

grant select, update on public.admin_notifications to authenticated;
grant select on public.lead_status_history to authenticated;

-- ============================================================
-- 6. RETENSI (dibuat ulang dengan nilai enum baru)
--    Rollback: definisi lama ada di 0001_init.sql.
-- ============================================================

create or replace function public.purge_expired_leads()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with d as (
    delete from public.leads
    where purge_after < current_date
      and public.lead_status_final(status)
    returning 1)
  select count(*) into n from d;
  return n;
end $$;
revoke execute on function public.purge_expired_leads() from public, anon, authenticated;
grant execute on function public.purge_expired_leads() to service_role;

-- ============================================================
-- 6b. PEMFORMATAN RUPIAH UNTUK TEKS YANG DIBUAT BASIS DATA
--
--     Pemisah ribuan Indonesia adalah TITIK. Penanda G pada to_char mengikuti
--     lc_numeric server — pada Supabase itu 'C', yang memberi koma — sehingga
--     "Rp 1,181,446" muncul di notifikasi sementara seluruh UI menulis
--     "Rp 1.181.446". Hasilnya dinormalkan di sini alih-alih bergantung pada
--     setelan server yang tidak kita kendalikan.
--
--     Ini pasangan basis data dari formatIDR() di src/lib/format.ts.
--     Rollback: drop function public.format_rupiah(numeric);
-- ============================================================

create or replace function public.format_rupiah(n numeric)
returns text language sql immutable set search_path = '' as $$
  select case when n is null then null
              else 'Rp ' || replace(to_char(round(n), 'FM999G999G999G999'), ',', '.') end
$$;
revoke execute on function public.format_rupiah(numeric) from public, anon;
grant execute on function public.format_rupiah(numeric) to authenticated, service_role;

-- ============================================================
-- 7. submit_lead v2
--
--    Menggantikan versi 8-parameter dari 0001. Tanda tangan lama dilepas
--    supaya PostgREST tidak menyisakan dua kandidat yang ambigu.
--
--    Yang bertambah:
--      * lead_kind + source_page      — asal prospek
--      * snapshot harga & angsuran    — konteks percakapan pertama
--      * risk_score dari lapisan anti-bot (0012 menyimpannya; 0014 mengisinya)
--      * notifikasi in-app, bukan hanya email
--
--    Rate limit tetap ada di dalam fungsi sebagai jaring terakhir. Lapisan
--    yang sebenarnya menahan penyalahgunaan ada di 0014.
--
--    Rollback: definisi lama ada di 0001_init.sql.
-- ============================================================

drop function if exists public.submit_lead(uuid, text, text, text, text, text, text, text);

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
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_recent  integer;
  v_nama    text;
  v_kind    public.lead_kind;
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

  -- Jaring terakhir: maks 5 prospek / IP-hash / jam. Batas ini lebih longgar
  -- daripada di 0001 (3) karena kini ada beberapa jenis aksi yang sah dari
  -- satu orang — simulasi kalkulator lalu formulir minat, misalnya —
  -- sedangkan penyaringan sebenarnya sudah dilakukan lebih awal di 0014.
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

  return v_id;
end $$;

revoke all on function public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer) from public;
grant execute on function public.submit_lead(
  uuid, text, text, text, text, text, text, text,
  text, text, numeric, numeric, numeric, integer, numeric, integer) to anon, authenticated;

-- ============================================================
-- 8. METRIK OPERASIONAL
--
--    Satu panggilan mengembalikan seluruh angka kepala dashboard. Alternatifnya
--    enam count(*) terpisah dari lapisan aplikasi, yang berarti enam
--    perjalanan bolak-balik untuk satu layar.
--
--    security invoker: RLS tetap berlaku, jadi pengembang hanya menghitung
--    prospek perumahannya sendiri tanpa penyaringan tambahan di aplikasi.
--
--    Rollback: drop function public.lead_metrics();
-- ============================================================

create or replace function public.lead_metrics()
returns table (
  baru            bigint,
  perlu_tindak    bigint,
  terkualifikasi  bigint,
  pengajuan       bigint,
  terlambat       bigint,
  belum_ditugaskan bigint,
  total           bigint,
  minggu_ini      bigint
)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where status = 'baru'),
    count(*) filter (where status in ('dihubungi', 'tindak_lanjut')),
    count(*) filter (where status = 'terkualifikasi'),
    count(*) filter (where status = 'pengajuan'),
    count(*) filter (where status = 'baru' and first_contact_due_at < now()),
    count(*) filter (where assigned_to is null and not public.lead_status_final(status)),
    count(*),
    count(*) filter (where created_at > now() - interval '7 days')
  from public.leads;
$$;
grant execute on function public.lead_metrics() to authenticated;

-- ============================================================
-- 9. app_settings bawaan
-- ============================================================

insert into public.app_settings (key, value, description) values
  ('public.lead_sla_hours', '4'::jsonb,
   'Batas jam kontak pertama sebelum prospek ditandai terlambat.')
on conflict (key) do nothing;
