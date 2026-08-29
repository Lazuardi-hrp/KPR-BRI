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
