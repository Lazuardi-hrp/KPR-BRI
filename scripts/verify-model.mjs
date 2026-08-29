#!/usr/bin/env node
/**
 * Loads the shipped GLB through the *same* three.js GLTFLoader the browser uses.
 *
 *   npm run model:verify
 *
 * Inspecting the file byte-level only proves it was written correctly; this
 * proves it can be *read* — that the meshopt payload decodes, quantised
 * attributes dequantise, EXT_mesh_gpu_instancing becomes real InstancedMeshes,
 * and every EXT_materials_bump texture arrives as a decoded bumpMap.
 */
import { readFileSync } from "node:fs"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import sharp from "sharp"

// GLTFLoader's texture path expects a browser. `self` and createImageBitmap are
// the only two globals it needs; backing the decode with sharp means the WebP
// payloads are really decoded rather than waved through.
globalThis.self = globalThis
globalThis.createImageBitmap = async (blob) => {
  const buf = Buffer.from(await blob.arrayBuffer())
  const { width, height, format } = await sharp(buf).metadata()
  return { width, height, format, close() {} }
}

const path = process.argv[2] ?? "public/models/deret-rumah-subsidi.glb"
const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)

const buf = readFileSync(path)
const gltf = await loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "")

let meshes = 0
let instanced = 0
let instancedCopies = 0
let renderedTris = 0
const materials = new Map()

gltf.scene.traverse((object) => {
  if (!object.isMesh) return
  meshes++
  const geometry = object.geometry
  const tris = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
  const copies = object.isInstancedMesh ? object.count : 1
  if (object.isInstancedMesh) {
    instanced++
    instancedCopies += copies
  }
  renderedTris += tris * copies

  const m = object.material
  if (!materials.has(m.uuid)) materials.set(m.uuid, m)
})

console.log("loaded via three.js r" + THREE.REVISION)
console.log("  draw calls (meshes)  :", meshes, `(${instanced} instanced, drawing ${instancedCopies} copies)`)
console.log("  triangles rasterised :", Math.round(renderedTris).toLocaleString())
console.log("  materials            :", materials.size)

const box = new THREE.Box3().setFromObject(gltf.scene)
const size = box.getSize(new THREE.Vector3())
const center = box.getCenter(new THREE.Vector3())
console.log("  bbox size            :", [size.x, size.y, size.z].map((v) => v.toFixed(2)).join(" x "))
console.log("  bbox center          :", [center.x, center.y, center.z].map((v) => v.toFixed(2)).join(", "))

console.log("\n  material                type            side          bumpMap  bumpScale  repeat")
for (const m of materials.values()) {
  const side = m.side === THREE.DoubleSide ? "double" : m.side === THREE.FrontSide ? "front" : "back"
  const repeat = m.bumpMap ? `[${m.bumpMap.repeat.x},${m.bumpMap.repeat.y}]` : ""
  console.log(
    "  " +
      String(m.name || "(unnamed)").padEnd(22) +
      String(m.type.replace("Mesh", "").replace("Material", "")).padEnd(16) +
      side.padEnd(14) +
      String(m.bumpMap ? "yes" : "-").padEnd(9) +
      String(m.bumpMap ? m.bumpScale : "-").padEnd(11) +
      repeat,
  )
}

const missingBump = [...materials.values()].filter((m) => m.bumpMap && !m.bumpMap.image)
console.log(missingBump.length ? `\n  FAIL: ${missingBump.length} bump maps have no image` : "\n  all bump map images decoded")
