#!/usr/bin/env node
/**
 * Production optimisation for assets/deret-rumah-subsidi.glb.
 *
 *   npm run model:optimize
 *
 * The source is a THREE.GLTFExporter dump: 458 meshes and 458 draw calls for
 * only 45k triangles, 1,828 bufferViews (a 573 KB JSON chunk), six RGBA8 PNGs,
 * and every material double-sided. The draw-call count is the real defect, not
 * the byte count.
 *
 * Transform order follows the official `gltf-transform optimize` pipeline
 * (cli/src/cli.ts): dedup -> instance -> flatten -> join -> weld -> prune ->
 * textureCompress -> meshopt. Two project-specific passes are inserted:
 *
 *   - a greyscale/resize pre-pass on the bump maps, which tile 6-30x and carry
 *     no detail at 512^2 (and whose alpha channel is dead weight);
 *   - a back-face pass that clears doubleSided on primitives proven to be
 *     closed manifolds, rather than guessing from material names.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Logger, NodeIO } from "@gltf-transform/core"
import { ALL_EXTENSIONS } from "@gltf-transform/extensions"
import { dedup, flatten, instance, join, meshopt, prune, textureCompress, weld } from "@gltf-transform/functions"
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer"
import sharp from "sharp"

import { EXTMaterialsBump } from "./ext-materials-bump.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = resolve(ROOT, "assets/deret-rumah-subsidi.glb")
const DST = resolve(ROOT, "public/models/deret-rumah-subsidi.glb")

/** Bump maps tile 6-30x, so 256^2 greyscale loses nothing visible. */
const BUMP_SIZE = 256
/** Colour and metallic-roughness maps keep a little more resolution. */
const TEXTURE_SIZE = 512
const WEBP_QUALITY = 80

/* -------------------------------------------------------------------------- */
/* Reporting                                                                  */
/* -------------------------------------------------------------------------- */

