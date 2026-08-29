-- ============================================================
-- KPR BRI — Skema Database (Supabase / PostgreSQL 17 + PostGIS)
-- Migrasi 0001_init
-- Terapkan dengan: supabase db push  (atau apply_migration)
-- ============================================================

create extension if not exists postgis  with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext   with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Tipe (citext, geography) dan operator class (gin_trgm_ops) di bawah ini
-- diselesaikan saat DDL dijalankan, jadi `extensions` harus ada di search_path.
set search_path = public, extensions;

-- ==================== ENUM ====================
create type user_role      as enum ('admin', 'pengembang', 'viewer');
create type housing_status as enum ('draft', 'published', 'archived');
create type lead_status    as enum ('baru', 'dihubungi', 'diproses', 'selesai', 'batal');
create type audit_action   as enum ('INSERT', 'UPDATE', 'DELETE');
create type notif_channel  as enum ('email', 'whatsapp');
create type notif_status   as enum ('pending', 'sent', 'failed', 'dead');
create type event_type     as enum ('view_detail', 'click_kontak', 'click_peta', 'submit_lead');

-- ==================== HELPER: updated_at ====================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ==================== profiles ====================
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  phone          text,
  role           user_role not null default 'viewer',
  developer_id   uuid,                       -- FK ditambahkan setelah developers dibuat
  is_active      boolean not null default true,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where is_active;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ==================== developers (pengembang) ====================
create table public.developers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           citext not null unique,
  contact_person text,
  phone          text,
  email          citext,
  address        text,
  logo_path      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint developers_name_not_blank check (length(btrim(name)) > 0)
);
create trigger developers_set_updated_at before update on public.developers
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_developer_fk
  foreign key (developer_id) references public.developers(id) on delete set null;

-- Seorang 'pengembang' wajib terikat ke satu developer; 'admin' tidak boleh.
alter table public.profiles add constraint profiles_role_developer_ck check (
  (role = 'pengembang' and developer_id is not null) or
  (role <> 'pengembang' and developer_id is null)
);

-- ==================== regions (wilayah) ====================
create table public.regions (
  id         uuid primary key default gen_random_uuid(),
  province   text not null default 'Sumatera Utara',
  city       text not null default 'Kota Pematangsiantar',
  district   text not null,                  -- kecamatan, cth. 'Siantar Sitalasari'
  village    text,                           -- kelurahan, cth. 'Bah Kapul'
  created_at timestamptz not null default now(),
  unique (province, city, district, village)
);
create index regions_district_idx on public.regions (district);

