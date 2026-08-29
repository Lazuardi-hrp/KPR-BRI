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

> **pg_cron memakai UTC.** WIB adalah UTC+7, jadi 02.00 WIB ditulis `0 19 * * *`.
> Salah di sini membuat purge data pribadi berjalan di tengah jam kerja.

Verifikasi: `select jobname, last_run_status from cron.job_run_details order by end_time desc limit 10;`

## 7. Catatan keamanan yang perlu diketahui

**Otorisasi berlapis dua.** `anon` ditolak di lapis GRANT tingkat tabel —
*sebelum* RLS dievaluasi. Karena itu percobaan membaca `leads` menghasilkan
`permission denied for table leads`, bukan "0 baris".

**Mencabut hak dari `anon` saja tidak cukup.** ACL fungsi PostgreSQL punya entri
PUBLIC (`=X/...`) yang diwarisi `anon`. `revoke ... from anon` tidak
menyentuhnya. Selalu `revoke ... from public` lalu beri ulang secara eksplisit.
Ini yang membuat perbaikan pertama pada 0003 tidak berefek dan harus diulang
di 0007.

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
- **Turnstile belum dipasang**; rate limit basis data sudah berjalan.
- **Halaman kebijakan privasi dan syarat & ketentuan belum ditinjau hukum.**
  Formulir prospek tidak boleh dipromosikan ke publik sebelum itu (PRD R-4).
