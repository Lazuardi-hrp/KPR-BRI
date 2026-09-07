"use client"

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useStore, useThree } from "@react-three/fiber"
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"

// ── Suppress THREE.Clock deprecation ────────────────────────────────────
// R3F 9.x internally creates `new THREE.Clock()`, which Three.js ≥ 0.185
// has deprecated in favour of `THREE.Timer`. There is no stable R3F
// release that fixes this yet. Rather than let it clutter the console on
// every mount, we swallow only that specific message.
if (typeof window !== "undefined") {
  const _warn = console.warn
  console.warn = function filteredWarn(...args: unknown[]) {
    if (typeof args[0] === "string" && args[0].includes("THREE.Clock")) return
    return _warn.apply(console, args)
  }
}

const MODEL_URL = "/models/deret-rumah-subsidi.glb"

/** Three-quarter view, held between these two angles. Radians. */
const AZIMUTH = THREE.MathUtils.degToRad(34)
const ELEVATION = THREE.MathUtils.degToRad(32)
/** How far the idle sway travels either side of AZIMUTH. */
const SWAY = THREE.MathUtils.degToRad(13)
const SWAY_SPEED = 0.13
/**
 * Breathing room between the model and the panel edge. The fit is already
 * computed against the worst-case azimuth, so this can sit close to 1.
 */
const FIT_MARGIN = 0.98

/**
 * Fits the orthographic camera to the model.
 *
 * The fit uses the radius in the XZ plane rather than the bounding box, because
 * the scene turns: a box fit would clip the row of houses as it swung side-on.
 */
function useOrthoFit(radiusXZ: number, halfHeight: number) {
  // Pulled from the store rather than useThree(state => state.camera): the
  // camera is an external object we mutate, not React state.
  const store = useStore()
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    const camera = store.getState().camera as THREE.OrthographicCamera
    const projectedHalfHeight = halfHeight * Math.cos(ELEVATION) + radiusXZ * Math.sin(ELEVATION)
    camera.zoom =
      Math.min(size.width / (radiusXZ * 2), size.height / (projectedHalfHeight * 2)) * FIT_MARGIN
    camera.updateProjectionMatrix()
  }, [store, size, radiusXZ, halfHeight])
}

/**
 * Minimum linear albedo any surface is allowed to have.
 *
 * The exporter authored `genteng-gelap` at ~1.8% reflectance — darker than coal,
 * and with no environment map to catch it, the roof reads as a black void that
 * swallows the tile bump we went to the trouble of preserving. Nothing in a
 * civic drawing should render as a hole, so the darkest surfaces are lifted to
 * this floor with their hue intact. At 0.05 exactly one material qualifies; the
 * door reveals (`rongga-dalam`, 0.052) stay dark because they are meant to be.
 */
const MIN_ALBEDO = 0.05

/** Rec. 709 relative luminance. */
const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

function liftShadowedAlbedo(root: THREE.Object3D) {
  const seen = new Map<string, THREE.Material>()

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return

    const apply = (source: THREE.Material) => {
      const cached = seen.get(source.uuid)
      if (cached) return cached

      // useGLTF caches the loaded scene, and clone() shares materials with it —
      // so mutating in place would leak into every later mount.
      const material = source.clone() as THREE.MeshStandardMaterial
      const colour = material.color
      if (colour) {
        const lum = luminance(colour)
        if (lum > 0 && lum < MIN_ALBEDO) colour.multiplyScalar(MIN_ALBEDO / lum)
      }
      seen.set(source.uuid, material)
      return material
    }

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(apply)
      : apply(mesh.material)
  })
}

interface SceneProps {
  reducedMotion: boolean
  onReady: () => void
}

