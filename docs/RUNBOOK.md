# Runbook operasional — KPR BRI

Proyek Supabase: **`kpr-bri`** · ref `avthqhzpmqskagnumiap` · region `ap-southeast-1`

---

## 1. Membuat akun petugas

Pendaftaran mandiri **dinonaktifkan** (PRD §9.1). Akun dibuat manual:

1. Dashboard Supabase → **Authentication → Users → Add user**.
2. Isi email dan kata sandi (minimal 12 karakter), centang **Auto Confirm User**.
3. Trigger `on_auth_user_created` otomatis membuat baris `profiles` dengan peran
   `viewer`. Peran itu **tidak** memberi akses apa pun ke dashboard.
4. Naikkan perannya:
   ```bash
   npm run admin:promote -- petugas@bri.co.id
   npm run admin:promote -- staf@pengembang.co.id pengembang <developer_uuid>
   ```
5. Aktifkan **MFA (TOTP)** untuk setiap akun admin. Ini produk keuangan.

> Jangan membuat pengguna lewat SQL mentah. GoTrue menyimpan beberapa kolom token
> sebagai string tak-nullable; baris yang dibuat manual menyisakan NULL di sana
> dan login gagal dengan pesan menyesatkan **"Database error querying schema"**.

Sediakan **minimal dua akun admin** (PRD R-7) supaya satu operator tidak menjadi
titik kegagalan tunggal.

## 2. Mencabut akses

- **Menonaktifkan sementara:** `update public.profiles set is_active = false where id = '<uuid>';`
  Sesi berjalan langsung kehilangan hak karena `jwt_role()` menyaring `is_active`.
- **Menurunkan peran:** `npm run admin:promote -- email@contoh.com viewer`
- **Menghapus akun:** hapus dari Dashboard → Authentication. Baris `profiles`
  ikut terhapus (cascade).

**Menghapus pengembang** memerlukan urutan: nonaktifkan atau alihkan dulu akun
stafnya, baru hapus barisnya. FK `profiles_developer_fk` memakai `ON DELETE
RESTRICT` (migrasi 0008) justru supaya kegagalannya jelas — sebelumnya
`SET NULL` selalu bertabrakan dengan `profiles_role_developer_ck` dan
menghasilkan error 23514 yang membingungkan.

## 3. Migrasi basis data

Berkas di `supabase/migrations/`, dijalankan berurutan, hanya maju.

| Berkas | Isi |
|---|---|
| `0001_init.sql` | Skema inti: 12 tabel, 25 kebijakan RLS, 9 fungsi, view publik |
| `0002_hardening.sql` | GRANT tingkat tabel, trigger auth→profiles, kolom `needs_review`, perluasan view |
| `0003_rls_fixes.sql` | Empat lubang otorisasi (lihat §7) |
| `0004_seed_from_legacy.sql` | 16 perumahan, regions, kontak, gambar — idempotent |
| `0005_storage.sql` | Bucket `perumahan` + kebijakan storage |
| `0006_cron.sql` | pg_cron: retensi, sapuan outbox, pemangkasan analitik |
| `0007_advisor_fixes.sql` | Temuan Security Advisor |
| `0008_developer_fk_restrict.sql` | FK pengembang → RESTRICT |
| `0009_storage_paths.sql` | **Jangan jalankan** sebelum unggah gambar selesai |
| `0010`–`0011` | Perbaikan performa dan rekursi kebijakan `profiles` |
| `0012`–`0015` | Fase kritis: siklus prospek, verifikasi properti, anti-bot |
| `0016_verification_trust.sql` | Bidang `nama`, kontak & foto menurunkan verifikasi, `field_checks` publik, `mark_needs_update()` |

Migrasi seed aman diulang: baris yang `needs_review`-nya sudah dimatikan
(artinya sudah dikurasi manusia) tidak akan ditimpa.

## 4. Memindahkan foto ke Storage

