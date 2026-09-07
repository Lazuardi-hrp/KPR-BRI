-- ============================================================
-- KPR BRI — Migrasi 0017_security_enums
--
-- Migrasi ini HANYA menambah nilai enum, dan itu disengaja.
--
-- PostgreSQL melarang sebuah nilai enum baru dipakai di dalam transaksi yang
-- sama dengan yang menambahkannya. Karena Supabase membungkus setiap migrasi
-- dalam satu transaksi, menaruh `alter type ... add value` bersama fungsi yang
-- memakainya membuat migrasi gagal dengan pesan yang menyesatkan
-- ("unsafe use of new value of enum type"). Memisahkannya adalah cara yang
-- didukung, bukan sekadar kehati-hatian.
--
-- Rollback: nilai enum tidak bisa dihapus di PostgreSQL. Untuk membatalkan,
-- tipe harus dibuat ulang — lihat 0014 bagian 2 untuk definisi awalnya.
-- ============================================================

set search_path = public, extensions;

-- Pengiriman berulang untuk perumahan yang sama oleh orang yang sama.
-- Dibedakan dari 'rate_limit' karena maknanya berbeda: kuota berarti
-- "terlalu banyak permintaan", duplikat berarti "permintaan yang sama".
-- Yang pertama patut ditahan; yang kedua patut DIGABUNG, dan admin perlu
-- melihat keduanya sebagai hal yang berbeda saat menilai lalu lintas.
alter type public.abuse_kind add value if not exists 'duplicate_lead';
