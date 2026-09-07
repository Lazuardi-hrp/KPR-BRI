-- ============================================================
-- KPR BRI — Migrasi 0011_profiles_recursion
--
-- profiles_update_self menyematkan subquery ke public.profiles DI DALAM
-- WITH CHECK-nya sendiri. Karena profiles memiliki RLS, subquery itu
-- mengevaluasi ulang kebijakan yang sama dan Postgres menggagalkannya dengan
-- "infinite recursion detected in policy for relation profiles".
--
-- Akibatnya kebijakan ini SELALU gagal: pengguna tidak bisa memperbarui nama
-- atau nomor teleponnya sendiri. Cacat ini lolos dari uji keamanan karena ia
-- gagal TERTUTUP — percobaan eskalasi memang ditolak, hanya saja ditolak oleh
-- galat rekursi, bukan oleh aturannya.
--
-- jwt_role() dan my_developer_id() adalah SECURITY DEFINER, jadi keduanya
-- membaca profiles tanpa memicu RLS lagi — persis untuk keperluan seperti ini.
-- Penguncian yang dimaksud tetap berlaku: peran dan developer_id harus sama
-- dengan nilai sekarang, sehingga eskalasi tetap mustahil.
--
-- Terverifikasi: pembaruan nama sendiri berhasil (row_count=1); mengubah
-- developer_id maupun role ditolak dengan "new row violates row-level security
-- policy", bukan galat rekursi.
--
-- Rollback: definisi sebelumnya ada di 0010_perf_fixes.sql.
-- ============================================================

set search_path = public, extensions;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = public.jwt_role()
    and developer_id is not distinct from public.my_developer_id()
  );
