# Data yang masih harus diisi tim BRI

Migrasi memindahkan 16 perumahan dari `src/lib/housing-storage.ts` ke Supabase
dan menutup cacat struktural yang membuat angkanya mustahil (K-4, K-5, K-6).
Yang **tidak** bisa dilakukan migrasi adalah membuat datanya menjadi **benar**.

Ke-16 baris kini berstatus `published` dengan `needs_review = true`. Penanda itu
tampil sebagai lencana kuning di `/admin/perumahan`. Matikan penanda pada sebuah
baris hanya setelah datanya benar-benar dikonfirmasi.

---

## 1. Jumlah unit — 15 dari 16 baris (PRD D-1)

Data lama hanya punya `availableUnits`. Angka `subsidi_units` diturunkan dengan:

```
subsidi_units      = availableUnits + soldSubsidiUnits
sold_subsidi_units = soldSubsidiUnits (0 untuk 15 baris)
commercial_units   = 0
```

Akibatnya 15 perumahan menampilkan **100% tersedia**. Itu bukan klaim bahwa
belum ada satu unit pun terjual — melainkan pengakuan bahwa **angka terjual
tidak diketahui**. Mengarang angka terjual agar "terlihat wajar" akan menaruh
kebohongan di layar calon pembeli, jadi sengaja tidak dilakukan.

Hanya `legacy_id = 1` (Innara Residence 2) yang punya data terjual sungguhan
(5 dari 50 → 90%).

**Yang dibutuhkan:** jumlah unit subsidi, unit komersial, dan berapa yang sudah
terjual, per perumahan.

## 2. Koordinat kembar — 3 baris (PRD D-3, K-7)

`legacy_id` **9 (GRIYA AL-FALAH IV)**, **15 (GRAHA ASIDO 7 TAHAP II)**, dan
**16 (GRIYA TAMA 3)** memakai titik yang sama persis: `3.011792, 99.096234`.
Ketiganya menumpuk di satu titik peta. Koordinat aslinya tidak tersedia,
jadi nilainya dibiarkan apa adanya alih-alih dikarang.

Baris 15 dan 16 juga memakai alamat dan foto yang sama (`asido.jpg`) padahal
namanya berbeda — kemungkinan salah satunya salah entri.

**Yang dibutuhkan:** koordinat sebenarnya untuk ketiganya.

## 3. Kontak pemasaran — 16 dari 16 baris (PRD D-4, K-8)

- `contactPerson` bernilai **"Ali Atin" pada seluruh 16 baris**.
- 12 dari 16 memakai nomor telepon yang sama: `0821-2222-3333`.
- Email lama memakai lima domain fiktif (`greenvalley.com`, `majujaya.com`,
  `bukitsejahtera.com`, `harmonisent.com`, `sinarindah.com`) yang tidak
  berhubungan dengan nama perumahan mana pun. **Email TIDAK dimigrasikan** —
  kolomnya dikosongkan, bukan diisi alamat yang akan memantul.

Nama dan telepon dipertahankan karena itu satu-satunya jalur kontak yang ada.

**Yang dibutuhkan:** nama, telepon, dan email pemasaran yang benar per perumahan.
Diisi lewat `/admin/perumahan/<id>` bagian "Kontak pemasaran".

> **Nomor ini sekarang menerima WhatsApp, bukan hanya telepon.** Setiap tombol
> WhatsApp di halaman detail, popup peta, dan kalkulator mengirim ke
> `housings.phone`. Selama 12 dari 16 baris memakai `0821-2222-3333` yang sama,
> ke-12 percakapan itu mendarat di satu nomor — dan bila nomor itu tidak
> dipegang siapa pun, pesan calon pembeli hilang tanpa jejak apa pun di sisi
> kami. Ini menaikkan §3 dari "data yang kurang rapi" menjadi **prasyarat
> kanal**.

## 3b. Nomor WhatsApp tim KPR pusat

`app_settings.public.whatsapp` diseed **kosong** (migrasi 0023). Selama begitu:

- `/simulasi` tidak menampilkan tombol WhatsApp sampai pengunjung memilih
  sebuah perumahan — padahal orang yang baru menghitung anggarannya justru
  belum punya satu pun yang bisa dipilih;
- perumahan tanpa kontak pemasaran tidak punya cadangan sama sekali.