-- ==================== housings (perumahan) ====================
create table public.housings (
  id                    uuid primary key default gen_random_uuid(),
  legacy_id             integer unique,       -- id 1..16 dari housing-storage.ts
  slug                  citext not null unique,
  name                  text not null,
  developer_id          uuid references public.developers(id) on delete restrict,
  region_id             uuid references public.regions(id)    on delete set null,

  address               text not null default '',
  lat                   double precision not null,
  lng                   double precision not null,
  geom                  geography(Point, 4326)
                          generated always as
                          (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,

  price_min             numeric(14,2),
  price_max             numeric(14,2),

  building_area         numeric(7,2),         -- m2
  land_area             numeric(7,2),         -- m2
  bedrooms              smallint,
  bathrooms             smallint,
  roof_type             text,
  wall_type             text,
  foundation_type       text,

  subsidi_units         integer not null default 0,
  sold_subsidi_units    integer not null default 0,
  commercial_units      integer not null default 0,
  sold_commercial_units integer not null default 0,
  total_units           integer generated always as
                          (subsidi_units + commercial_units) stored,
  available_units       integer generated always as
                          ((subsidi_units + commercial_units)
                           - (sold_subsidi_units + sold_commercial_units)) stored,

  status                housing_status not null default 'draft',
  published_at          timestamptz,

  search_tsv            tsvector generated always as (
                          to_tsvector('simple',
                            coalesce(name, '') || ' ' || coalesce(address, ''))
                        ) stored,

  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint housings_lat_ck    check (lat  between -11 and 6),
  constraint housings_lng_ck    check (lng  between 95 and 141),
  constraint housings_units_ck  check (
    subsidi_units >= 0 and commercial_units >= 0 and
    sold_subsidi_units between 0 and subsidi_units and
    sold_commercial_units between 0 and commercial_units
  ),
  constraint housings_price_ck  check (
    price_min is null or price_max is null or price_max >= price_min
  ),
  constraint housings_published_ck check (
    status <> 'published' or (published_at is not null and price_min is not null)
  )
);

create index housings_geom_gix     on public.housings using gist (geom);
create index housings_search_gix   on public.housings using gin  (search_tsv);
create index housings_name_trgm    on public.housings using gin  (name gin_trgm_ops);
create index housings_status_idx   on public.housings (status, published_at desc)
  where deleted_at is null;
create index housings_developer_idx on public.housings (developer_id)
  where deleted_at is null;

create trigger housings_set_updated_at before update on public.housings
  for each row execute function public.set_updated_at();

-- ==================== housing_images ====================
create table public.housing_images (
  id           uuid primary key default gen_random_uuid(),
  housing_id   uuid not null references public.housings(id) on delete cascade,
  storage_path text not null,               -- path di bucket 'perumahan'
  alt          text not null default '',
  width        integer,
  height       integer,
  bytes        integer,
  sort_order   smallint not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (housing_id, storage_path)
);
create index housing_images_housing_idx on public.housing_images (housing_id, sort_order);
-- Maksimal satu cover per perumahan
create unique index housing_images_one_cover_uq
  on public.housing_images (housing_id) where is_cover;

-- ==================== housing_contacts ====================
create table public.housing_contacts (
  id          uuid primary key default gen_random_uuid(),
  housing_id  uuid not null references public.housings(id) on delete cascade,
  name        text not null,
  phone       text,
  email       citext,
  role_label  text default 'Marketing',
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index housing_contacts_one_primary_uq
  on public.housing_contacts (housing_id) where is_primary;

-- ==================== leads (pengajuan minat) ====================
create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  housing_id           uuid references public.housings(id) on delete set null,
  name                 text not null,
  phone                text not null,
  email                citext,
  message              text,
  source               text not null default 'web',
  status               lead_status not null default 'baru',
  assigned_to          uuid references public.profiles(id) on delete set null,

  -- Jejak persetujuan (UU PDP No. 27/2022)
  consent_at           timestamptz not null,
  consent_version      text not null,
  ip_hash              text,                -- SHA-256 + salt, bukan IP mentah
  user_agent           text,

  contacted_at         timestamptz,
  closed_at            timestamptz,
  purge_after          date not null default (current_date + interval '365 days'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint leads_name_ck  check (length(btrim(name)) between 2 and 120),
  constraint leads_phone_ck check (phone ~ '^[0-9+][0-9 ()+-]{7,19}$')
);
create index leads_status_idx  on public.leads (status, created_at desc);
create index leads_housing_idx on public.leads (housing_id, created_at desc);
create index leads_purge_idx   on public.leads (purge_after);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ==================== lead_notes ====================
create table public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ==================== audit_logs ====================
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  table_name  text not null,
  record_id   text not null,
  action      audit_action not null,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id, created_at desc);
create index audit_logs_actor_idx  on public.audit_logs (actor_id, created_at desc);

-- ==================== housing_events (analitik) ====================
create table public.housing_events (
  id           bigint generated always as identity primary key,
  housing_id   uuid references public.housings(id) on delete cascade,
  kind         event_type not null,
  session_hash text,                        -- hash harian, tanpa PII
  referrer     text,
  created_at   timestamptz not null default now()
);
create index housing_events_housing_idx on public.housing_events (housing_id, created_at desc);
create index housing_events_kind_idx    on public.housing_events (kind, created_at desc);

-- ==================== app_settings ====================
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ==================== notification_outbox ====================
create table public.notification_outbox (
  id          uuid primary key default gen_random_uuid(),
  channel     notif_channel not null,
  recipient   text not null,
  template    text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      notif_status not null default 'pending',
  attempts    smallint not null default 0,
  last_error  text,
  next_try_at timestamptz not null default now(),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notif_outbox_pending_idx on public.notification_outbox (next_try_at)
  where status = 'pending';

-- ============================================================
-- FUNGSI PEMBANTU OTORISASI
-- ============================================================
create or replace function public.jwt_role()
returns user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid() and is_active), 'viewer'::user_role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.jwt_role() = 'admin'
$$;

create or replace function public.my_developer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select developer_id from public.profiles where id = auth.uid() and is_active
$$;

-- ============================================================
-- RPC: perumahan terdekat (menggantikan Haversine di klien)
-- ============================================================
create or replace function public.nearest_housings(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 5,
  p_max_km double precision default 50
)
returns table (
  id uuid, slug citext, name text, address text,
  lat double precision, lng double precision,
  price_min numeric, available_units integer,
  distance_m double precision
)
language sql stable security invoker set search_path = public, extensions as $$
  select h.id, h.slug, h.name, h.address, h.lat, h.lng,
         h.price_min, h.available_units,
         st_distance(h.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.housings h
  where h.status = 'published'
    and h.deleted_at is null
    and st_dwithin(h.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_max_km * 1000)
  order by h.geom <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit greatest(1, least(p_limit, 50));
$$;

-- ============================================================
-- RPC: pencarian perumahan
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
    and (p_min_price is null or h.price_min >= p_min_price)
    and (p_max_price is null or h.price_min <= p_max_price)
  order by rank desc, h.name asc
  limit least(p_limit, 100) offset greatest(p_offset, 0);
$$;

-- ============================================================
-- TRIGGER AUDIT
-- ============================================================
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_diff jsonb; v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := old.id::text;  v_diff := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_id := new.id::text;  v_diff := to_jsonb(new);
  else
    v_id := new.id::text;
    select jsonb_object_agg(key, jsonb_build_object('dari', to_jsonb(old)->key, 'jadi', value))
      into v_diff
    from jsonb_each(to_jsonb(new))
    where to_jsonb(old)->key is distinct from value;
  end if;

  if v_diff is not null and v_diff <> '{}'::jsonb then
    insert into public.audit_logs (actor_id, table_name, record_id, action, diff)
    values (auth.uid(), tg_table_name, v_id, tg_op::audit_action, v_diff);
  end if;
  return coalesce(new, old);
end $$;

create trigger housings_audit   after insert or update or delete on public.housings
  for each row execute function public.audit_trigger();
create trigger developers_audit after insert or update or delete on public.developers
  for each row execute function public.audit_trigger();
create trigger leads_audit      after update or delete on public.leads
  for each row execute function public.audit_trigger();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.developers          enable row level security;
alter table public.regions             enable row level security;
alter table public.housings            enable row level security;
alter table public.housing_images      enable row level security;
alter table public.housing_contacts    enable row level security;
alter table public.leads               enable row level security;
alter table public.lead_notes          enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.housing_events      enable row level security;
alter table public.app_settings        enable row level security;
alter table public.notification_outbox enable row level security;

-- ---- profiles ----
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- regions / developers : publik boleh baca ----
create policy regions_read_public on public.regions
  for select to anon, authenticated using (true);
create policy regions_write_admin on public.regions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy developers_read_public on public.developers
  for select to anon, authenticated using (is_active);
create policy developers_write_admin on public.developers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- housings ----
create policy housings_read_public on public.housings
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

create policy housings_read_staff on public.housings
  for select to authenticated
  using (public.is_admin() or developer_id = public.my_developer_id());

create policy housings_insert_staff on public.housings
  for insert to authenticated
  with check (public.is_admin() or developer_id = public.my_developer_id());

create policy housings_update_staff on public.housings
  for update to authenticated
  using  (public.is_admin() or developer_id = public.my_developer_id())
  with check (public.is_admin() or developer_id = public.my_developer_id());

create policy housings_delete_admin on public.housings
  for delete to authenticated using (public.is_admin());

-- ---- housing_images / housing_contacts : ikut induknya ----
create policy housing_images_read_public on public.housing_images
  for select to anon, authenticated
  using (exists (select 1 from public.housings h
                 where h.id = housing_id and h.status = 'published' and h.deleted_at is null));
create policy housing_images_write_staff on public.housing_images
  for all to authenticated
  using  (exists (select 1 from public.housings h where h.id = housing_id
                  and (public.is_admin() or h.developer_id = public.my_developer_id())))
  with check (exists (select 1 from public.housings h where h.id = housing_id
                  and (public.is_admin() or h.developer_id = public.my_developer_id())));

create policy housing_contacts_read_public on public.housing_contacts
  for select to anon, authenticated
  using (exists (select 1 from public.housings h
                 where h.id = housing_id and h.status = 'published' and h.deleted_at is null));
create policy housing_contacts_write_staff on public.housing_contacts
  for all to authenticated
  using  (exists (select 1 from public.housings h where h.id = housing_id
                  and (public.is_admin() or h.developer_id = public.my_developer_id())))
  with check (exists (select 1 from public.housings h where h.id = housing_id
                  and (public.is_admin() or h.developer_id = public.my_developer_id())));

-- ---- leads : PUBLIK TIDAK BOLEH MEMBACA. Insert lewat RPC/Server Action saja ----
create policy leads_read_staff on public.leads
  for select to authenticated
  using (public.is_admin()
         or exists (select 1 from public.housings h
                    where h.id = housing_id and h.developer_id = public.my_developer_id()));
create policy leads_update_staff on public.leads
  for update to authenticated
  using (public.is_admin()
         or exists (select 1 from public.housings h
                    where h.id = housing_id and h.developer_id = public.my_developer_id()))
  with check (true);
create policy leads_delete_admin on public.leads
  for delete to authenticated using (public.is_admin());
-- Tidak ada policy INSERT untuk anon: penulisan hanya lewat SECURITY DEFINER RPC.

create policy lead_notes_staff on public.lead_notes
  for all to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id
                 and (public.is_admin() or exists (select 1 from public.housings h
                      where h.id = l.housing_id and h.developer_id = public.my_developer_id()))))
  with check (author_id = auth.uid());

