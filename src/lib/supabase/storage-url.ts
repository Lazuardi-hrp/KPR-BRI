const BUCKET = "perumahan"

/**
 * Menyelesaikan storage_path menjadi URL yang bisa dirender.
 *
 * Seed menuliskan path publik lama ('/kpr-assets/innara.jpg') karena saat
 * migrasi berjalan berkasnya belum ada di Storage. Setelah
 * scripts/upload-housing-images.mjs jalan dan 0009_storage_paths.sql
 * diterapkan, nilainya menjadi kunci bucket ('{housing_id}/{stem}.webp').
 * Resolver ini menangani keduanya, sehingga peralihan tidak pernah
 * meninggalkan gambar rusak.
 */
export function publicImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith("/") || path.startsWith("http")) return path
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}
