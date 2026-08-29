#!/usr/bin/env node
/**
 * Drives the real Chrome against a running dev server and photographs the hero.
 *
 *   node scripts/shoot-hero.mjs [url] [outdir]
 *
 * A build passing is not evidence that a WebGL scene renders. This opens the
 * page, waits for the canvas to actually paint pixels, and reports what the
 * browser saw: console errors, failed requests, draw calls, and whether the
 * poster or the model is on screen.
 */
import { mkdirSync } from "node:fs"
import puppeteer from "puppeteer-core"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const URL = process.argv[2] ?? "http://localhost:3000/"
const OUT = process.argv[3] ?? "/tmp/hero-shots"

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dsf: 2, mobile: false },
  { name: "tablet", width: 834, height: 1112, dsf: 2, mobile: false },
  { name: "mobile", width: 390, height: 844, dsf: 3, mobile: true },
]

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    // Headless Chrome has no GPU; SwiftShader gives it a real WebGL2 context.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
})

let failures = 0

for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.dsf,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  })

  const errors = []
  const requests = []
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))
  page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  page.on("response", (r) => {
    const u = new global.URL(r.url()).pathname
    if (/\.(glb|webp|png)$/.test(u) || /chunk|\.js$/.test(u)) requests.push({ u, status: r.status() })
  })

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 })

  // Wait for the canvas to exist and the app to declare the model ready (the
  // poster fades to 0 only once onReady has fired).
  let painted = false
  try {
    await page.waitForFunction(
      () => {
        const c = document.querySelector("canvas")
        const img = document.querySelector("#hero img[alt]")
        if (!c || !c.width || !c.height) return false
        return img ? getComputedStyle(img).opacity === "0" : true
      },
      { timeout: 30000, polling: 250 },
    )
    // Let the fade finish before photographing.
    await new Promise((r) => setTimeout(r, 900))
    painted = true
  } catch {
    painted = false
  }

  const state = await page.evaluate(() => {
    const panel = document.querySelector("#hero .rounded-\\[2\\.5rem\\]")
    const canvas = document.querySelector("canvas")
    const img = document.querySelector('#hero img[alt]')
    const r = (el) => (el ? el.getBoundingClientRect() : null)
    const cr = r(canvas)
    const pr = r(panel)
    return {
      hasCanvas: Boolean(canvas),
      canvasSize: cr ? `${Math.round(cr.width)}x${Math.round(cr.height)}` : null,
      canvasBacking: canvas ? `${canvas.width}x${canvas.height}` : null,
      panelSize: pr ? `${Math.round(pr.width)}x${Math.round(pr.height)}` : null,
      posterOpacity: img ? getComputedStyle(img).opacity : null,
      posterAlt: img ? img.getAttribute("alt") : null,
      canvasOpacity: canvas?.parentElement ? getComputedStyle(canvas.parentElement).opacity : null,
    }
  })

  const glb = requests.find((r) => r.u.includes("deret-rumah-subsidi"))

  console.log(`── ${vp.name} (${vp.width}x${vp.height} @${vp.dsf}x) ${"─".repeat(24)}`)
  console.log(`  canvas present : ${state.hasCanvas ? "yes" : "NO"}  ${state.canvasSize ?? ""} (backing ${state.canvasBacking ?? "-"})`)
  console.log(`  panel          : ${state.panelSize}`)
  console.log(`  handover       : ${painted ? "YES — poster faded, model shown" : "NO — poster still showing"}`)
  console.log(`  poster opacity : ${state.posterOpacity}   canvas layer opacity: ${state.canvasOpacity}`)
  console.log(`  GLB request    : ${glb ? `${glb.status} ${glb.u}` : "not requested"}`)
  if (errors.length) {
    console.log(`  errors:`)
    for (const e of [...new Set(errors)].slice(0, 6)) console.log(`    ! ${e.slice(0, 160)}`)
  }
  if (!painted || !state.hasCanvas) failures++

  const panel = await page.$("#hero .rounded-\\[2\\.5rem\\]")
  if (panel) await panel.screenshot({ path: `${OUT}/hero-${vp.name}.png` })
  const canvasEl = await page.$("canvas")
  if (canvasEl) {
    await canvasEl.screenshot({ path: `${OUT}/canvas-${vp.name}.png`, omitBackground: true })
    const { default: sharp } = await import("sharp")
    const st = await sharp(`${OUT}/canvas-${vp.name}.png`).stats()
    const alpha = st.channels[3]
    const covered = alpha ? (alpha.mean / 255) * 100 : 100
    const spread = st.channels[0].stdev
    console.log(`  canvas pixels  : ${covered.toFixed(1)}% covered, contrast σ=${spread.toFixed(1)} ${covered < 3 ? "  ← EMPTY" : ""}`)
    if (covered < 3) failures++
  }
  await page.screenshot({ path: `${OUT}/page-${vp.name}.png` })
  console.log(`  wrote          : ${OUT}/hero-${vp.name}.png`)
  console.log()

  await page.close()
}

await browser.close()
process.exit(failures ? 1 : 0)