Saat ini `housing_images.storage_path` masih menunjuk berkas repo
(`/kpr-assets/*.jpg`) dan situs melayaninya dari `public/`. Untuk pindah ke
Storage:

```bash
# Butuh SUPABASE_SERVICE_ROLE_KEY di .env.local
npm run images:upload
```

Skrip mengubah tiap gambar ke WebP q72 1200×900, mengunggahnya ke
`perumahan/{housing_id}/{nama}.webp`, lalu memperbarui `storage_path`,
`width`, `height`, `bytes`, dan `blur_data_url` **per baris setelah unggahan
berhasil**. Kalau terhenti di tengah, baris yang belum terunggah tetap menunjuk
berkas lokal yang masih ada — tidak ada gambar rusak.

Aset di `public/kpr-assets/` **tetap dipertahankan** (batasan `design.md` §0.2).

## 5. Notifikasi prospek

Belum aktif. Untuk mengaktifkan:

1. `supabase functions deploy notify-lead --project-ref avthqhzpmqskagnumiap`
2. `supabase secrets set RESEND_API_KEY=... ADMIN_NOTIFICATION_EMAIL=...`
3. Isi `app_settings.admin_email` lewat `/admin/pengaturan` atau SQL.
4. Buat Database Webhook: `INSERT` pada `public.notification_outbox` → panggil
   fungsi `notify-lead`.
5. Untuk percobaan ulang otomatis, simpan URL fungsi di
   `app_settings.notify_lead_url` dan kunci service_role di Vault dengan nama
   `service_role_key`.

Sampai langkah ini selesai, prospek tetap **tersimpan dengan aman** dan
antreannya menumpuk di `notification_outbox` — tidak ada yang hilang. Itulah
inti pola outbox: kegagalan mengirim email tidak pernah menggagalkan
penyimpanan prospek.

Cek antrean macet:
```sql
select status, count(*), max(attempts) from public.notification_outbox group by status;
```

## 6. Jadwal pg_cron

| Job | Jadwal (UTC) | Waktu WIB | Fungsi |
|---|---|---|---|
| `purge-leads` | `0 19 * * *` | 02.00 | Hapus prospek kedaluwarsa (UU PDP) |
| `sweep-outbox` | `*/5 * * * *` | tiap 5 menit | Coba ulang notifikasi gagal |
| `prune-events` | `0 20 * * *` | 03.00 | Buang `housing_events` > 180 hari |
| `expire-verifications` | `0 23 * * *` | 06.00 | Turunkan verifikasi yang lewat masa berlaku |
| `purge-security` | `30 19 * * *` | 02.30 | Buang kuota, peristiwa, dan blokir kedaluwarsa |
| `detect-spike` | `*/5 * * * *` | tiap 5 menit | Cari lonjakan lalu lintas yang tersebar di banyak identitas |

> **pg_cron memakai UTC.** WIB adalah UTC+7, jadi 02.00 WIB ditulis `0 19 * * *`.
> Salah di sini membuat purge data pribadi berjalan di tengah jam kerja.

Verifikasi: `select jobname, last_run_status from cron.job_run_details order by end_time desc limit 10;`

## 6b. Fase kritis — prospek, verifikasi, keamanan

Tiga sistem yang ditambahkan migrasi 0012–0018. Semuanya bertemu di dashboard
`/admin`, yang disusun untuk menjawab tiga pertanyaan berurutan: siapa yang
harus dihubungi, data properti mana yang perlu perhatian, dan apakah ada yang
mencurigakan.

### Siklus hidup prospek

`baru → dihubungi → terkualifikasi → tindak_lanjut → pengajuan →
disetujui / ditolak / ditutup`

Perpindahan tahap **tidak pernah** ditulis dari lapisan aplikasi sendirian:
trigger `leads_log_status` yang mengisi `contacted_at`, `closed_at`, dan
`lead_status_history`. Perubahan lewat SQL langsung pun ikut tercatat.

**SLA kontak pertama** bawaannya 4 jam dan hidup di data, bukan kode:

```sql
update public.app_settings set value = '2'::jsonb where key = 'public.lead_sla_hours';
```

Prospek yang lewat batas dan masih berstatus `baru` muncul bertanda merah di
`/admin/prospek?terlambat=1`.

### Verifikasi properti

Verifikasi adalah **peristiwa**, bukan kolom boolean. Satu baris
`housing_verifications` per pemeriksaan: siapa, kapan, bidang mana, dan kapan
harus ditinjau ulang.

Dua hal menurunkan status secara otomatis — keduanya sengaja, dan keduanya
membuat labelnya jujur tanpa perlu ada orang yang ingat:

1. **Perubahan data material** (harga, lokasi, pengembang, jumlah unit, foto)
   menjatuhkan `terverifikasi` → `perlu_pembaruan` lewat trigger
   `housings_track_changes`.
2. **Lewat tanggal tinjau ulang** — job `expire-verifications`.

> Verifikasi **sebagian** menghasilkan `perlu_pembaruan`, bukan
> `terverifikasi`. Centang hijau hanya muncul bila SELURUH bidang diperiksa.
> Aturan ini ada di `verify_housing()`, bukan di UI — jangan menduplikasinya.

Riwayat perubahan per bidang ada di `housing_field_history` dan tampil sebagai
satu lini masa di `/admin/verifikasi/<id>` — peristiwa verifikasi dan perubahan
data dalam satu urutan waktu, karena keduanya saling menjelaskan.

**Tujuh bidang, bukan enam** (migrasi 0016). `nama` ditambahkan supaya identitas
properti ikut dinyatakan seseorang. `verify_housing()` menghitung "seluruh
bidang" lewat `enum_range` saat dipanggil, jadi baris yang sudah terverifikasi
mempertahankan statusnya sampai diperiksa ulang — ambangnya naik ke depan, tidak
surut ke belakang.

**Kontak dan foto sekarang ikut menurunkan status** (migrasi 0016). Sebelumnya
`housings_track_changes` hanya mengawasi tabel `housings`, sehingga mengganti
nomor telepon pemasaran membiarkan centang hijau — lengkap dengan baris
"Nomor kontak ✓" — tetap tayang untuk nomor yang belum pernah dilihat siapa pun.

> **Urutannya penting: jalankan `npm run images:upload` SEBELUM memverifikasi.**
> Skrip itu menulis ulang `storage_path` tiap gambar, dan `housing_images_touch`
> memperlakukan itu sebagai perubahan foto — seluruh verifikasi yang sudah ada
> akan turun ke `perlu_pembaruan`. Perubahan yang hanya menyentuh
> `width`/`height`/`bytes`/`blur_data_url`/`sort_order` sengaja diabaikan.

### Tahap verifikasi

Basis data menyimpan tiga status; layar menampilkan lima tahap. Dua sisanya —
`segera_ditinjau` dan `kedaluwarsa` — **diturunkan** dari `verification_due_at`
di `src/lib/verification.ts`, tidak disimpan. Alasannya: `expire-verifications`
berjalan tiap malam dan langsung menjatuhkan yang lewat tempo, jadi nilai enum
"kedaluwarsa" hanya akan hidup beberapa jam sebelum cron menghapusnya sendiri.

`/admin/verifikasi` menampilkan spanduk **"N properti harus ditinjau ulang minggu
ini"** dari `verification_metrics().jatuh_tempo` (ambang 7 hari, sama dengan
`HARI_SEGERA_DITINJAU`).

### Skor keandalan informasi

Angka 0–100 di kartu, halaman detail, dan tabel admin. Dihitung di
`src/lib/verification.ts` — **bukan di SQL** — supaya ketiga permukaan memakai
satu rumus dan tidak pernah menampilkan angka berbeda untuk properti yang sama.

    kelengkapan 40 + cakupan verifikasi 40 + kesegaran 20

dengan dua batas atas: status `menunggu` tidak bisa melewati 50, dan
`needs_review` tidak bisa melewati 65.

