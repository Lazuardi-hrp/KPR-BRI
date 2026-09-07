-- ============================================================
-- KPR BRI — Migrasi 0021_analytics_enums
--
-- Migrasi ini HANYA menambah nilai enum, dan itu disengaja — persis dengan
-- alasan yang sama seperti 0017.
--
-- PostgreSQL melarang sebuah nilai enum baru dipakai di dalam transaksi yang
-- sama dengan yang menambahkannya. Karena Supabase membungkus setiap migrasi
-- dalam satu transaksi, menaruh `alter type ... add value` bersama fungsi yang
-- memakainya membuat migrasi gagal dengan pesan yang menyesatkan
-- ("unsafe use of new value of enum type"). 0022 memakai kedua nilai di bawah
-- pada record_event() dan seluruh RPC metrik, jadi keduanya WAJIB mendarat
-- lebih dulu, di berkas terpisah.
--
-- Rollback: nilai enum tidak bisa dihapus di PostgreSQL. Untuk membatalkan,
-- tipe harus dibuat ulang — definisi awalnya ada di 0001_init.sql:23.
-- ============================================================

set search_path = public, extensions;

-- ------------------------------------------------------------
-- 'kunjungan' — puncak corong.
--
-- Tanpa nilai ini corong tidak punya tahap teratas yang jujur. Pengunjung
-- yang mendarat lalu pergi tidak memancarkan peristiwa apa pun, sehingga
-- "pengunjung" hanya bisa diturunkan dari distinct session_hash pada
-- peristiwa yang KEBETULAN terjadi — yang berarti setiap orang yang tidak
-- membuka satu pun halaman detail tidak pernah terhitung. Batang terlebar
-- pada corong justru menjadi yang paling salah, dan salahnya tak terlihat.
--
-- Satu baris per sesi peramban, housing_id null.
-- ------------------------------------------------------------
alter type public.event_type add value if not exists 'kunjungan';

-- ------------------------------------------------------------
-- 'pakai_kalkulator' — tahap antara melihat properti dan menghubungi.
--
-- Inilah satu-satunya sinyal bahwa seseorang berpindah dari menonton ke
-- menghitung. Tanpanya corong melompat dari "lihat detail" langsung ke
-- "kontak", dan kebocoran terbesar pada jalur KPR — orang yang menghitung
-- lalu diam — tidak pernah terlihat.
--
-- Dipancarkan pada perubahan masukan pertama yang SUNGGUHAN, bukan saat
-- komponen terpasang; lihat catatan di src/components/jejak.ts.
-- ------------------------------------------------------------
alter type public.event_type add value if not exists 'pakai_kalkulator';
