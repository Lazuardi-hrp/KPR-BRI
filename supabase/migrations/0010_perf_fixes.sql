-- ============================================================
-- KPR BRI — Migrasi 0010_perf_fixes
-- Temuan Supabase Performance Advisor tingkat WARN.
--
-- auth_rls_initplan: auth.uid() di dalam ekspresi kebijakan dievaluasi ulang
-- untuk SETIAP baris. Membungkusnya dengan (select ...) membuat perencana
-- memperlakukannya sebagai InitPlan — dihitung sekali per query. Perilaku
-- kebijakannya sama persis; hanya rencana eksekusinya yang berubah.
--
-- Rollback: definisi kebijakan sebelumnya ada di 0003_rls_fixes.sql.
-- ============================================================

set search_path = public, extensions;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    and developer_id is not distinct from
        (select p.developer_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists lead_notes_staff on public.lead_notes;
create policy lead_notes_staff on public.lead_notes
  for all to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id
                 and (public.is_admin() or exists (select 1 from public.housings h
                      where h.id = l.housing_id and h.developer_id = public.my_developer_id()))))
  with check (author_id = (select auth.uid()));

-- unindexed_foreign_keys: region_id ikut di-join v_housing_public pada setiap
-- pembacaan halaman publik, jadi indeksnya benar-benar terpakai.
create index if not exists housings_region_idx on public.housings (region_id)
  where deleted_at is null;
create index if not exists leads_assigned_idx  on public.leads (assigned_to)
  where assigned_to is not null;
create index if not exists lead_notes_author_idx on public.lead_notes (author_id);
create index if not exists profiles_developer_idx on public.profiles (developer_id)
  where developer_id is not null;

-- SENGAJA TIDAK diubah — multiple_permissive_policies (WARN):
--   housings, housing_images, housing_contacts, developers, regions,
--   app_settings, dan profiles masing-masing punya dua kebijakan SELECT untuk
--   `authenticated` (satu jalur publik, satu jalur staf). Menggabungkannya jadi
--   satu ekspresi OR memang menghemat sedikit, tetapi membuat aturan "publik
--   melihat yang terbit" dan "staf melihat miliknya" saling terjalin dalam satu
--   predikat yang jauh lebih sulit diaudit. Pada 16 baris, keterbacaan aturan
--   otorisasi lebih berharga daripada penghematan itu.