/** Parses a GLB straight from disk, so the report describes the shipped file. */
function describe(path) {
  const buf = readFileSync(path)
  let offset = 12
  let json = null
  let jsonBytes = 0
  let binBytes = 0

  while (offset < buf.length) {
    const length = buf.readUInt32LE(offset)
    const type = buf.toString("utf8", offset + 4, offset + 8)
    if (type === "JSON") {
      json = JSON.parse(buf.toString("utf8", offset + 8, offset + 8 + length))
      jsonBytes = length
    } else {
      binBytes += length
    }
    offset += 8 + length
  }

  const meshes = json.meshes || []
  const nodes = json.nodes || []
  const accessors = json.accessors || []
  const bufferViews = json.bufferViews || []

  const meshTriangles = meshes.map((mesh) =>
    mesh.primitives.reduce((sum, prim) => {
      if (prim.indices != null) return sum + accessors[prim.indices].count / 3
      if (prim.attributes.POSITION != null) return sum + accessors[prim.attributes.POSITION].count / 3
      return sum
    }, 0),
  )

  const primitives = meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0)
  // Triangles stored in the file. Instancing makes this smaller than the number
  // actually rasterised, which is what uniqueTriangles vs triangles separates.
  const uniqueTriangles = meshTriangles.reduce((sum, n) => sum + n, 0)

  // A node carrying EXT_mesh_gpu_instancing issues one call per primitive no
  // matter how many copies it draws — that is the whole point of instancing.
  let drawCalls = 0
  let triangles = 0
  for (const node of nodes) {
    if (node.mesh == null) continue
    const gpuInstancing = node.extensions && node.extensions.EXT_mesh_gpu_instancing
    const copies = gpuInstancing ? accessors[Object.values(gpuInstancing.attributes)[0]].count : 1
    drawCalls += meshes[node.mesh].primitives.length
    triangles += meshTriangles[node.mesh] * copies
  }

  const imageBytes = (json.images || []).reduce(
    (sum, image) => sum + (image.bufferView != null ? bufferViews[image.bufferView].byteLength : 0),
    0,
  )

  const textures = (json.images || []).map((image) => {
    const view = bufferViews[image.bufferView]
    return { mimeType: image.mimeType, bytes: view ? view.byteLength : 0 }
  })

  return {
    bytes: buf.length,
    jsonBytes,
    binBytes,
    imageBytes,
    geometryBytes: binBytes - imageBytes,
    meshes: meshes.length,
    nodes: nodes.length,
    primitives,
    drawCalls,
    triangles: Math.round(triangles),
    uniqueTriangles: Math.round(uniqueTriangles),
    accessors: accessors.length,
    bufferViews: bufferViews.length,
    materials: (json.materials || []).length,
    images: (json.images || []).length,
    doubleSided: (json.materials || []).filter((m) => m.doubleSided).length,
    extensions: json.extensionsUsed || [],
    textures,
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
const pct = (before, after) => `${(((before - after) / before) * 100).toFixed(0)}%`

function report(before, after) {
  const rows = [
    ["File size", mb(before.bytes), mb(after.bytes), pct(before.bytes, after.bytes)],
    ["  JSON chunk", kb(before.jsonBytes), kb(after.jsonBytes), pct(before.jsonBytes, after.jsonBytes)],
    ["  geometry", kb(before.geometryBytes), kb(after.geometryBytes), pct(before.geometryBytes, after.geometryBytes)],
    ["  textures", kb(before.imageBytes), kb(after.imageBytes), pct(before.imageBytes, after.imageBytes)],
    ["Draw calls", before.drawCalls, after.drawCalls, pct(before.drawCalls, after.drawCalls)],
    ["Meshes", before.meshes, after.meshes, pct(before.meshes, after.meshes)],
    ["Nodes", before.nodes, after.nodes, pct(before.nodes, after.nodes)],
    ["Accessors", before.accessors, after.accessors, pct(before.accessors, after.accessors)],
    ["BufferViews", before.bufferViews, after.bufferViews, pct(before.bufferViews, after.bufferViews)],
    ["Triangles drawn", before.triangles, after.triangles, "kept"],
    ["  stored in file", before.uniqueTriangles, after.uniqueTriangles, pct(before.uniqueTriangles, after.uniqueTriangles)],
    ["Materials", before.materials, after.materials, ""],
    ["  double-sided", before.doubleSided, after.doubleSided, ""],
    ["Textures", before.images, after.images, ""],
  ]

  const pad = (v, n) => String(v).padEnd(n)
  const padStart = (v, n) => String(v).padStart(n)

  console.log("")
  console.log(`  ${pad("", 16)}${padStart("before", 10)}${padStart("after", 10)}${padStart("saved", 9)}`)
  console.log(`  ${"-".repeat(45)}`)
  for (const [label, b, a, delta] of rows) {
    console.log(`  ${pad(label, 16)}${padStart(b, 10)}${padStart(a, 10)}${padStart(delta, 9)}`)
  }

  console.log("")
  console.log(`  extensions: ${after.extensions.join(", ") || "none"}`)
  console.log(`  textures:   ${after.textures.map((t) => `${t.mimeType.replace("image/", "")} ${kb(t.bytes)}`).join(", ")}`)

  if (!after.extensions.includes("EXT_materials_bump")) {
    console.warn("\n  WARNING: EXT_materials_bump was lost — surface detail is gone.")
  }
  if (!after.extensions.includes("EXT_meshopt_compression")) {
    console.warn("\n  WARNING: meshopt compression was not applied.")
  }
  console.log("")
}

/* -------------------------------------------------------------------------- */
/* Project-specific passes                                                    */
/* -------------------------------------------------------------------------- */

/**
 * True when every edge of the primitive is shared by exactly two triangles.
 *
 * Edges are keyed by vertex *position* rather than index: the exporter splits
 * vertices at hard edges to carry per-face normals, so index-based matching
 * would report every closed box as open.
 */
function isClosedManifold(primitive) {
  const position = primitive.getAttribute("POSITION")
  const indices = primitive.getIndices()
  if (!position) return false

  const positions = position.getArray()
  const order = indices ? indices.getArray() : null
  const count = order ? order.length : position.getCount()
  if (count % 3 !== 0) return false

  const key = (i) => {
    const v = order ? order[i] : i
    return `${positions[v * 3]},${positions[v * 3 + 1]},${positions[v * 3 + 2]}`
  }

  const edges = new Map()
  for (let i = 0; i < count; i += 3) {
    const a = key(i)
    const b = key(i + 1)
    const c = key(i + 2)
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const edge = p < q ? `${p}|${q}` : `${q}|${p}`
      edges.set(edge, (edges.get(edge) || 0) + 1)
    }
  }

  for (const n of edges.values()) if (n !== 2) return false
  return edges.size > 0
}

