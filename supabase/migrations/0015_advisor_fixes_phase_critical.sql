-- ============================================================
-- KPR BRI — Migrasi 0015_advisor_fixes_phase_critical
--
-- Temuan advisor atas tabel yang dibuat 0012–0014, plus satu pembersihan
-- kebijakan. Mengikuti keputusan yang sudah dibuat di 0010: indeks hanya
-- dibuat untuk kunci asing yang benar-benar ditelusuri, bukan untuk memenuhi
-- daftar periksa.
--
-- Rollback: catatan per bagian.
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. INDEKS PADA KUNCI ASING BER-CASCADE
--
--    admin_notifications.lead_id dan .housing_id memakai ON DELETE CASCADE.
--    Setiap DELETE pada leads atau housings memaksa Postgres mencari baris
--    anaknya; tanpa indeks itu berarti sequential scan penuh atas
--    admin_notifications untuk SETIAP baris induk yang dihapus.
--
--    Ini bukan soal teoretis: purge_expired_leads() berjalan tiap malam lewat
--    pg_cron dan dapat menghapus banyak prospek sekaligus. Biaya n×m-nya
--    muncul persis pada pekerjaan yang tidak ada yang mengawasi.
--
--    read_by dan created_by SENGAJA dibiarkan tanpa indeks — keduanya
--    ON DELETE SET NULL ke profiles, tabel yang praktis tidak pernah dihapus.
--    Ini konsisten dengan sikap 0010 terhadap app_settings.updated_by.
--
--    Rollback: drop index public.admin_notif_lead_idx, public.admin_notif_housing_idx;
-- ============================================================

create index if not exists admin_notif_lead_idx
  on public.admin_notifications (lead_id) where lead_id is not null;
create index if not exists admin_notif_housing_idx
  on public.admin_notifications (housing_id) where housing_id is not null;

-- ============================================================
-- 2. KEBIJAKAN GANDA PADA blocked_identities
--
--    blocked_write_admin memakai FOR ALL, yang sudah mencakup SELECT, dengan
--    ekspresi yang SAMA PERSIS dengan blocked_read_admin: public.is_admin().
--    Jadi setiap pembacaan mengevaluasi is_admin() dua kali untuk hasil yang
--    tidak mungkin berbeda.
--
--    Ini berbeda dari kebijakan ganda yang sengaja dipertahankan di 0010.
--    Di sana keduanya mengungkapkan aturan yang BERLAINAN ("publik melihat
--    yang terbit" vs "staf melihat miliknya"), dan memisahkannya membuat
--    otorisasinya bisa dibaca. Di sini keduanya mengungkapkan aturan yang
--    sama, sehingga yang satu murni pengulangan.
--
--    Rollback:
--      create policy blocked_read_admin on public.blocked_identities
--        for select to authenticated using (public.is_admin());
-- ============================================================

drop policy if exists blocked_read_admin on public.blocked_identities;

-- ============================================================
-- CATATAN: temuan advisor yang SENGAJA DIBIARKAN
--
--   * guard_request, record_challenge, submit_lead dapat dieksekusi anon
--     sebagai SECURITY DEFINER (WARN 0028). Itu memang rancangannya, dan
--     mengikuti pola submit_lead yang sudah disepakati di 0007: ketiganya
--     adalah satu-satunya jalur tulis publik, seluruh validasi dan seluruh
--     batasnya ada DI DALAM fungsi, dan tidak satu pun mengembalikan data
--     milik orang lain. guard_request justru HARUS bisa dipanggil anon —
--     ia adalah penjaga yang berdiri sebelum pengunjung punya sesi.
--
--   * rate_limit_buckets: RLS aktif tanpa satu pun kebijakan (INFO 0008).
--     Disengaja, sama seperti notification_outbox — RLS aktif tanpa policy
--     berarti tertutup total lewat PostgREST. Satu-satunya jalan masuk adalah
--     rate_limit_hit(), yang SECURITY DEFINER dan tidak diberikan ke anon.
--
--   * "unused_index" atas indeks yang baru dibuat: basis datanya baru
--     menerima lalu lintas uji. Indeks seperti leads_overdue_idx dan
--     admin_notif_unread_idx melayani kueri yang memang ada di dashboard;
--     statistik pemakaiannya akan terisi setelah dipakai sungguhan.
-- ============================================================
