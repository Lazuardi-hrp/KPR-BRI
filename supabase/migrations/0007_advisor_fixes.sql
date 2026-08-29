-- ============================================================
-- KPR BRI — Migrasi 0007_advisor_fixes
-- Menutup temuan Supabase Security Advisor tingkat WARN.
--
-- A-1 adalah pelajaran penting: `revoke ... from anon` di 0003 TIDAK BEREFEK.
-- ACL fungsi masih berbunyi '=X/postgres | postgres=X | authenticated=X ...',
-- dan entri '=X' terdepan adalah hibah ke PUBLIC — anon mewarisi EXECUTE
-- lewat PUBLIC, bukan lewat hibah langsung. Harus dicabut dari PUBLIC.
-- (purge_expired_leads di 0003 memang sudah benar karena dicabut `from public`.)
--
-- Rollback: grant execute on function <nama> to public;
-- ============================================================

set search_path = public, extensions;

-- ---- A-1: cabut dari PUBLIC, beri ulang secara eksplisit ----------------
revoke execute on function public.is_admin()        from public;
revoke execute on function public.jwt_role()        from public;
revoke execute on function public.my_developer_id() from public;

-- authenticated WAJIB tetap punya EXECUTE: ekspresi kebijakan RLS dievaluasi
-- sebagai peran pemanggil, jadi tanpa ini seluruh kebijakan admin/pengembang mati.
grant execute on function public.is_admin()        to authenticated, service_role;
grant execute on function public.jwt_role()        to authenticated, service_role;
grant execute on function public.my_developer_id() to authenticated, service_role;

-- ---- A-2: fungsi trigger tidak perlu dijangkau lewat API ----------------
-- Hak EXECUTE pada fungsi trigger diperiksa saat CREATE TRIGGER, bukan saat
-- trigger menyala. Diverifikasi empiris: insert ke auth.users tetap membuat
-- baris profiles dengan role 'viewer' setelah pencabutan ini.
revoke execute on function public.audit_trigger()           from public, anon, authenticated;
revoke execute on function public.handle_new_user()         from public, anon, authenticated;
grant  execute on function public.handle_new_user()         to supabase_auth_admin, service_role;

-- ---- A-3: function_search_path_mutable ---------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin return p::uuid; exception when others then return null; end $$;

create or replace function public.protect_lead_immutables()
returns trigger language plpgsql set search_path = public as $$
begin
  new.consent_at      := old.consent_at;
  new.consent_version := old.consent_version;
  new.ip_hash         := old.ip_hash;
  new.created_at      := old.created_at;

  if not public.is_admin() then
    new.purge_after := old.purge_after;
    new.housing_id  := old.housing_id;
  end if;

  return new;
end $$;

revoke execute on function public.try_uuid(text)            from public, anon, authenticated;
revoke execute on function public.set_updated_at()          from public, anon, authenticated;
revoke execute on function public.protect_lead_immutables() from public, anon, authenticated;

-- ============================================================
-- Dua temuan advisor yang SENGAJA dibiarkan:
--
--   * submit_lead dapat dieksekusi anon (WARN 0028). Itu memang rancangannya —
--     PRD A-8: satu-satunya jalur tulis publik, SECURITY DEFINER, dengan
--     validasi dan rate limit di dalam fungsi.
--
--   * notification_outbox: RLS aktif tanpa satu pun kebijakan (INFO 0008).
--     Juga disengaja — PRD §9.2: "RLS aktif tanpa policy berarti tertutup
--     total kecuali bagi service_role".
-- ============================================================
