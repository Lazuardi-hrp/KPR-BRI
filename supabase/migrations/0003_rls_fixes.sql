-- ============================================================
-- KPR BRI — Migrasi 0003_rls_fixes
--
-- Empat lubang otorisasi pada 0001 yang ditemukan saat review keamanan.
-- Ketiganya nyata dan terverifikasi pada basis data yang sudah berjalan.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- L-1 (KRITIS) — purge_expired_leads() dapat dipanggil siapa saja
--
-- Fungsi baru memberi EXECUTE ke PUBLIC secara bawaan, dan PostgREST
-- mengekspos setiap fungsi di schema `public` sebagai POST /rest/v1/rpc/<nama>.
-- purge_expired_leads() adalah SECURITY DEFINER dan MENGHAPUS baris `leads`.
-- Artinya siapa pun yang memegang kunci anon (yang memang publik) dapat
-- menghapus prospek berstatus selesai/batal yang sudah lewat masa retensi.
-- `submit_lead` sudah dicabut haknya di 0001; fungsi ini terlewat.
--
-- Verifikasi sebelum perbaikan:
--   proname=purge_expired_leads, prosecdef=true, proacl berisi 'anon=X/postgres'
--
-- Rollback: grant execute on function public.purge_expired_leads() to public;
-- ============================================================

revoke execute on function public.purge_expired_leads() from public, anon, authenticated;

-- Fungsi pembantu otorisasi tidak perlu dijangkau publik. `authenticated`
-- WAJIB tetap punya EXECUTE: ekspresi kebijakan RLS dievaluasi sebagai peran
-- pemanggil, jadi mencabutnya dari `authenticated` akan mematikan seluruh
-- kebijakan admin/pengembang.
revoke execute on function public.is_admin()        from anon;
revoke execute on function public.jwt_role()        from anon;
revoke execute on function public.my_developer_id() from anon;

-- set_updated_at(), audit_trigger(), handle_new_user() mengembalikan `trigger`.
-- PostgREST menolak mengekspos fungsi bertipe trigger, dan jalur trigger
-- membutuhkan EXECUTE, jadi hak aksesnya sengaja tidak disentuh.

-- ============================================================
-- L-2 — profiles_update_self membiarkan `developer_id` diubah sendiri
--
-- Kebijakan lama mengunci `role` tetapi tidak `developer_id`. Seorang
-- 'pengembang' bisa menjalankan
--     update profiles set developer_id = '<uuid pengembang lain>' where id = auth.uid()
-- dan seketika mewarisi hak baca/tulis perumahan serta prospek milik
-- pengembang itu lewat housings_*_staff dan leads_read_staff.
--
-- Rollback: definisi lama ada di 0001_init.sql.
-- ============================================================

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and developer_id is not distinct from
        (select p.developer_id from public.profiles p where p.id = auth.uid())
  );

-- ============================================================
-- L-3 — leads_update_staff memakai `with check (true)`
--
-- Klausa USING membatasi baris mana yang boleh disentuh, tetapi WITH CHECK
-- (true) membiarkan hasil akhirnya berupa apa saja. Seorang pengembang dapat
-- memindahkan prospek ke perumahan milik orang lain, atau menulis ulang jejak
-- persetujuan UU PDP.
-- ============================================================

drop policy if exists leads_update_staff on public.leads;
create policy leads_update_staff on public.leads
  for update to authenticated
  using (public.is_admin()
         or exists (select 1 from public.housings h
                    where h.id = housing_id and h.developer_id = public.my_developer_id()))
  with check (public.is_admin()
         or exists (select 1 from public.housings h
                    where h.id = housing_id and h.developer_id = public.my_developer_id()));

-- Jejak persetujuan tidak boleh berubah setelah tercatat — oleh siapa pun,
-- admin sekalipun (UU PDP §13.1 "Akuntabilitas"). Hak subjek data untuk
-- dihapus dijalankan lewat DELETE, bukan dengan menulis ulang consent.
create or replace function public.protect_lead_immutables()
returns trigger
language plpgsql
as $$
begin
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.ip_hash         := old.ip_hash;
  new.created_at      := old.created_at;

  -- Retensi dan kepemilikan hanya boleh digeser admin.
  if not public.is_admin() then
    new.purge_after := old.purge_after;
    new.housing_id  := old.housing_id;
  end if;

  return new;
end $$;

drop trigger if exists leads_protect_immutables on public.leads;
create trigger leads_protect_immutables
  before update on public.leads
  for each row execute function public.protect_lead_immutables();

-- ============================================================
-- L-4 — audit_logs.actor_email selalu NULL
--
-- Kolomnya ada dan dijanjikan §9, tetapi audit_trigger() tidak pernah
-- mengisinya. Jejak audit tanpa identitas pelaku yang terbaca manusia jauh
-- berkurang gunanya saat investigasi.
-- ============================================================

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_diff jsonb; v_id text; v_email text;
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
    select u.email into v_email from auth.users u where u.id = auth.uid();
    insert into public.audit_logs (actor_id, actor_email, table_name, record_id, action, diff)
    values (auth.uid(), v_email, tg_table_name, v_id, tg_op::audit_action, v_diff);
  end if;
  return coalesce(new, old);
end $$;

-- ============================================================
-- L-5 — search_housings menolak p_limit negatif
--   `limit least(p_limit, 100)` dengan p_limit = -1 memicu
--   "LIMIT must not be negative". nearest_housings sudah benar
--   (greatest(1, least(...))); ini menyamakannya.
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
    and (p_min_price is null or coalesce(h.price_max, h.price_min) >= p_min_price)
    and (p_max_price is null or h.price_min <= p_max_price)
  order by rank desc, h.name asc
  limit greatest(1, least(p_limit, 100)) offset greatest(p_offset, 0);
$$;

-- Indeks untuk daftar "perlu diverifikasi" di dashboard admin.
create index if not exists housings_needs_review_idx
  on public.housings (needs_review) where needs_review and deleted_at is null;
