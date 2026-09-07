"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  GripVertical,
  ImageOff,
  ImagePlus,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { publicImageUrl } from "@/lib/supabase/storage-url"
import { siapkanUnggahan } from "@/lib/images/browser"
import {
  ACCEPT_FOTO,
  MAKS_ALT,
  MAKS_FOTO,
  periksaBerkas,
  type FotoPerumahan,
} from "@/lib/schemas/image"
import { hapusFoto, jadikanSampul, ubahAltFoto, urutkanFoto } from "@/app/admin/actions"

/**
 * Pengelola galeri foto perumahan.
 *
 * SUMBER KEBENARAN. Komponen ini memegang salinan lokal daftar foto dan
 * memperbaruinya optimistis, karena menyeret foto lalu menunggu perjalanan
 * bolak-balik server sebelum kartunya bergerak terasa rusak. Setiap aksi yang
 * berhasil ditutup dengan router.refresh(): server tetap yang menentukan, dan
 * lencana verifikasi di halaman ini ikut berubah karena unggahan (trigger
 * housing_images_touch, migrasi 0016) — hanya server yang tahu itu.
 *
 * Setiap aksi yang GAGAL mengembalikan daftar ke keadaan sebelumnya. Tanpa itu,
 * layar akan memperlihatkan urutan yang tidak pernah tersimpan, dan admin baru
 * mengetahuinya saat membuka halaman publik.
 *
 * SATU ANTREAN. Unggahan dijalankan berurutan, bukan paralel. Alasannya bukan
 * kerapian: trigger housing_images_defaults memberi sampul kepada foto pertama
 * dengan membaca "apakah sudah ada sampul", dan dua penyisipan serentak pada
 * perumahan kosong akan sama-sama menjawab "belum" lalu melanggar
 * housing_images_one_cover_uq. Berurutan juga membuat sort_order dapat ditebak
 * dan bilah kemajuan berarti sesuatu di jaringan seluler.
 */

type Antrean = {
  key: string
  nama: string
  pratinjau: string
  status: "menunggu" | "unggah" | "gagal"
  pesan?: string
}

