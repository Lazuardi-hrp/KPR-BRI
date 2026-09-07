-- ============================================================
-- KPR BRI — Migrasi 0009_storage_paths
--
-- JANGAN JALANKAN sebelum scripts/upload-housing-images.mjs selesai dan
-- terverifikasi. Migrasi ini hanya jaring pengaman: skrip unggah sudah
-- memperbarui storage_path per baris setelah tiap unggahan berhasil, jadi
-- normalnya berkas ini tidak menyisakan pekerjaan apa pun.
--
-- Ia ada untuk kasus baris yang path-nya tertinggal karena skrip terhenti
-- di tengah jalan DAN berkasnya ternyata sudah ada di bucket.
--
-- Verifikasi lebih dulu:
--   select count(*) from public.housing_images where storage_path like '/kpr-assets/%';
--
-- Rollback: kembalikan ke '/kpr-assets/<nama>.jpg' (berkasnya masih ada di repo).
-- ============================================================

update public.housing_images
   set storage_path = housing_id::text || '/' ||
       regexp_replace(split_part(storage_path, '/', 3), '\.jpe?g$', '.webp')
 where storage_path like '/kpr-assets/%';