> Skor ini menilai **kelengkapan dan kebaruan informasi**, bukan mutu properti,
> kewajaran harganya, atau kelayakan kreditnya. Jangan pernah menampilkannya
> sebagai penilaian properti — kalimat penyangkalannya sudah ikut tayang di
> halaman publik dan harus tetap di sana.

Dengan data sekarang sebagian besar perumahan jatuh di kisaran 30–55. Itu bukan
cacat rumus melainkan cerminan `docs/DATA-TODO.md`: 15 dari 16 baris belum
pernah diverifikasi, pengembang dan email sebagian besar kosong. Angkanya naik
saat datanya diperbaiki, bukan saat rumusnya dilonggarkan.

### Anti-bot

Satu gerbang, `guard_request()`, dipanggil sebelum setiap aksi publik. Ia
menggabungkan tiga lapis menjadi satu putusan: `lolos` | `tantang` | `tolak`.

| Putusan | Kapan | Yang dilihat pengguna |
|---|---|---|
| `lolos` | skor < 30 dan di bawah ambang tantangan | tidak ada apa-apa |
| `tantang` | skor ≥ 30 atau melewati ambang tantangan | kotak verifikasi Turnstile |
| `tolak` | skor ≥ 70, kuota habis, atau sedang diblokir | pesan sesuai sebabnya (lihat bawah) |

Sejak 0018 setiap penolakan membawa `alasan`, dan aplikasi memetakannya ke
kalimat yang berbeda — dua keadaan yang berbeda tidak boleh berbunyi sama:

| `alasan` | Yang dibaca pengunjung | Artinya |
|---|---|---|
| `kuota` | "Mohon tunggu sebentar…" | coba lagi sebentar lagi |
| `diblokir` | "Akses dibatasi sementara…" | jangan coba lagi sekarang |
| `perilaku` | "Pengiriman Anda belum dapat kami proses…" | muat ulang lalu coba sekali lagi |
| `sistem` | "Kami sedang tidak dapat memproses…" | kegagalan di sisi kami |

Tidak satu pun menyebut angka batas, skor, atau lamanya blokir: memberi tahu
penyerang persis di mana ambangnya adalah menyerahkan cara menyetel serangan
berikutnya tepat di bawahnya.

Ambangnya hidup di data:

```sql
select value from public.app_settings where key = 'rate_limits';
-- { "lead_submit": [5, 3600, 2], ... }  ⇒ [batas, jendela detik, ambang tantangan]
```

Lima pelanggaran kuota dalam satu jam menaikkan menjadi blokir otomatis 6 jam
dan memunculkan notifikasi keamanan. Blokir dapat dibuka di `/admin/keamanan`.

> **Sinyal dari klien tidak pernah meringankan.** Honeypot, lama pengisian, dan
> penanda interaksi hanya bisa MENAIKKAN skor. Bot yang berbohong dengan
> mengaku mengisi selama 30 detik hanya diperlakukan setara pengguna normal,
> lalu tetap tertahan kuota dan riwayatnya — keduanya dihitung di server.

**Turnstile bersifat opsional tetapi gagal-tertutup.** Bila
`TURNSTILE_SECRET_KEY` kosong, tantangan tidak bisa diselesaikan sehingga
permintaan berisiko ditolak — bukan diloloskan. Pengguna normal tidak pernah
sampai ke tahap itu.

> **CSP wajib menyebut `https://challenges.cloudflare.com` pada `script-src`,
> `frame-src`, DAN `connect-src`.** `next.config.ts` menambahkannya otomatis
> ketika `NEXT_PUBLIC_TURNSTILE_SITE_KEY` terisi. Melewatkan `frame-src`
> membuat kotak verifikasi tidak pernah muncul — dan pengguna sah yang
> tertandai mencurigakan terjebak permanen, karena satu-satunya jalan keluar
> justru yang diblokir.

### Perlindungan login