export default function ImageManager({
  housingId,
  housingName,
  awal,
  status,
}: {
  housingId: string
  housingName: string
  awal: FotoPerumahan[]
  status: "draft" | "published" | "archived"
}) {
  const [foto, setFoto] = useState<FotoPerumahan[]>(awal)
  const [antrean, setAntrean] = useState<Antrean[]>([])
  const [galat, setGalat] = useState("")
  const [kabar, setKabar] = useState("")
  const [seret, setSeret] = useState(false)
  const [pratinjauPublik, setPratinjauPublik] = useState(false)
  const [sibuk, mulai] = useTransition()
  const router = useRouter()

  const inputRef = useRef<HTMLInputElement>(null)
  const gantiRef = useRef<HTMLInputElement>(null)
  const gantiIdRef = useRef<string | null>(null)
  const urlHidup = useRef<Set<string>>(new Set())

  // Daftar dari server menang setiap kali halaman disegarkan. Tanpa ini,
  // penyimpanan di formulir lain pada halaman yang sama (yang memicu refresh)
  // akan membuat galeri membeku pada salinan lokalnya.
  //
  // Penyelarasan saat render, bukan useEffect: props RSC hanya berubah
  // identitasnya ketika muatan server yang baru tiba, jadi perbandingan ini
  // salah pada setiap render sisi klien biasa. Versi useEffect-nya akan
  // menggambar satu bingkai dengan data lama lebih dulu — cukup untuk membuat
  // kartu foto berkedip ke urutan sebelumnya setelah setiap penyimpanan.
  const [awalTerakhir, setAwalTerakhir] = useState(awal)
  if (awalTerakhir !== awal) {
    setAwalTerakhir(awal)
    setFoto(awal)
  }

  const sampul = foto.find((f) => f.is_cover)
  const penuh = foto.length + antrean.length >= MAKS_FOTO

  // ── Unggah ────────────────────────────────────────────────────────────

  const unggahSatu = useCallback(
    async (file: File, gantiId?: string) => {
      const fd = new FormData()
      fd.set("file", await siapkanUnggahan(file))
      if (gantiId) fd.set("gantiId", gantiId)

      const res = await fetch(`/api/admin/perumahan/${housingId}/gambar`, {
        method: "POST",
        body: fd,
      })

      // Batas badan permintaan platform dijawab sebelum route handler jalan,
      // dan jawabannya HTML — bukan JSON. res.json() di situ melempar galat
      // sintaks yang tidak berarti apa-apa bagi admin.
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ??
            (res.status === 413
              ? "Berkas terlalu besar untuk diunggah."
              : "Unggahan gagal. Periksa koneksi lalu coba lagi."),
        )
      }
      return data.foto as FotoPerumahan
    },
    [housingId],
  )

  const terimaBerkas = useCallback(
    (daftar: FileList | File[]) => {
      setGalat("")
      const berkas = Array.from(daftar)
      if (berkas.length === 0) return

      const sisa = MAKS_FOTO - foto.length - antrean.length
      if (sisa <= 0) {
        setGalat(`Batas ${MAKS_FOTO} foto per perumahan sudah tercapai.`)
        return
      }

      const diterima: File[] = []
      const keluhan: string[] = []
      for (const f of berkas) {
        const k = periksaBerkas(f)
        if (k) keluhan.push(k)
        else if (diterima.length < sisa) diterima.push(f)
        else keluhan.push(`${f.name}: melebihi batas ${MAKS_FOTO} foto.`)
      }
      if (keluhan.length) setGalat(keluhan.join(" "))
      if (diterima.length === 0) return

      const baru: Antrean[] = diterima.map((f, i) => {
        const pratinjau = URL.createObjectURL(f)
        urlHidup.current.add(pratinjau)
        return { key: `${Date.now()}-${i}-${f.name}`, nama: f.name, pratinjau, status: "menunggu" }
      })
      setAntrean((a) => [...a, ...baru])

      // Sengaja tidak dibungkus startTransition: antrean ini hidup lebih lama
      // daripada satu transisi, dan bilah kemajuannya harus tetap responsif.
      void (async () => {
        for (let i = 0; i < diterima.length; i++) {
          const key = baru[i].key
          setAntrean((a) => a.map((x) => (x.key === key ? { ...x, status: "unggah" } : x)))
          try {
            const hasil = await unggahSatu(diterima[i])
            setFoto((f) => [...f, hasil])
            setAntrean((a) => {
              const keluar = a.find((x) => x.key === key)
              if (keluar) {
                URL.revokeObjectURL(keluar.pratinjau)
                urlHidup.current.delete(keluar.pratinjau)
              }
              return a.filter((x) => x.key !== key)
            })
          } catch (e) {
            setAntrean((a) =>
              a.map((x) =>
                x.key === key
                  ? { ...x, status: "gagal", pesan: e instanceof Error ? e.message : "Gagal." }
                  : x,
              ),
            )
          }
        }
        setKabar("Foto tersimpan.")
        router.refresh()
      })()
    },
    [antrean.length, foto.length, router, unggahSatu],
  )

  // Object URL yang tidak pernah dicabut menahan berkasnya di memori sampai
  // tab ditutup. Yang berhasil dicabut di atas; ini menjaring yang gagal dan
  // masih tersisa saat komponen dilepas.
  //
  // Lewat ref, bukan lewat setAntrean di dalam cleanup: fungsi pembaru state
  // pada komponen yang sedang dilepas tidak dijamin pernah dijalankan React,
  // dan bila tidak, URL-nya justru tidak pernah dicabut sama sekali —
  // kebalikan dari maksud cleanup ini.
  useEffect(
    () => () => {
      urlHidup.current.forEach((u) => URL.revokeObjectURL(u))
      urlHidup.current.clear()
    },
    [],
  )

  // ── Aksi per foto ─────────────────────────────────────────────────────

  const jalankan = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    pesanSukses: string,
    pulihkan?: () => void,
  ) => {
    setGalat("")
    setKabar("")
    mulai(async () => {
      const h = await fn()
      if (!h.ok) {
        pulihkan?.()
        setGalat(h.error ?? "Gagal.")
        return
      }
      setKabar(pesanSukses)
      router.refresh()
    })
  }

  const pilihSampul = (id: string) => {
    const sebelum = foto
    setFoto((f) => f.map((x) => ({ ...x, is_cover: x.id === id })))
    jalankan(
      () => jadikanSampul(id, housingId),
      "Foto sampul diperbarui.",
      () => setFoto(sebelum),
    )
  }

  const hapus = (f: FotoPerumahan) => {
    if (!confirm("Hapus foto ini? Berkasnya ikut dihapus dari penyimpanan dan tidak bisa dipulihkan."))
      return
    const sebelum = foto
    // Sampul yang dihapus digantikan foto terdepan — cerminan persis apa yang
    // dilakukan delete_housing_image di basis data, supaya layar tidak
    // menampilkan galeri tanpa sampul selama satu perjalanan server.
    const sisa = foto.filter((x) => x.id !== f.id)
    if (f.is_cover && sisa.length > 0) sisa[0] = { ...sisa[0], is_cover: true }
    setFoto(sisa)
    jalankan(
      () => hapusFoto(f.id, housingId),
      "Foto dihapus.",
      () => setFoto(sebelum),
    )
  }

  const simpanUrutan = (urut: FotoPerumahan[]) => {
    const sebelum = foto
    setFoto(urut)
    jalankan(
      () => urutkanFoto(housingId, urut.map((f) => f.id)),
      "Urutan tersimpan.",
      () => setFoto(sebelum),
    )
  }

  const geser = (dari: number, ke: number) => {
    if (ke < 0 || ke >= foto.length || dari === ke) return
    const urut = [...foto]
    const [pindah] = urut.splice(dari, 1)
    urut.splice(ke, 0, pindah)
    simpanUrutan(urut)
  }

  const simpanAlt = (f: FotoPerumahan, alt: string) => {
    const bersih = alt.trim()
    if (bersih === f.alt) return
    const sebelum = foto
    setFoto((x) => x.map((y) => (y.id === f.id ? { ...y, alt: bersih } : y)))
    jalankan(
      () => ubahAltFoto(f.id, housingId, bersih),
      "Teks alternatif tersimpan.",
      () => setFoto(sebelum),
    )
  }

  const mintaGanti = (id: string) => {
    gantiIdRef.current = id
    gantiRef.current?.click()
  }

  const jalankanGanti = (file: File) => {
    const id = gantiIdRef.current
    gantiIdRef.current = null
    if (!id) return
    const keluhan = periksaBerkas(file)
    if (keluhan) {
      setGalat(keluhan)
      return
    }
    setGalat("")
    mulai(async () => {
      try {
        const hasil = await unggahSatu(file, id)
        setFoto((f) => f.map((x) => (x.id === id ? hasil : x)))
        setKabar("Foto diganti.")
        router.refresh()
      } catch (e) {
        setGalat(e instanceof Error ? e.message : "Gagal mengganti foto.")
      }
    })
  }

  // ── Seret untuk mengurutkan ───────────────────────────────────────────
  //
  // HTML5 drag-and-drop, bukan pustaka. Yang dibutuhkan hanya memindahkan
  // kartu di dalam satu daftar, dan tombol panah di setiap kartu sudah
  // menyediakan jalur papan-ketik yang setara — jadi ketergantungan tambahan
  // di sini hanya menambah bobot bundel tanpa menambah kemampuan.

  const seretDari = useRef<number | null>(null)
  const urutSebelumSeret = useRef<FotoPerumahan[] | null>(null)

  const mulaiSeret = (i: number) => {
    seretDari.current = i
    urutSebelumSeret.current = foto
  }

  const lewatiSeret = (i: number) => {
    const dari = seretDari.current
    if (dari === null || dari === i) return
    setFoto((f) => {
      const urut = [...f]
      const [pindah] = urut.splice(dari, 1)
      urut.splice(i, 0, pindah)
      return urut
    })
    seretDari.current = i
  }

  const selesaiSeret = () => {
    const awalUrut = urutSebelumSeret.current
    seretDari.current = null
    urutSebelumSeret.current = null
    if (!awalUrut) return
    const berubah = foto.some((f, i) => f.id !== awalUrut[i]?.id)
    if (!berubah) return
    const urut = foto
    setFoto(awalUrut)
    simpanUrutan(urut)
  }

  // ── Tampilan ──────────────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Galeri foto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {foto.length} dari {MAKS_FOTO} foto. Foto pertama menjadi sampul — itulah yang tampil
            di beranda, peta, dan hasil pencarian.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {foto.length > 0 && (
            <button
              type="button"
              onClick={() => setPratinjauPublik((v) => !v)}
              aria-pressed={pratinjauPublik}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Eye className="h-4 w-4" />
              {pratinjauPublik ? "Tutup pratinjau" : "Pratinjau publik"}
            </button>
          )}
          <Button type="button" size="sm" disabled={penuh} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Tambah foto
          </Button>
        </div>
      </div>

      {/* Satu input untuk tambah, satu untuk ganti. Digabung, atribut multiple
          milik "tambah" akan ikut terbawa ke "ganti" dan admin bisa memilih
          lima berkas untuk menggantikan satu foto. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_FOTO}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) terimaBerkas(e.target.files)
          e.target.value = ""
        }}
      />
      <input
        ref={gantiRef}
        type="file"
        accept={ACCEPT_FOTO}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) jalankanGanti(f)
          e.target.value = ""
        }}
      />

      {/* Status publikasi yang bergantung pada foto. ubahStatusPerumahan()
          menolak menerbitkan tanpa sampul; memberitahukannya di sini lebih
          baik daripada membiarkan admin menemukannya lewat pesan galat. */}
      {foto.length === 0 && status !== "published" && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warn/25 bg-warn-50 p-3 text-sm font-medium text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Perumahan tidak bisa diterbitkan sebelum punya minimal satu foto sampul.
        </p>
      )}

      {galat && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {galat}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {kabar}
      </p>

      {/* ── Zona lepas ── */}
      <div
        onDragOver={(e) => {
          // types memuat "Files" hanya bila yang diseret datang dari luar
          // jendela. Tanpa penjagaan ini, zona lepas ikut menyala setiap kali
          // kartu foto diseret melintasinya saat mengurutkan galeri.
          if (!e.dataTransfer.types.includes("Files")) return
          e.preventDefault()
          setSeret(true)
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSeret(false)
          // dataTransfer.files kosong saat yang diseret adalah kartu foto di
          // dalam galeri ini, bukan berkas dari luar jendela.
          if (e.dataTransfer.files?.length) terimaBerkas(e.dataTransfer.files)
        }}
        className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          seret ? "border-primary bg-accent" : "border-border bg-secondary/60"
        }`}
      >
        <Upload className={`mx-auto h-6 w-6 ${seret ? "text-primary" : "text-muted-foreground"}`} />
        <p className="mt-2 text-sm font-semibold text-foreground">
          Seret foto ke sini, atau{" "}
          <button
            type="button"
            disabled={penuh}
            onClick={() => inputRef.current?.click()}
            className="text-primary underline underline-offset-2 hover:text-brand-deep disabled:no-underline disabled:opacity-50"
          >
            pilih dari perangkat
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP, atau AVIF · minimal 800×600 piksel · maksimal 20 MB per berkas.
          Foto diciutkan otomatis ke WebP 1600px sebelum tayang.
        </p>
      </div>

      {/* ── Antrean unggah ── */}
      {antrean.length > 0 && (
        <ul className="mt-4 space-y-2">
          {antrean.map((a) => (
            <li
              key={a.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5"
            >
              {/* Pratinjau berasal dari blob: URL lokal — next/image tidak bisa
                  mengoptimalkannya, dan tidak perlu: berkasnya sudah di perangkat. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.pratinjau}
                alt=""
                className="h-11 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.nama}</p>
                {a.status === "gagal" ? (
                  <p className="text-xs font-medium text-danger">{a.pesan}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {a.status === "unggah" ? "Mengunggah dan mengoptimalkan…" : "Menunggu giliran"}
                  </p>
                )}
              </div>
              {a.status === "gagal" ? (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(a.pratinjau)
                    urlHidup.current.delete(a.pratinjau)
                    setAntrean((x) => x.filter((y) => y.key !== a.key))
                  }}
                  className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Buang ${a.nama} dari antrean`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <Loader2
                  className={`h-4 w-4 text-primary ${a.status === "unggah" ? "animate-spin" : "opacity-40"}`}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Pratinjau publik ── */}
      {pratinjauPublik && foto.length > 0 && (
        <PratinjauPublik foto={foto} nama={housingName} />
      )}

      {/* ── Kisi foto ── */}
      {foto.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-secondary/40 py-10 text-center">
          <ImageOff className="h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">Belum ada foto</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Perumahan tanpa foto tampil sebagai kotak kosong di beranda dan popup peta.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {foto.map((f, i) => (
            <KartuFoto
              key={f.id}
              foto={f}
              indeks={i}
              total={foto.length}
              sibuk={sibuk}
              nama={housingName}
              onSeretMulai={() => mulaiSeret(i)}
              onSeretLewat={() => lewatiSeret(i)}
              onSeretSelesai={selesaiSeret}
              onSampul={() => pilihSampul(f.id)}
              onGeser={(arah) => geser(i, i + arah)}
              onGanti={() => mintaGanti(f.id)}
              onHapus={() => hapus(f)}
              onAlt={(alt) => simpanAlt(f, alt)}
            />
          ))}
        </ul>
      )}

      {foto.length > 1 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Seret kartu untuk mengurutkan, atau pakai tombol panah pada setiap kartu. Urutan ini
          dipakai persis oleh galeri di halaman publik.
        </p>
      )}

      {sampul && (
        <p className="mt-2 text-xs text-muted-foreground">
          Mengganti sampul menurunkan status verifikasi perumahan ini menjadi
          &ldquo;perlu pembaruan&rdquo; — foto adalah salah satu bidang yang diverifikasi petugas.
        </p>
      )}
    </section>
  )
}

