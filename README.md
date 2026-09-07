This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend — Supabase

Sumber data aplikasi adalah PostgreSQL terkelola di Supabase, bukan lagi
`localStorage`. Yang perlu diketahui sebelum menyentuh lapisan ini:

- **Migrasi ada di `supabase/migrations/`**, dijalankan berurutan dan hanya maju.
  Jangan mengubah skema lewat Studio di produksi — perubahan yang tidak masuk
  Git akan hilang saat lingkungan dibangun ulang.
- **`available_units` adalah generated column.** Nilainya
  `(subsidi + komersial) − (terjual subsidi + terjual komersial)` dan tidak bisa
  diisi manusia. Inilah sebabnya "0% Tersedia" pada 15 perumahan dan "562%" pada
  satu perumahan tidak mungkin terjadi lagi — basis data yang menolaknya, bukan
  disiplin aplikasi.
- **Dua klien Supabase, sengaja berbeda.** `src/lib/supabase/anon.ts` bebas
  cookie dan dipakai seluruh pembacaan publik; itulah yang membuat
  `export const revalidate = 300` benar-benar berlaku. Begitu sebuah RSC
  memanggil `cookies()`, rutenya menjadi dinamis dan ISR mati. `@supabase/ssr`
  (`server.ts`) hanya dipakai di `/admin`.
- **Otorisasi ada di basis data.** RLS aktif di 12 dari 12 tabel, ditambah GRANT
  tingkat tabel sebagai lapis pertama. Middleware hanya mengarahkan pengguna;
  ia tidak pernah menjadi penjaga satu-satunya.
- **Tipe dibangkitkan dari basis data** ke `src/lib/database.types.ts`.
  Bangkitkan ulang setelah setiap migrasi. `src/lib/housing.ts` menjembatani
  bentuk snake_case basis data ke view model camelCase yang dipakai komponen,
  sehingga JSX yang dibekukan `design.md` tidak perlu ditulis ulang.

Perintah:

```bash
npm run dev              # butuh .env.local — lihat .env.example
npm run build            # /, /map, dan 16 halaman detail dipra-render (ISR 5 menit)
npm run check:secrets    # memastikan tidak ada nilai rahasia di bundel klien
npm run admin:promote -- email@bri.co.id     # naikkan akun jadi admin
npm run images:upload    # migrasi seed satu kali; foto sehari-hari dikelola di /admin/perumahan/{id}
```

Dokumen operasional:

- **`docs/RUNBOOK.md`** — membuat/mencabut akun, migrasi, jadwal cron,
  catatan keamanan, dan batasan yang belum teratasi.
- **`docs/DATA-TODO.md`** — data yang masih harus diisi tim BRI. Ke-16
  perumahan bertanda `needs_review` sampai angkanya dikonfirmasi.
- **`supabase/tests/rls_scenarios.sql`** — sebelas skenario keamanan PRD §17.2.
  Jalankan setiap sebelum rilis.

> **Data saat ini belum terverifikasi.** Angka unit diturunkan dari data lama,
> kontak masih placeholder, dan tiga perumahan berbagi koordinat yang sama.
> Semuanya tercatat di `docs/DATA-TODO.md`. Struktur datanya sudah benar;
> isinya belum.

## Design system — ATLAS SIANTAR

The frontend follows `design.md`. A few things worth knowing before you edit:

- **All theming is CSS-first** in `src/app/globals.css` — there is no `tailwind.config.ts`.
  Tokens live in `:root` and are exposed to Tailwind through `@theme inline`. Use the
  tokens (`bg-ink`, `text-mist-200`, `shadow-e3`, `text-ok`) rather than raw hex or
  off-palette Tailwind colours.
- **Coordinates are a design element.** `<Coord lat lng />` renders the same micro-label
  everywhere it appears — cards, popup, map sidebar, atlas strip, hero.
- **One hover treatment:** the `.lift` class (-4px, image to 1.05). Don't add new
  `hover:-translate-y-*` values.
- **Above-the-fold entrances are CSS** (`.rise`, `.word-mask`), not Framer. Framer's
  `initial` ships `opacity:0` in the static HTML and holds LCP until hydration.

### Regenerating image assets