function Scene({ reducedMotion, onReady }: SceneProps) {
  // useDraco=false — drei's default (true) lazily builds a DRACOLoader pointed at
  // a gstatic CDN we do not ship. useMeshopt stays on and drei bundles the
  // decoder, which our EXT_meshopt_compression payload needs.
  const { scene } = useGLTF(MODEL_URL, false, true)
  const controls = useRef<OrbitControlsImpl>(null)
  const dragging = useRef(false)

  // Centre on the origin so OrbitControls can orbit the model rather than a
  // point beside it, and measure what the camera fit needs.
  const { model, radiusXZ, halfHeight, baseY } = useMemo(() => {
    const model = scene.clone(true)
    liftShadowedAlbedo(model)
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    model.position.sub(center)

    return {
      model,
      radiusXZ: Math.hypot(size.x, size.z) / 2,
      halfHeight: size.y / 2,
      baseY: -size.y / 2,
    }
  }, [scene])

  useOrthoFit(radiusXZ, halfHeight)

  useEffect(() => {
    const frame = requestAnimationFrame(onReady)
    return () => cancelAnimationFrame(frame)
  }, [onReady])

  const onStart = useCallback(() => {
    dragging.current = true
  }, [])
  const onEnd = useCallback(() => {
    dragging.current = false
  }, [])

  // Idle sway. Eased rather than set outright, so releasing a drag drifts back
  // into the arc instead of snapping to it.
  useFrame((state, delta) => {
    const orbit = controls.current
    if (!orbit || dragging.current || reducedMotion) return
    const target = AZIMUTH + Math.sin(state.clock.elapsedTime * SWAY_SPEED) * SWAY
    orbit.setAzimuthalAngle(THREE.MathUtils.damp(orbit.getAzimuthalAngle(), target, 1.4, delta))
  })

  return (
    <>
      {/* Flat daylight, no environment map: reflections would read as product
          render rather than survey model. The ambient term is not decoration —
          without an environment, the dark roof (#292623) receives almost
          nothing and crushes to pure black. */}
      <ambientLight intensity={0.55} color="#eef3fa" />
      <hemisphereLight args={["#eaf2fd", "#cbd6e4", 2.0]} />
      <directionalLight position={[8, 14, 10]} intensity={1.7} color="#fffaf2" />
      <directionalLight position={[-10, 6, -8]} intensity={0.45} color="#dbe8f7" />

      <primitive object={model} />

      <ContactShadows
        position={[0, baseY - 0.01, 0]}
        scale={radiusXZ * 2.6}
        resolution={1024}
        blur={2.4}
        opacity={0.32}
        far={halfHeight * 3}
        color="#0a1a2f"
        frames={1}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        // Never from below, never from directly overhead.
        minPolarAngle={Math.PI / 2 - THREE.MathUtils.degToRad(42)}
        maxPolarAngle={Math.PI / 2 - THREE.MathUtils.degToRad(6)}
        // A held arc: the row of houses is only ever seen from its good side.
        minAzimuthAngle={AZIMUTH - THREE.MathUtils.degToRad(46)}
        maxAzimuthAngle={AZIMUTH + THREE.MathUtils.degToRad(46)}
        onStart={onStart}
        onEnd={onEnd}
      />
    </>
  )
}

export interface HeroModelProps {
  /** Suppresses the idle sway; dragging still works. */
  reducedMotion: boolean
  /** Fires on the first frame with the model in it. */
  onReady: () => void
  /** Fires if the GPU drops the context, so the poster can come back. */
  onLost: () => void
}

/**
 * The hero's survey model — a row of five subsidised houses, drawn
 * orthographically so it reads as a site plan rather than a product shot.
 */
export default function HeroModel({ reducedMotion, onReady, onLost }: HeroModelProps) {
  const distance = 80

  return (
    <Canvas
      orthographic
      camera={{
        position: [
          distance * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
          distance * Math.sin(ELEVATION),
          distance * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
        ],
        near: 0.1,
        far: distance * 3,
        zoom: 12,
      }}
      // alpha so the panel's bg-secondary/50 shows through.
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      onCreated={({ gl }) => {
        // Neutral rather than ACES: no filmic S-curve to warm the whites.
        gl.toneMapping = THREE.NeutralToneMapping
        // A backgrounded tab or a GPU reset blanks the canvas without throwing;
        // without this the poster would stay faded out behind an empty panel.
        gl.domElement.addEventListener("webglcontextlost", onLost)
      }}
      style={{ touchAction: "pan-y" }}
    >
      <Suspense fallback={null}>
        <Scene reducedMotion={reducedMotion} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL, false, true)
