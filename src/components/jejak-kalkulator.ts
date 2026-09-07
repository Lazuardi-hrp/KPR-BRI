"use client"

import { useEffect, useRef } from "react"

import { catatPeristiwa } from "@/components/jejak"

/**
 * Mencatat 'pakai_kalkulator' pada perubahan masukan yang SUNGGUHAN.
 *
 * KENAPA BUKAN SAAT KOMPONEN TERPASANG
 * Kalkulator dirender di setiap halaman detail perumahan, terlihat atau tidak,
 * dipakai atau tidak. Mencatatnya saat terpasang akan membuat
 * "pakai kalkulator" menjadi salinan persis dari "lihat properti" — dua
 * batang corong dengan tinggi yang sama, dan tahap yang seharusnya paling
 * banyak bercerita tentang kebocoran berubah menjadi hiasan.
 *
 * KENAPA MEMBANDINGKAN NILAI, BUKAN MEMASANG DI SETIAP onChange
 * Ada enam masukan di /simulasi dan tiga di panel detail, ditambah penjepitan
 * otomatis ketika skema berganti. Menempelkan pemanggilan di masing-masing
 * berarti sembilan tempat yang harus diingat, dan yang kesepuluh — yang
 * ditambahkan enam bulan lagi — tidak akan diingat. Membandingkan seluruh
 * masukan dengan nilai awalnya menangkap semuanya, termasuk yang belum ada.
 *
 * Pemanggilan berulang aman: catatPeristiwa membuang duplikat per sesi per
 * perumahan. Mengganti perumahan di /simulasi memang dicatat lagi, dan itu
 * benar — menghitung cicilan untuk rumah yang berbeda adalah pemakaian yang
 * berbeda.
 */
export function useJejakKalkulator(
  housingId: string | null,
  masukan: ReadonlyArray<number | string>,
): void {
  const awal = useRef<string | null>(null)
  const kunci = masukan.join("|")

  useEffect(() => {
    // Render pertama hanya menetapkan garis dasar; belum ada yang menyentuh
    // apa pun. Nilai awal di /simulasi bisa datang dari ?perumahan=<slug>,
    // dan tautan yang dibuka bukanlah kalkulator yang dipakai.
    if (awal.current === null) {
      awal.current = kunci
      return
    }
    if (kunci === awal.current) return
    catatPeristiwa("pakai_kalkulator", housingId)
  }, [kunci, housingId])
}