Photographs in `public/kpr-assets/` are cropped to 4:3 and re-encoded, and
`src/lib/image-blur.ts` holds their 12px LQIP placeholders. After adding or replacing a
photo, regenerate the blur map:

```bash
node -e "
const sharp=require('sharp'), fs=require('fs');
(async()=>{
  const dir='public/kpr-assets', out={};
  for (const f of fs.readdirSync(dir).sort())
    out['/kpr-assets/'+f]='data:image/webp;base64,'+(await sharp(dir+'/'+f).resize(12,9,{fit:'cover'}).webp({quality:35}).toBuffer()).toString('base64');
  out['/rumah.webp']='data:image/webp;base64,'+(await sharp('public/rumah.webp').resize(12,12,{fit:'inside'}).webp({quality:35}).toBuffer()).toString('base64');
  fs.writeFileSync('src/lib/image-blur.ts',
    '// AUTO-GENERATED — 12px WebP LQIP placeholders for every shipped photograph.\n'+
    '// Regenerate with the sharp snippet documented in README if the assets change.\n\n'+
    'export const blurMap: Record<string, string> = {\n'+
    Object.entries(out).map(([k,v])=>'  '+JSON.stringify(k)+': '+JSON.stringify(v)+',').join('\n')+
    '\n}\n\n/** Blur placeholder for a public image path, or undefined when none exists. */\n'+
    'export const blurFor = (src?: string) => (src ? blurMap[src] : undefined)\n');
})();"
```

The original, untouched logo artwork stays at `public/logobri.png` / `public/logokpr.png`;
the trimmed, resized `.webp` variants are what the app renders.

## The hero model

The hero panel renders `public/models/deret-rumah-subsidi.glb` — a row of five
subsidised units — through `src/components/hero-visual.tsx`. See the
"hero survey model" amendment in `design.md` §2.2 for the art direction.

`assets/deret-rumah-subsidi.glb` is the raw export and is never served. The
shipped file is produced from it and committed:

```bash
npm run model:optimize   # assets/ -> public/models/, prints a before/after table
npm run model:verify     # loads the result through three.js and checks it
```

`scripts/optimize-model.mjs` follows the official `gltf-transform optimize`
order — `dedup → instance → flatten → join → weld → prune → textureCompress →
meshopt` — with two project-specific passes: the bump maps are rewritten as
256px greyscale (they tile 6–30×, so the RGBA 512² PNGs carried nothing), and
`doubleSided` is cleared on primitives *proven* to be closed manifolds rather
than guessed at by material name.

`scripts/ext-materials-bump.mjs` exists because `@gltf-transform/extensions@4`
ships no class for `EXT_materials_bump`, and the core reader silently drops any
unregistered extension. Without it, `prune()` would delete the three textures
that are only reachable through `bumpTexture` and every wall, kerb, roof-tile
and bark surface would flatten out. three.js reads the extension natively, so
round-tripping it here is all the runtime needs.

Result: **3.75 MB → 373 KB** and **801 → 40 draw calls**, with all 47,932
rasterised triangles kept (32 nodes are GPU-instanced, drawing 612 copies).

The model is the hero's subject on every screen size, phones included.
`/rumah.webp` is only ever a stand-in: it is painted first so it can carry the
LCP, then hands over to the canvas as soon as there are pixels.

What keeps it off the critical path is an ordering guarantee rather than a
timeout — the canvas is not allowed to mount until the poster has decoded and
had a frame to show itself, because spinning up a WebGL context is main-thread
heavy enough to delay the very paint it replaces. `npm run hero:test` asserts
that ordering at 1x, 4x and 6x CPU throttle.

The poster stays for good only where the model genuinely cannot be drawn: no
WebGL, `saveData` set, the GLB failing to load, or the GPU dropping the context.

Two browser checks run against a real Chrome (`puppeteer-core` drives the
installed one; no browser download):

```bash
npm run hero:shoot   # photographs the hero at 3 viewports
npm run hero:test    # fallback matrix + poster-before-canvas ordering
```

`hero-model.tsx` applies one art-direction pass on load: a minimum linear albedo
of 0.05. The exporter authored `genteng-gelap` at ~1.8% reflectance, so with no
environment map the roof rendered as a black void that swallowed the tile bump.
Exactly one material is below that floor; the door reveals (0.052) stay dark
because they are meant to be.
