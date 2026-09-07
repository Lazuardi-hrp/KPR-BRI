"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import WhatsAppCta from "@/components/whatsapp-cta"
import { formatIDR } from "@/lib/format"
import { tautanProperti } from "@/lib/whatsapp"

/**
 * Dok kontak untuk layar kecil di halaman detail perumahan.
 *
 * Di atas `lg` sidebar kalkulator menempel di layar sepanjang halaman, jadi
 * baik simulasi maupun formulirnya selalu terjangkau. Di bawah `lg` sidebar
 * itu jatuh ke DASAR halaman, di belakang spesifikasi, kontak, dan seluruh
 * galeri — seseorang yang membaca di ponsel bisa menggulir satu layar penuh
 * tanpa satu pun cara menghubungi siapa pun. Dok ini yang mengisinya.
 *
 * Dua hal yang membuatnya tidak mengganggu, dan keduanya wajib:
 *
 *   * Ia belum ada sampai header terlewat. Menutupi bagian bawah layar sejak
 *     piksel pertama berarti mengambil ruang dari foto dan harga — dua hal
 *     yang justru sedang dinilai orang saat memutuskan mau bertanya atau
 *     tidak.
 *   * Ia menghilang begitu panel KPR terlihat. Menampilkan dua tombol
 *     "hubungi" yang saling menimpa pada layar yang sama membuat pengunjung
 *     berhenti untuk memilih di antara keduanya, dan formulir yang sudah ada
 *     di depan matanya kalah oleh batang yang menempel di atasnya.
 *
 * Polanya sengaja sama dengan StickyCta di beranda: dua IntersectionObserver,
 * satu untuk muncul dan satu untuk menyembunyikan.
 */

type Props = {
  housingId: string
  housingName: string
  slug?: string
  harga?: number | null
  /** Kontak pemasaran perumahan; kosong berarti hanya tombol formulir. */
  phone?: string | null
  /** Nomor tim pusat, cadangan bila perumahan belum punya kontak. */
  waPusat?: string | null
  /** Elemen yang harus terlewat lebih dulu. */
  after: string
  /**
   * Elemen yang menyembunyikannya lagi — panel KPR di halaman ini.
   *
   * WAJIB berbentuk pemilih id (`#ajukan`): nilainya dipakai dua kali, sebagai
   * argumen querySelector DAN sebagai href tombol "Ajukan KPR".
   */
  hideOver: string
}

export default function KontakDock({
  housingId,
  housingName,
  slug,
  harga,
  phone,
  waPusat,
  after,
  hideOver,
}: Props) {
  const [lewat, setLewat] = useState(false)
  const [diPanel, setDiPanel] = useState(false)

  useEffect(() => {
    const kepala = document.querySelector(after)
    const panel = document.querySelector(hideOver)
    const pengamat: IntersectionObserver[] = []

    if (kepala) {
      const o = new IntersectionObserver(
        ([e]) => setLewat(!e.isIntersecting && e.boundingClientRect.top < 0),
        { threshold: 0 },
      )
      o.observe(kepala)
      pengamat.push(o)
    }
    if (panel) {
      const o = new IntersectionObserver(([e]) => setDiPanel(e.isIntersecting), {
        threshold: 0,
      })
      o.observe(panel)
      pengamat.push(o)
    }
    return () => pengamat.forEach((o) => o.disconnect())
  }, [after, hideOver])

  const nomor = phone || waPusat || null

  return (
    <AnimatePresence>
      {lewat && !diPanel && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            {/*
              Harga menghilang di bawah `sm`, dan itu keputusan ruang yang
              diukur: dua tombol setinggi 44px memakai hampir seluruh lebar 390
              px, dan harga yang dipaksa masuk di sisa ruangnya terpotong
              menjadi "Rp 166.00…" — angka setengah jadi yang lebih buruk
              daripada tidak ada angka. Di atas `sm` ruangnya cukup dan harga
              kembali, karena kartu harga sudah lama tergulir hilang di titik
              dok ini muncul.
            */}
            {harga != null && harga > 0 && (
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="text-coord text-muted-foreground">Harga mulai</p>
                <p className="numeric truncate text-sm font-extrabold text-foreground">
                  {formatIDR(harga)}
                </p>
              </div>
            )}

            {nomor && (
              <WhatsAppCta
                phone={nomor}
                niat="properti"
                housingId={housingId}
                varian="utama"
                ukuran="sm"
                label="WhatsApp"
                className="flex-1 sm:flex-none"
                konteks={{
                  perumahan: housingName,
                  harga,
                  tautan: tautanProperti(slug),
                }}
              />
            )}

            {/*
              Tautan jangkar sungguhan, bukan scrollIntoView di onClick: ia
              tetap bekerja sebelum JavaScript halaman ini selesai dimuat, dan
              #ajukan menjadi alamat yang bisa dibagikan.
            */}
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <a href={hideOver}>
                Ajukan KPR
                <ArrowRight />
              </a>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
