import { z } from "zod"

/** "" -> undefined, supaya field kosong pada FormData tidak menjadi 0 atau "". */
const kosongJadiUndefined = (v: unknown) => (v === "" || v === null ? undefined : v)

const angka = z.preprocess(kosongJadiUndefined, z.coerce.number())
const angkaOpsional = z.preprocess(kosongJadiUndefined, z.coerce.number().optional())
const teksOpsional = z.preprocess(kosongJadiUndefined, z.string().trim().max(200).optional())

export const HousingSchema = z
  .object({
    name: z.string().trim().min(3, "Nama perumahan minimal 3 karakter").max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung")
      .max(80),
    address: z.string().trim().max(400).default(""),
    region_id: z.preprocess(kosongJadiUndefined, z.string().uuid().optional()),
    developer_id: z.preprocess(kosongJadiUndefined, z.string().uuid().optional()),

    // Batas wilayah Indonesia. Salah ketik koordinat terbalik
    // (99.06, 2.99) ditolak di sini sebelum sampai ke basis data,
    // yang juga menolaknya lewat housings_lat_ck / housings_lng_ck.
    lat: angka.pipe(z.number().min(-11, "Lintang di luar wilayah Indonesia").max(6)),
    lng: angka.pipe(z.number().min(95, "Bujur di luar wilayah Indonesia").max(141)),

    price_min: angkaOpsional.pipe(z.number().positive().optional()),
    price_max: angkaOpsional.pipe(z.number().positive().optional()),

    subsidi_units: angka.pipe(z.number().int().min(0)),
    sold_subsidi_units: angka.pipe(z.number().int().min(0)),
    commercial_units: angka.pipe(z.number().int().min(0)),
    sold_commercial_units: angka.pipe(z.number().int().min(0)),

    building_area: angkaOpsional.pipe(z.number().nonnegative().optional()),
    land_area: angkaOpsional.pipe(z.number().nonnegative().optional()),
    bedrooms: angkaOpsional.pipe(z.number().int().min(0).max(99).optional()),
    bathrooms: angkaOpsional.pipe(z.number().int().min(0).max(99).optional()),
    roof_type: teksOpsional,
    wall_type: teksOpsional,
    foundation_type: teksOpsional,

    status: z.enum(["draft", "published", "archived"]),
    needs_review: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  })
  .refine((v) => v.sold_subsidi_units <= v.subsidi_units, {
    message: "Unit subsidi terjual melebihi total unit subsidi",
    path: ["sold_subsidi_units"],
  })
  .refine((v) => v.sold_commercial_units <= v.commercial_units, {
    message: "Unit komersial terjual melebihi total unit komersial",
    path: ["sold_commercial_units"],
  })
  .refine((v) => v.price_max == null || v.price_min == null || v.price_max >= v.price_min, {
    message: "Harga maksimum tidak boleh lebih kecil dari harga minimum",
    path: ["price_max"],
  })
  // housings_published_ck menegakkan hal yang sama di basis data; di sini
  // dilakukan lebih dulu agar pesannya bisa dibaca manusia.
  .refine((v) => v.status !== "published" || v.price_min != null, {
    message: "Perumahan tidak bisa dipublikasikan tanpa harga minimum",
    path: ["price_min"],
  })
  .refine((v) => v.status !== "published" || v.subsidi_units + v.commercial_units > 0, {
    message: "Perumahan tidak bisa dipublikasikan tanpa data jumlah unit",
    path: ["subsidi_units"],
  })

export type HousingInput = z.infer<typeof HousingSchema>

export const ContactSchema = z.object({
  name: z.string().trim().min(2, "Nama kontak minimal 2 karakter").max(120),
  phone: z.preprocess(
    kosongJadiUndefined,
    z
      .string()
      .regex(/^[0-9+][0-9 ()+-]{7,19}$/, "Format nomor telepon tidak valid")
      .optional(),
  ),
  email: z.preprocess(kosongJadiUndefined, z.string().email("Format email tidak valid").optional()),
  role_label: z.preprocess(kosongJadiUndefined, z.string().trim().max(60).optional()),
})