**Yang dibutuhkan:** satu nomor WhatsApp yang benar-benar dijaga, beserta jam
layanannya bila ada. Cara mengisinya di `docs/RUNBOOK.md` §5b.

## 4. Spesifikasi teknis — 15 dari 16 baris (PRD D-5, K-9)

| Kolom | Terisi |
|---|---|
| `roof_type`, `wall_type` | 1 dari 16 (hanya legacy_id 1) |
| `foundation_type` | 0 dari 16 |
| `building_area`, `land_area` | 0 dari 16 |
| `bedrooms`, `bathrooms` | 0 dari 16 |

Popup dan halaman detail menyembunyikan baris yang kosong, jadi tampilannya
tidak rusak — tetapi bagian spesifikasi nyaris kosong di 15 perumahan.

## 5. Harga seragam (PRD D-6, K-10)

Seluruh 16 baris berharga persis `Rp 166.000.000`. Kini tersimpan sebagai angka
(`price_min`/`price_max numeric`), bukan string, sehingga bisa difilter dan
diurutkan.

**Perlu dikonfirmasi tim produk:** apakah Rp 166.000.000 memang plafon subsidi
seragam? Bila ya, cukup dinyatakan sekali di teks bagian, tidak diulang 16 kali.

## 6. Klaim pemasaran "1000+ keluarga bahagia"

Angka ini **tidak punya sumber di basis data**. `sum(sold_subsidi_units)` yang
sebenarnya adalah **5**. Karena itu ia disimpan terpisah di
`app_settings.public.stats_happy_families` dan diberi label sebagai klaim
pemasaran, bukan agregat. Dua angka lain di landing page (16 perumahan,
1.083 unit tersedia) adalah hitungan sungguhan.

---

## Cara memperbarui

1. Masuk ke `/admin` dengan akun petugas.
2. Buka **Perumahan**, klik baris yang berlencana "perlu ditinjau".
3. Perbaiki angka unit, harga, spesifikasi, dan koordinat.
4. Isi kontak pemasaran di bagian bawah halaman yang sama.
5. Hilangkan centang **"Perlu ditinjau"**, lalu Simpan.
6. Perubahan tampil ke pengunjung dalam waktu kurang dari lima menit.

Query untuk melihat sisa pekerjaan:

```sql
select legacy_id, name, subsidi_units, sold_subsidi_units, available_units,
       (select count(*) from housing_contacts c
         where c.housing_id = h.id and c.email is not null) as punya_email
from public.housings h
where needs_review and deleted_at is null
order by legacy_id;
```

---

## Apa yang terbuka begitu data ini terisi

Filter pencarian di `/map` tidak ditulis satu per satu; ia membaca datanya
sendiri. `hitungFacet()` di `src/lib/pencarian.ts` menggambar sebuah kontrol
hanya bila dimensinya punya **sekurang-kurangnya dua nilai berbeda yang
sungguhan** di antara perumahan yang tayang.

Hari ini yang tampil adalah **kecamatan, ketersediaan, jarak, dan kemampuan
bayar**. Tiga kontrol lain sudah selesai ditulis tetapi sengaja tidak digambar,
karena datanya belum membedakan apa pun:

| Kontrol | Muncul begitu | Terkait |
|---|---|---|
| Rentang harga | dua perumahan punya `price_min`/`price_max` yang berbeda | §5 |
| Tipe (subsidi / komersial) | ada perumahan dengan `commercial_units > 0` | §1 |
| Jumlah kamar | dua perumahan punya `bedrooms` yang berbeda | §4 |

Tidak ada kode yang perlu diubah untuk memunculkannya — cukup isi kolomnya
lewat `/admin/perumahan/<id>`, dan kontrolnya hadir sendiri pada pemuatan
berikutnya. Penggeser harga yang setiap posisinya menghasilkan 16 dari 16
terbaca sebagai aplikasi rusak, jadi ia ditahan sampai ada yang bisa
disaringnya.

Satu hal lagi yang menyentuh peta: tiga koordinat kembar di §2 kini disebar
pada lingkaran kecil supaya ketiganya bisa diklik. Itu **akomodasi tampilan,
bukan perbaikan** — begitu koordinat aslinya diisi, penyebarannya berhenti
dengan sendirinya dan pin kembali berdiri di tempat yang benar.