-- ---- audit_logs : admin baca saja, tidak ada yang boleh menulis via API ----
create policy audit_read_admin on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ---- housing_events : anon boleh insert (analitik), staf boleh baca ----
create policy events_insert_public on public.housing_events
  for insert to anon, authenticated with check (true);
create policy events_read_staff on public.housing_events
  for select to authenticated using (public.is_admin());

-- ---- app_settings ----
create policy settings_read_public on public.app_settings
  for select to anon, authenticated using (key like 'public.%');
create policy settings_admin_all on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- notification_outbox : service_role saja (tanpa policy = tertutup) ----

-- ============================================================
-- RPC: submit lead (SECURITY DEFINER — satu-satunya jalan masuk)
-- ============================================================
create or replace function public.submit_lead(
  p_housing_id uuid,
  p_name text,
  p_phone text,
  p_email text default null,
  p_message text default null,
  p_consent_version text default 'v1',
  p_ip_hash text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_recent integer;
begin
  if p_housing_id is not null and not exists (
      select 1 from public.housings h
      where h.id = p_housing_id and h.status = 'published' and h.deleted_at is null) then
    raise exception 'Perumahan tidak ditemukan atau belum dipublikasikan'
      using errcode = 'P0002';
  end if;

  -- rate limit sederhana: maks 3 lead / IP-hash / jam
  if p_ip_hash is not null then
    select count(*) into v_recent from public.leads
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_recent >= 3 then
      raise exception 'Terlalu banyak pengajuan. Coba lagi nanti.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.leads (housing_id, name, phone, email, message,
                            consent_at, consent_version, ip_hash, user_agent)
  values (p_housing_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''),
          nullif(btrim(p_message), ''), now(), p_consent_version, p_ip_hash, p_user_agent)
  returning id into v_id;

  insert into public.notification_outbox (channel, recipient, template, payload)
  values ('email', 'admin', 'lead_baru', jsonb_build_object('lead_id', v_id));

  return v_id;