/**
 * Clears doubleSided on materials whose every primitive is a closed solid.
 * All 16 materials arrive double-sided, which doubles fragment cost for the
 * walls, plinths, curbs and roofs that can never show a back face. Planar
 * geometry — foliage cards, glass panes, gutters, door reveals — is left alone.
 */
function backfaceCull(document, logger) {
  const openMaterials = new Set()
  const seenMaterials = new Set()

  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const material = primitive.getMaterial()
      if (!material) continue
      seenMaterials.add(material)
      if (!isClosedManifold(primitive)) openMaterials.add(material)
    }
  }

  const culled = []
  for (const material of seenMaterials) {
    if (openMaterials.has(material) || !material.getDoubleSided()) continue
    material.setDoubleSided(false)
    culled.push(material.getName() || "(unnamed)")
  }

  logger.info(`backface: single-sided -> ${culled.length ? culled.join(", ") : "none"}`)
  return culled.length
}

/**
 * Rewrites bump maps as greyscale before compression. They are RGBA8 PNGs whose
 * alpha and chroma planes carry nothing, and they tile 6-30x, so 256^2 greyscale
 * is visually identical and encodes to a fraction of the size.
 */
async function shrinkBumpMaps(document, logger) {
  const bumpTextures = new Set()
  for (const material of document.getRoot().listMaterials()) {
    const bump = material.getExtension("EXT_materials_bump")
    const texture = bump && bump.getBumpTexture()
    if (texture) bumpTextures.add(texture)
  }

  for (const texture of bumpTextures) {
    const before = texture.getImage().byteLength
    const image = await sharp(texture.getImage())
      .resize(BUMP_SIZE, BUMP_SIZE, { fit: "fill" })
      .greyscale()
      .png({ compressionLevel: 9 })
      .toBuffer()
    texture.setImage(image).setMimeType("image/png")
    logger.info(`bump: ${texture.getName() || "(unnamed)"} ${kb(before)} -> ${kb(image.byteLength)} greyscale ${BUMP_SIZE}px`)
  }

  return bumpTextures.size
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

async function main() {
  const logger = new Logger(Logger.Verbosity.WARN)

  await MeshoptDecoder.ready
  await MeshoptEncoder.ready

  const io = new NodeIO()
    .registerExtensions([...ALL_EXTENSIONS, EXTMaterialsBump])
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder })

  const before = describe(SRC)
  const document = await io.read(SRC)
  document.setLogger(logger)

  await document.transform(
    // Collapses the 254 byte-identical meshes onto shared references. Must run
    // first: instance() only hoists meshes several nodes already share.
    dedup(),
    // The 51 curbs, 35 flowers and 30-copy shrub groups become GPU instances.
    instance({ min: 5 }),
    // Bakes the 816-node hierarchy into world transforms so join() can merge.
    flatten(),
    // Merges the remainder by material. Skips instanced nodes (join.ts:175),
    // so this composes with instance() rather than fighting it.
    join({ keepNamed: false, keepMeshes: false }),
    weld(),
    (doc) => backfaceCull(doc, logger),
    prune({ keepAttributes: false, keepLeaves: false, keepSolidTextures: false }),
  )

  await shrinkBumpMaps(document, logger)

  await document.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [TEXTURE_SIZE, TEXTURE_SIZE],
      quality: WEBP_QUALITY,
      effort: 6,
    }),
    // Last: reorder + quantize + EXT_meshopt_compression.
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  )

  mkdirSync(dirname(DST), { recursive: true })
  writeFileSync(DST, Buffer.from(await io.writeBinary(document)))

  report(before, describe(DST))
  console.log(`  wrote ${DST.replace(ROOT + "/", "")}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