// ─────────────────────────── Kartu ───────────────────────────

function KartuFoto({
  foto,
  indeks,
  total,
  sibuk,
  nama,
  onSeretMulai,
  onSeretLewat,
  onSeretSelesai,
  onSampul,
  onGeser,
  onGanti,
  onHapus,
  onAlt,
}: {
  foto: FotoPerumahan
  indeks: number
  total: number
  sibuk: boolean
  nama: string
  onSeretMulai: () => void
  onSeretLewat: () => void
  onSeretSelesai: () => void
  onSampul: () => void
  onGeser: (arah: -1 | 1) => void
  onGanti: () => void
  onHapus: () => void
  onAlt: (alt: string) => void
}) {
  const src = publicImageUrl(foto.storage_path)
  const [alt, setAlt] = useState(foto.alt)

  // Nilai dari server menang setelah simpan, ganti, atau muat ulang — tetapi
  // hanya ketika nilainya benar-benar berubah, supaya ketikan yang sedang
  // berjalan tidak terhapus oleh refresh yang kebetulan lewat.
  const [altServer, setAltServer] = useState(foto.alt)
  if (altServer !== foto.alt) {
    setAltServer(foto.alt)
    setAlt(foto.alt)
  }

  const aksi =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-muted-foreground shadow-e2 backdrop-blur-sm transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <li
      draggable={total > 1}
      onDragStart={(e) => {
        // Firefox menolak memulai seret tanpa muatan apa pun di dataTransfer.
        e.dataTransfer.setData("text/plain", foto.id)
        e.dataTransfer.effectAllowed = "move"
        onSeretMulai()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        onSeretLewat()
      }}
      onDragEnd={onSeretSelesai}
      onDrop={(e) => {
        e.preventDefault()
        onSeretSelesai()
      }}
      className="group overflow-hidden rounded-2xl border border-border bg-white shadow-e1"
    >
      <div className="relative aspect-[4/3] bg-secondary">
        {src && (
          <Image
            src={src}
            alt={foto.alt || nama}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            placeholder={foto.blur_data_url ? "blur" : "empty"}
            blurDataURL={foto.blur_data_url ?? undefined}
            className="object-cover"
          />
        )}

        {foto.is_cover && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-brand-orange px-2.5 py-1 text-xs font-bold text-brand-orange-fg shadow-e2">
            <Star className="h-3 w-3 fill-current" /> Sampul
          </span>
        )}

        {total > 1 && (
          <span
            aria-hidden
            className="absolute right-2.5 top-2.5 flex h-7 items-center gap-1 rounded-full bg-white/95 px-2 text-xs font-semibold text-muted-foreground shadow-e2 backdrop-blur-sm"
          >
            <GripVertical className="h-3.5 w-3.5" /> {indeks + 1}
          </span>
        )}

        {/* Tetap terlihat pada perangkat sentuh (yang tidak punya hover) dan
            saat salah satu tombolnya menerima fokus papan-ketik. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent p-2.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            className={aksi}
            disabled={sibuk || indeks === 0}
            onClick={() => onGeser(-1)}
            aria-label="Pindahkan foto ke kiri"
            title="Pindahkan ke kiri"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={aksi}
            disabled={sibuk || indeks === total - 1}
            onClick={() => onGeser(1)}
            aria-label="Pindahkan foto ke kanan"
            title="Pindahkan ke kanan"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${aksi} ${foto.is_cover ? "text-brand-orange-ink" : ""}`}
            disabled={sibuk || foto.is_cover}
            onClick={onSampul}
            aria-label={foto.is_cover ? "Foto ini sudah menjadi sampul" : "Jadikan foto sampul"}
            title={foto.is_cover ? "Sudah menjadi sampul" : "Jadikan sampul"}
          >
            <Star className={`h-4 w-4 ${foto.is_cover ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            className={aksi}
            disabled={sibuk}
            onClick={onGanti}
            aria-label="Ganti berkas foto ini"
            title="Ganti berkas"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${aksi} hover:text-danger`}
            disabled={sibuk}
            onClick={onHapus}
            aria-label="Hapus foto"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <label className="block">
          <span className="sr-only">Teks alternatif foto {indeks + 1}</span>
          <input
            value={alt}
            maxLength={MAKS_ALT}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={() => onAlt(alt)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            placeholder="Teks alternatif (mis. tampak depan rumah tipe 36)"
            className="h-9 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <p className="numeric flex items-center gap-2 text-xs text-muted-foreground">
          {foto.width && foto.height ? `${foto.width}×${foto.height}` : "dimensi tidak tercatat"}
          {foto.bytes ? ` · ${(foto.bytes / 1024).toFixed(0)} KB` : ""}
          {foto.blur_data_url && (
            <span className="inline-flex items-center gap-1 text-ok" title="Punya placeholder blur">
              <Check className="h-3 w-3" /> LQIP
            </span>
          )}
        </p>
      </div>
    </li>
  )
}

// ─────────────────────────── Pratinjau ───────────────────────────

/**
 * Cerminan galeri halaman publik.
 *
 * Rasio, urutan, dan pilihan sampulnya sama persis dengan
 * components/property-gallery.tsx. Gunanya satu: menjawab "akan kelihatan
 * seperti apa" tanpa harus menerbitkan perumahannya dulu untuk mengetahuinya.
 */
function PratinjauPublik({ foto, nama }: { foto: FotoPerumahan[]; nama: string }) {
  const [aktif, setAktif] = useState(0)
  const urut = [...foto].sort((a, b) => Number(b.is_cover) - Number(a.is_cover))
  const kini = urut[Math.min(aktif, urut.length - 1)]
  const src = publicImageUrl(kini.storage_path)

  return (
    <div className="mt-5 rounded-2xl border border-border bg-secondary/60 p-4">
      <p className="text-coord mb-3 text-muted-foreground">
        Pratinjau — seperti yang dilihat pengunjung di halaman perumahan
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="relative aspect-[4/3] w-full bg-secondary sm:aspect-[16/9]">
          {src && (
            <Image
              src={src}
              alt={kini.alt || nama}
              fill
              sizes="(max-width: 1024px) 100vw, 768px"
              placeholder={kini.blur_data_url ? "blur" : "empty"}
              blurDataURL={kini.blur_data_url ?? undefined}
              className="object-cover"
            />
          )}
        </div>
        {urut.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {urut.map((f, i) => {
              const t = publicImageUrl(f.storage_path)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAktif(i)}
                  aria-label={`Lihat foto ${i + 1}`}
                  aria-current={i === aktif}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    i === aktif ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {t && <Image src={t} alt="" fill sizes="80px" className="object-cover" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
