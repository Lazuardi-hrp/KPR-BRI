-- ============================================================
-- KPR BRI — Migrasi 0023_whatsapp
--
-- Satu baris pengaturan: nomor WhatsApp tim KPR pusat.
--
-- Sampai sekarang satu-satunya nomor WhatsApp yang dikenal situs adalah
-- housings.phone — kontak pemasaran per perumahan. Konsekuensinya tidak
-- terlihat sampai seseorang membuka /simulasi: di sana tombol WhatsApp hanya
-- muncul setelah sebuah perumahan dipilih, padahal justru pengunjung yang
-- BELUM memilih yang paling butuh diajak bicara — ia baru mengetahui
-- perkiraan anggarannya dan tidak tahu harus bertanya ke siapa. Pertanyaan
-- pada momen itu tidak punya tujuan sama sekali, dan pertanyaan tanpa tujuan
-- tidak menjadi prospek.
--
-- Nilainya sengaja diseed KOSONG. Menebak sebuah nomor jauh lebih buruk
-- daripada tidak punya: aplikasi memperlakukan nomor kosong sebagai perintah
-- untuk tidak merender tombolnya sama sekali (getKontakWhatsApp di
-- src/lib/queries/whatsapp.ts mengembalikan null), sedangkan nomor yang salah
-- mengirim calon pembeli ke percakapan yang tidak pernah dibaca siapa pun.
--
-- Awalan `public.` menentukan segalanya, sama seperti pada 0019: policy
-- settings_read_public (0001 baris 520) menyaring `key like 'public.%'`, jadi
-- nama lain tidak terbaca anon dan tombolnya akan hilang tanpa satu pun pesan
-- galat di mana pun.
--
-- Cara mengisinya ada di docs/RUNBOOK.md §5b.
--
-- Rollback: delete from public.app_settings where key = 'public.whatsapp';
-- ============================================================

set search_path = public, extensions;

insert into public.app_settings (key, value, description) values (
  'public.whatsapp',
  jsonb_build_object(
    -- Format bebas: 0812…, +62 812…, atau 62812… — aplikasi menormalkannya
    -- (nomorWa di src/lib/whatsapp.ts). null berarti belum diatur.
    'nomor', null,
    'label', 'Tim KPR BRI Pematang Siantar',
    -- Ditampilkan apa adanya di samping tombol. Isi hanya bila memang ada
    -- yang menjaga nomor itu pada jam tersebut: janji jam layanan yang tidak
    -- ditepati merusak lebih banyak daripada tidak menyebutkannya.
    'jam', null
  ),
  'Kontak WhatsApp tim KPR pusat, dipakai halaman /simulasi dan sebagai '
  'cadangan bila sebuah perumahan belum punya kontak pemasaran. Kosongkan '
  '`nomor` untuk menyembunyikan seluruh tombolnya — nomor yang salah lebih '
  'buruk daripada tidak ada tombol. Cadangan terakhir: env '
  'NEXT_PUBLIC_WHATSAPP_KPR.'
)
on conflict (key) do update
  set description = excluded.description;
--                  ^ value TIDAK ditimpa: menjalankan ulang migrasi ini pada
--                  basis data yang nomornya sudah diisi tim BRI akan
--                  mengosongkannya kembali, dan tidak ada yang menyadarinya
--                  sampai seseorang melapor tombolnya hilang.