end $$;

revoke all on function public.submit_lead(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_lead(uuid, text, text, text, text, text, text, text) to anon, authenticated;

-- ============================================================
-- RETENSI DATA (UU PDP) — dijadwalkan dengan pg_cron
-- ============================================================
create or replace function public.purge_expired_leads()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with d as (
    delete from public.leads
    where purge_after < current_date and status in ('selesai', 'batal')
    returning 1)
  select count(*) into n from d;
  return n;
end $$;

-- Di Supabase:
--   select cron.schedule('purge-leads', '0 2 * * *', $$select public.purge_expired_leads()$$);

-- ============================================================
-- VIEW ringkas untuk halaman publik
-- ============================================================
create or replace view public.v_housing_public
with (security_invoker = true) as
select h.id, h.slug, h.name, h.address, h.lat, h.lng,
       h.price_min, h.price_max,
       h.subsidi_units, h.commercial_units,
       h.total_units, h.available_units,
       case when h.total_units > 0
            then round(h.available_units::numeric * 100 / h.total_units)
            else null end as availability_percent,
       h.roof_type, h.wall_type, h.foundation_type,
       h.building_area, h.land_area, h.bedrooms, h.bathrooms,
       d.name as developer_name,
       r.district, r.village,
       (select storage_path from public.housing_images i
         where i.housing_id = h.id and i.is_cover limit 1) as cover_path,
       h.published_at
from public.housings h
left join public.developers d on d.id = h.developer_id
left join public.regions    r on r.id = h.region_id
where h.status = 'published' and h.deleted_at is null;