Sejak 0018 formulir `/admin/login` mengirim lewat Server Action `masukAdmin()`,
bukan memanggil `signInWithPassword()` dari browser. Sebelumnya aksi paling
bernilai di situs ini adalah satu-satunya yang tidak meninggalkan jejak:
penebakan kata sandi bisa berjalan semalaman tanpa satu baris pun di
`/admin/keamanan`.

* Kuota login: 8 percobaan / 15 menit (`rate_limits.login`), diperiksa
  **sebelum** kredensial menyentuh server Auth.
* Setiap kegagalan tercatat sebagai `abuse_events.auth_fail`.
* **10 kegagalan dalam 15 menit ⇒ blokir 1 jam** + notifikasi keamanan.

> Blokirnya satu jam, bukan permanen: petugas yang benar-benar terkunci harus
> bisa bekerja lagi tanpa menunggu administrator.

Akun yang kredensialnya benar tetapi perannya belum `admin`/`pengembang`
**tidak** dihitung sebagai kegagalan — itu soal wewenang, bukan penyusupan,
dan menghitungnya akan memblokir petugas yang akunnya sekadar belum diberi peran.

Putusan `tantang` pada login sengaja diperlakukan sebagai lolos: satu-satunya
pengguna halaman ini adalah petugas yang sudah dikenal. Percobaan yang gagal
tetap dicatat dan tetap berujung blokir.

### Prospek duplikat

Pengiriman ulang oleh orang yang sama untuk perumahan yang sama **digabungkan**,
bukan ditolak. Syaratnya: nomor telepon ternormalisasi sama, `housing_id` sama,
dalam 6 jam, dan prospek sebelumnya belum ditutup.

`normalize_phone_id()` menyatukan `0812…`, `+62 812…`, dan `62812…` menjadi satu
bentuk — tanpa itu penggabungan gagal justru pada kasus yang paling sering.

Yang terjadi saat digabung:

* Pesan baru **ditambahkan**, tidak menimpa yang lama.
* Konteks KPR dan email disegarkan bila kiriman baru membawanya.
* `risk_score` diambil yang **tertinggi** — satu kiriman bersih tidak boleh
  mencuci jejak kiriman mencurigakan sebelumnya.
* Catatan sistem (`lead_notes` dengan `author_id` null) dicatat.
* **Tidak** ada notifikasi `prospek_baru` kedua. Justru banjir notifikasi yang
  membuat admin berhenti membaca notifikasi.
* Pengunjung diberi tahu kirimannya digabungkan, supaya ia berhenti mengirim
  ulang dan tidak menelepon untuk memastikan.

Pada pengiriman ke-5 ke atas, admin menerima notifikasi `keamanan`.

Verifikasi cepat:

```sql
select public.normalize_phone_id('0812-3456-7890')
     = public.normalize_phone_id('+62 812 3456 7890');  -- t
```

### Lonjakan lalu lintas

Kelemahan yang ditutup 0018: seluruh keputusan `guard_request()` bersifat **per
identitas**. Seribu identitas yang masing-masing mengirim empat prospek tidak
pernah melewati kuota mana pun dan tidak pernah memberi tahu siapa pun —
padahal itulah bentuk serangan yang paling merusak pipeline pemasaran.

`detect_traffic_spike()` berjalan tiap 5 menit, membaca `rate_limit_buckets`
(seluruh permintaan, bukan hanya yang sudah ditandai) dan membandingkannya
dengan ambang per aksi:

```sql
select value from public.app_settings where key = 'spike_thresholds';
-- { "lead_submit": [60, 6], ... }  ⇒ [permintaan/jam, identitas berbeda minimum]
```

Syarat "identitas berbeda minimum" memisahkan lonjakan **tersebar** — yang tidak
bisa ditangani lapisan per identitas — dari satu orang yang berulah, yang sudah
ditangani kuota. Tanpa syarat itu, tiap kali satu bot diblokir admin menerima
peringatan kedua tentang kejadian yang sama.

Satu peringatan per aksi per jam; hasilnya muncul di `security_alerts` dan di
bagian paling atas `/admin/keamanan`.

