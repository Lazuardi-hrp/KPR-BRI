import { z } from "zod"

/**
 * Validasi formulir minat.
 *
 * Batasan yang sama ditegakkan ulang oleh basis data (leads_name_ck,
 * leads_phone_ck) — ini lapis yang memberi pesan enak dibaca, bukan
 * satu-satunya penjaga.
 */
export const LeadSchema = z.object({
  housing_id: z.string().uuid("Perumahan tidak dikenali"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+][0-9 ()+-]{7,19}$/, "Nomor telepon tidak valid. Contoh: 0812 3456 7890"),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().email("Format email tidak valid").optional(),
  ),
  message: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(1000, "Pesan maksimal 1000 karakter").optional(),
  ),
  // Checkbox persetujuan. UU PDP mensyaratkan tindakan afirmatif — nilai
  // bawaannya tidak tercentang, dan tanpa centang ini pengiriman ditolak.
  consent: z.literal("on", { message: "Persetujuan wajib dicentang sebelum mengirim" }),
})

export type LeadInput = z.infer<typeof LeadSchema>
