#!/usr/bin/env node
/**
 * Exercises the hero's fallback matrix and LCP behaviour in a real browser.
 *
 *   node scripts/test-hero-fallbacks.mjs [url]
 *
 * Each case forces one condition before any page script runs, then asserts what
 * the user actually ends up looking at.
 */
import puppeteer from "puppeteer-core"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const URL = process.argv[2] ?? "http://localhost:3100/"

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
})

/** Returns what is on screen after the page settles. */
async function run({ name, expect, prepare, viewport, glbStatus }) {
  const page = await browser.newPage()
  await page.setViewport(viewport ?? { width: 1440, height: 900, deviceScaleFactor: 1 })

  if (glbStatus) {
    await page.setRequestInterception(true)
    page.on("request", (r) =>
      r.url().includes("deret-rumah-subsidi") ? r.respond({ status: glbStatus, body: "" }) : r.continue(),
    )
  }

  // Record the LCP element before anything else runs.
  await page.evaluateOnNewDocument(() => {
    window.__lcp = null
    new PerformanceObserver((list) => {
      const e = list.getEntries().at(-1)
      window.__lcp = { url: e.url || null, tag: e.element?.tagName ?? null, time: Math.round(e.startTime) }
    }).observe({ type: "largest-contentful-paint", buffered: true })
  })

  if (prepare) await page.evaluateOnNewDocument(prepare)

  const requested = []
  page.on("request", (r) => requested.push(new global.URL(r.url()).pathname))

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 })

  // Wait for the expected end state rather than sleeping: the first WebGL
  // context in a cold browser can take seconds under SwiftShader, and a fixed
  // delay turns that into a phantom failure. Poster cases still need a settle
  // window, since "poster" is also what a not-yet-loaded model looks like.
  if (expect === "model") {
    await page
      .waitForFunction(
        () => {
          const img = document.querySelector("#hero img[alt]")
          return Boolean(document.querySelector("canvas")) && img && getComputedStyle(img).opacity === "0"
        },
        { timeout: 45000, polling: 250 },
      )
      .catch(() => {})
  } else {
    await new Promise((r) => setTimeout(r, 8000))
  }

  // Overriding navigator/WebGL before load can leave the initial frame detached
  // once React hydrates; re-reading through the live frame avoids that.
  const frame = page.mainFrame()
  const result = await frame.evaluate(() => {
    const canvas = document.querySelector("canvas")
    const img = document.querySelector("#hero img[alt]")
    return {
      canvas: Boolean(canvas),
      posterVisible: img ? getComputedStyle(img).opacity !== "0" : false,
      lcp: window.__lcp,
    }
  })

  const gotGlb = requested.some((p) => p.includes("deret-rumah-subsidi"))
  const showing = result.canvas && !result.posterVisible ? "model" : "poster"
  const pass = showing === expect

  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name.padEnd(34)} showing: ${showing.padEnd(7)} glb fetched: ${gotGlb ? "yes" : "no "}  lcp: ${result.lcp?.url ? result.lcp.url.split("/").pop() : result.lcp?.tag ?? "?"} @${result.lcp?.time ?? "?"}ms`)

  await page.close()
  return pass
}

console.log("\nhero fallback matrix\n")

const cases = [
  { name: "baseline desktop", expect: "model" },
  { name: "baseline mobile", expect: "model", viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  {
    name: "no WebGL",
    expect: "poster",
    prepare: () => {
      const real = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).startsWith("webgl")) return null
        return real.call(this, type, ...rest)
      }
    },
  },
  {
    name: "saveData enabled",
    expect: "poster",
    prepare: () => {
      Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true })
    },
  },
  { name: "GLB 404 (error boundary)", expect: "poster", glbStatus: 404 },
  {
    name: "prefers-reduced-motion",
    expect: "model",
    prepare: () => {
      const real = window.matchMedia.bind(window)
      window.matchMedia = (q) =>
        q.includes("prefers-reduced-motion")
          ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
          : real(q)
    },
  },
]

let failed = 0
for (const c of cases) if (!(await run(c))) failed++

await browser.close()
console.log(`\n${failed ? `${failed} case(s) failed` : "all cases passed"}\n`)
process.exit(failed ? 1 : 0)