### Menutup temuan

Temuan berbobot (`severity > 0`) punya status **Terbuka**/**Selesai** dan bisa
ditandai admin. Tanpa ini halaman Keamanan hanyalah log yang bertambah panjang;
setelah beberapa ratus baris, daftar yang tidak bisa dituntaskan berhenti
dibaca — dan pengawasan yang tidak dibaca sama saja dengan tidak ada.

Tombolnya dua arah: "selesai" satu arah membuat admin ragu menekannya, dan
keraguan itu berakhir dengan daftar yang tidak pernah ditutup sama sekali.
Verifikasi yang lolos dan prospek yang digabung tidak diberi status — keduanya
keterangan, bukan pekerjaan.

`resolved_by` diisi basis data dari `auth.uid()`, bukan dikirim aplikasi: jejak
audit yang berbohong lebih buruk daripada tidak ada jejak.

### Notifikasi admin

`admin_notifications` memberi lonceng di header admin. Terpisah dari
`notification_outbox`, yang mengurus pengiriman email keluar dengan percobaan
ulang. Status "sudah dibaca" bersifat **bersama** — satu orang menandai, semua
ikut bersih. Itu perilaku yang benar untuk satu kotak masuk yang ditangani
beberapa orang.

### Parameter simulasi KPR

Bunga, tenor maksimum, dan uang muka minimum **tidak lagi dikompilasi ke dalam
bundel**. Nilai yang berlaku ada di `app_settings` dengan kunci
`public.kpr_skema`, dan dapat diubah dari `/admin/pengaturan` tanpa deploy.

```json
{
  "subsidi":   { "bunga": 5,   "tenorMax": 20, "tenorDefault": 15,
                 "dpMinPersen": 1,  "dpDefaultPersen": 10 },
  "komersial": { "bunga": 9.5, "tenorMax": 30, "tenorDefault": 15,
                 "dpMinPersen": 15, "dpDefaultPersen": 20 },
  "ditinjau_pada": "2026-09-03"
}
```

Yang perlu diketahui sebelum menyentuhnya:

* **Awalan `public.` wajib.** Policy `settings_read_public` menyaring
  `key like 'public.%'`. Kunci tanpa awalan itu tidak terbaca `anon` sama
  sekali, dan kalkulatornya akan diam-diam memakai angka cadangan — gagal
  tanpa suara, yang paling mahal untuk dilacak.
* **Nilai yang tidak sah diabaikan, bukan menjatuhkan halaman.** JSON rusak,
  bunga di luar 0–30, atau tenor di luar 1–40 membuat `src/lib/queries/kpr.ts`
  jatuh ke `SKEMA` di `src/lib/kpr.ts`. Kalkulator dengan bunga sedikit basi
  masih berguna; kalkulator yang menolak dirender menghapus seluruh jalur
  konversi halaman.
* **`ditinjau_pada` bukan hiasan.** Tanggalnya tampil di layar sebagai "Bunga
  ditinjau …" tepat di samping disclaimer. Perbarui setiap kali angkanya
  dikonfirmasi ulang ke BRI; tanggal yang basi memberi tahu pengunjung persis
  seberapa jauh angka itu pantas dipercaya.
* **ISR 5 menit berlaku.** Perubahan baru terlihat di `/simulasi` dan halaman
  detail setelah jendela revalidasi lewat, bukan seketika.

`design.md` §7.3 melarang menayangkan bunga tebakan. Selama angkanya hanya bisa
diperbaiki lewat deploy, perbaikannya akan tertunda — itulah sebabnya baris ini
ada.

### Regenerasi tipe setelah 0019

`src/lib/database.types.ts` dibangkitkan dari basis data, tetapi menyimpan
**satu penyimpangan tangan** yang wajib diterapkan ulang setiap kali tipenya
dibangkitkan ulang:

```ts
submit_lead: { Args: { p_housing_id: string | null, … } }
//                                   ^^^^^^^^^^^^^ pembangkit menulis `string`
```

Pembangkit menandai setiap parameter tanpa DEFAULT sebagai wajib dan tidak
nullable. `submit_lead` memang menerima `null` di sana — ia menjaga
`if p_housing_id is not null` dan memberi notifikasi "Tanpa perumahan" — tetapi
parameternya tidak bisa diberi DEFAULT karena mendahului `p_name`/`p_phone`
yang wajib. Tanpa `| null`, kiriman dari `/simulasi` tanpa perumahan gagal
`tsc`. Catatan yang sama ada tepat di atas definisinya di berkas itu.

### Kemampuan bayar pada prospek

`monthly_income`, `monthly_commitments`, dan `affordability_band` diisi dari
kalkulator di `/simulasi`. Tiga hal yang wajib dipahami petugas:

1. **Angkanya dilaporkan sendiri calon pembeli**, tanpa dokumen dan tanpa
   verifikasi apa pun. Ia BUKAN analisa kredit dan tidak boleh menjadi dasar
   keputusan kelayakan — hanya konteks percakapan.
2. **Band dihitung ulang di server**, dari penghasilan yang dikirim dan harga
   yang tersimpan, bukan dari kesimpulan yang dikirim browser. Tanpa itu siapa
   pun bisa menuliskan "aman" ke dasbor lewat DevTools.
3. **Kolomnya ikut masa simpan 365 hari** (`purge_after`) seperti data pribadi
   lain pada `leads`. Tidak ada perlakuan khusus, dan memang tidak perlu.

Teks persetujuan naik ke **v2** karena data keuangan adalah kategori yang tidak
disebut v1. Teksnya ada di `src/lib/schemas/lead.ts` bersebelahan dengan nomor
versinya; **keduanya wajib berubah bersama** — menaikkan versi tanpa mengubah
teks membuat kolom `consent_version` berbohong tentang apa yang disetujui orang.
Prospek lama tetap menyimpan `v1`; justru itu gunanya versi.

## 7. Catatan keamanan yang perlu diketahui

**Otorisasi berlapis dua.** `anon` ditolak di lapis GRANT tingkat tabel —
*sebelum* RLS dievaluasi. Karena itu percobaan membaca `leads` menghasilkan
`permission denied for table leads`, bukan "0 baris".

**Mencabut hak dari `anon` saja tidak cukup.** ACL fungsi PostgreSQL punya entri
PUBLIC (`=X/...`) yang diwarisi `anon`. `revoke ... from anon` tidak
menyentuhnya. Selalu `revoke ... from public` lalu beri ulang secara eksplisit.
Ini yang membuat perbaikan pertama pada 0003 tidak berefek dan harus diulang
di 0007.

**Cacat ini terulang di migrasi 0013 dan baru ditutup di 0016.** Kelima RPC
verifikasi (`verify_housing`, `housing_field_checks`, `verification_queue`,
`verification_metrics`, dan kemudian `mark_needs_update`) hanya diberi
`grant execute ... to authenticated` tanpa mencabut PUBLIC lebih dulu, sehingga
semuanya bisa dipanggil dengan kunci anon lewat `POST /rest/v1/rpc/<nama>`.
Yang paling nyata: `verification_queue` mengembalikan 16 baris berisi
`needs_review`, `developer_id`, dan `prioritas`. Penulisan tetap tertahan RLS
karena semua fungsi itu `security invoker` — jadi kebocorannya BACA, bukan
tulis. Uji regresinya satu baris:

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/verification_queue" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -d '{}'
# harus mengembalikan {"code":"42501", ...}, bukan larik baris
```

**Setiap fungsi `SECURITY DEFINER` baru wajib disertai `revoke execute`.**
PostgREST mengekspos semua fungsi di schema `public` sebagai
`POST /rest/v1/rpc/<nama>`. `purge_expired_leads()` sempat bisa dipanggil siapa
saja dengan kunci anon dan menghapus baris prospek — ditutup di 0003.
Pengecualian yang disengaja: `submit_lead`, yang memang jalur tulis publik.

**CSP tidak melindungi dari XSS.** `script-src` memakai `'unsafe-inline'` karena
Next.js membutuhkan skrip inline untuk hidrasi, dan alternatif yang benar
(nonce per-permintaan) memaksa semua halaman menjadi dinamis sehingga ISR mati.
Arahan lain (`img-src`, `connect-src`, `form-action`, `frame-ancestors`,
`object-src`) benar-benar berlaku. **Ini utang teknis yang belum lunas.**

**`'wasm-unsafe-eval'`** dibutuhkan dekoder meshopt hero 3D. Izin ini sempit
khusus WebAssembly dan tidak membuka `eval()` umum.

## 8. Uji keamanan

```
supabase/tests/rls_scenarios.sql
```

Menjalankan sebelas skenario §17.2 PRD ditambah dua kontrol positif, membuat
fixture sendiri, lalu membersihkannya. Jalankan setiap sebelum rilis. Semua
harus **LOLOS**.

Skenario 11 ("kredensial `admin123` masih berfungsi") bersifat frontend:
`grep -rn admin123 src/` harus nol hasil.

Sebelum rilis juga jalankan:
```bash
npm run build && npm run check:secrets   # memastikan tidak ada rahasia di bundel klien
```

## 9. Batasan yang belum teratasi

- **PITR tidak aktif** — butuh paket berbayar Supabase. Backup harian tetap
  jalan. **Wajib diaktifkan sebelum data produksi sungguhan masuk** (PRD §15).
- **Proyek free tier dapat dijeda** karena tidak aktif (PRD R-9).
- **MFA belum aktif** — diaktifkan manual per akun di Dashboard.
- **Kunci Turnstile belum diisi.** Lapisan anti-bot (kuota, honeypot, skor
  perilaku, blokir otomatis) sudah berjalan penuh tanpa itu; yang belum ada
  hanyalah cara pengguna tertandai membuktikan dirinya manusia. Isi
  `TURNSTILE_SECRET_KEY` dan `NEXT_PUBLIC_TURNSTILE_SITE_KEY` untuk
  mengaktifkannya — CSP menyesuaikan sendiri.
- **`SUPABASE_SERVICE_ROLE_KEY` belum diisi.** Karena itu Server Action
  berbicara sebagai `anon`, dan seluruh penjagaan berada di dalam fungsi
  `SECURITY DEFINER`. Ini disengaja dan aman, tetapi berarti
  `npm run images:upload` dan `admin:promote` belum bisa dijalankan.
- **Perlindungan kata sandi bocor (HaveIBeenPwned) belum aktif.** Satu sakelar
  di Dashboard → Authentication → Policies. Ini produk keuangan; nyalakan.
- **Halaman kebijakan privasi dan syarat & ketentuan belum ditinjau hukum.**
  Formulir prospek tidak boleh dipromosikan ke publik sebelum itu (PRD R-4).
- **Pembacaan langsung ke PostgREST tidak melewati `guard_request()`.** Kunci
  `anon` ada di bundel klien — memang seharusnya begitu — sehingga siapa pun
  dapat memanggil `/rest/v1/v_housing_public` tanpa melalui aplikasi. Yang
  membatasinya hanyalah RLS (hanya perumahan terbit, tanpa data pribadi) dan
  batas bawaan Supabase. Seluruh halaman publik membaca dari server, jadi
  aksi `api_read` pada `rate_limits` saat ini tidak pernah terpakai. Menutupnya
  butuh proksi baca di sisi aplikasi atau WAF di depan Supabase; keduanya di
  luar lingkup fase ini.
- **`stale_form` dan `scrape_suspect` masih berupa nilai enum tanpa penulis.**
  Formulir basi sudah menaikkan skor di `guard_request()` tetapi tidak dicatat
  sebagai peristiwa tersendiri, dan deteksi penyalinan massal belum dibuat —
  keduanya bergantung pada butir di atas.
