import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { plateTexture, shadowTexture } from './textures'

export interface CarVisual {
  steer: number
  spin: number
  brake: boolean
  boosting: boolean
  throttle: number
  lightsOn: boolean
}

/** Nose points toward +Z. Registration AY11 ALG is fixed on both plates. */
export const CAR_LENGTH = 4.55

function bodyGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0.02, 0.2)
  s.lineTo(0.06, 0.42)
  s.lineTo(0.42, 0.56)
  s.lineTo(1.15, 0.62)
  s.lineTo(1.78, 0.68)
  s.lineTo(2.4, 1.08)
  s.lineTo(3.05, 1.16)
  s.lineTo(3.6, 0.9)
  s.lineTo(4.15, 0.8)
  s.lineTo(4.5, 0.62)
  s.lineTo(4.52, 0.32)
  s.lineTo(4.1, 0.2)
  s.lineTo(0.35, 0.2)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.78,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.09,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 12,
  })
  geo.rotateY(Math.PI / 2)
  geo.translate(-0.89, 0, 2.275)
  geo.computeVertexNormals()
  return geo
}

function canopyGeometry() {
  const s = new THREE.Shape()
  s.moveTo(1.86, 0.7)
  s.lineTo(2.42, 1.07)
  s.lineTo(3.06, 1.14)
  s.lineTo(3.62, 0.86)
  s.lineTo(3.62, 0.7)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 8,
  })
  geo.rotateY(Math.PI / 2)
  geo.translate(-0.75, 0, 2.275)
  geo.computeVertexNormals()
  return geo
}

const WHEELS = [
  { x: 0.9, z: 1.42, front: true, key: 'fr' },
  { x: -0.9, z: 1.42, front: true, key: 'fl' },
  { x: 0.9, z: -1.4, front: false, key: 'rr' },
  { x: -0.9, z: -1.4, front: false, key: 'rl' },
]

export function CarModel({
  visual,
  showShadow = true,
  headlights = true,
  scale = 1,
}: {
  visual?: React.MutableRefObject<CarVisual>
  showShadow?: boolean
  headlights?: boolean
  scale?: number
}) {
  const steerRefs = useRef<(THREE.Group | null)[]>([])
  const spinRefs = useRef<(THREE.Group | null)[]>([])
  const nitroL = useRef<THREE.Mesh>(null)
  const nitroR = useRef<THREE.Mesh>(null)

  const geoms = useMemo(() => {
    const wheel = new THREE.CylinderGeometry(0.365, 0.365, 0.3, 26, 1)
    wheel.rotateZ(Math.PI / 2)
    const rim = new THREE.CylinderGeometry(0.245, 0.245, 0.312, 22, 1)
    rim.rotateZ(Math.PI / 2)
    const hub = new THREE.CylinderGeometry(0.075, 0.075, 0.33, 12, 1)
    hub.rotateZ(Math.PI / 2)
    const spoke = new THREE.BoxGeometry(0.02, 0.2, 0.045)
    const disc = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 20, 1)
    disc.rotateZ(Math.PI / 2)
    return { wheel, rim, hub, spoke, disc, body: bodyGeometry(), canopy: canopyGeometry() }
  }, [])

  const mats = useMemo(() => {
    const paint = new THREE.MeshPhysicalMaterial({
      color: '#08090b',
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.1,
    })
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#080b11',
      metalness: 0.35,
      roughness: 0.14,
      clearcoat: 1,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.8,
    })
    const rubber = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.92, metalness: 0.05 })
    const rim = new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 1, roughness: 0.28, envMapIntensity: 1.4 })
    const trim = new THREE.MeshStandardMaterial({ color: '#1a1c20', metalness: 0.85, roughness: 0.35 })
    const chrome = new THREE.MeshStandardMaterial({ color: '#d8dade', metalness: 1, roughness: 0.14 })
    const caliper = new THREE.MeshStandardMaterial({ color: '#a82430', metalness: 0.5, roughness: 0.4, emissive: '#3a0508', emissiveIntensity: 0.5 })
    const head = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eaf4ff', emissiveIntensity: 3, roughness: 0.2 })
    const tail = new THREE.MeshStandardMaterial({ color: '#3d0608', emissive: '#ff2430', emissiveIntensity: 1.6, roughness: 0.3 })
    const flame = new THREE.MeshBasicMaterial({ color: '#67b6ff', transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })
    const under = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.85, depthWrite: false })
    return { paint, glass, rubber, rim, trim, chrome, caliper, head, tail, flame, under }
  }, [])

  const plateFront = useMemo(() => plateTexture(false), [])
  const plateRear = useMemo(() => plateTexture(true), [])

  useFrame(() => {
    const v = visual?.current
    if (!v) {
      mats.head.emissiveIntensity = 2.2
      return
    }
    const angle = -v.steer * 0.42
    for (let i = 0; i < WHEELS.length; i++) {
      if (WHEELS[i].front) {
        const g = steerRefs.current[i]
        if (g) g.rotation.y = angle
      }
      const spin = spinRefs.current[i]
      if (spin) spin.rotation.x = v.spin
    }
    mats.tail.emissiveIntensity = v.brake ? 6.5 : 1.4
    mats.head.emissiveIntensity = v.lightsOn ? 4.2 : 0.35
    if (nitroL.current) {
      nitroL.current.visible = v.boosting
      if (v.boosting) nitroL.current.scale.set(1, 0.8 + Math.random() * 0.6, 1)
    }
    if (nitroR.current) {
      nitroR.current.visible = v.boosting
      if (v.boosting) nitroR.current.scale.set(1, 0.8 + Math.random() * 0.6, 1)
    }
  })

  return (
    <group scale={scale}>
      <mesh geometry={geoms.body} material={mats.paint} castShadow receiveShadow />
      <mesh geometry={geoms.canopy} material={mats.glass} castShadow />

      {/* aero + skirts */}
      <mesh position={[0.93, 0.26, 0]} material={mats.trim}>
        <boxGeometry args={[0.12, 0.14, 2.3]} />
      </mesh>
      <mesh position={[-0.93, 0.26, 0]} material={mats.trim}>
        <boxGeometry args={[0.12, 0.14, 2.3]} />
      </mesh>
      <mesh position={[0, 0.24, 2.08]} material={mats.trim}>
        <boxGeometry args={[1.92, 0.07, 0.52]} />
      </mesh>
      <mesh position={[0, 0.3, -2.16]} material={mats.trim}>
        <boxGeometry args={[1.7, 0.16, 0.34]} />
      </mesh>

      {/* front intakes */}
      <mesh position={[0.55, 0.42, 2.16]} material={mats.trim}>
        <boxGeometry args={[0.42, 0.16, 0.16]} />
      </mesh>
      <mesh position={[-0.55, 0.42, 2.16]} material={mats.trim}>
        <boxGeometry args={[0.42, 0.16, 0.16]} />
      </mesh>

      {/* headlights — slim units set into the nose */}
      <mesh position={[0.6, 0.4, 2.27]} material={mats.head}>
        <boxGeometry args={[0.42, 0.07, 0.08]} />
      </mesh>
      <mesh position={[-0.6, 0.4, 2.27]} material={mats.head}>
        <boxGeometry args={[0.42, 0.07, 0.08]} />
      </mesh>

      {/* tail light bar */}
      <mesh position={[0, 0.74, -2.22]} material={mats.tail}>
        <boxGeometry args={[1.5, 0.09, 0.07]} />
      </mesh>
      <mesh position={[0.62, 0.6, -2.22]} material={mats.tail}>
        <boxGeometry args={[0.28, 0.06, 0.06]} />
      </mesh>
      <mesh position={[-0.62, 0.6, -2.22]} material={mats.tail}>
        <boxGeometry args={[0.28, 0.06, 0.06]} />
      </mesh>

      {/* spoiler */}
      <mesh position={[0, 1.03, -1.92]} material={mats.trim} castShadow>
        <boxGeometry args={[1.62, 0.06, 0.34]} />
      </mesh>
      <mesh position={[0.62, 0.94, -1.95]} material={mats.trim}>
        <boxGeometry args={[0.07, 0.18, 0.16]} />
      </mesh>
      <mesh position={[-0.62, 0.94, -1.95]} material={mats.trim}>
        <boxGeometry args={[0.07, 0.18, 0.16]} />
      </mesh>

      {/* mirrors */}
      <mesh position={[1.02, 0.8, 1.4]} material={mats.trim}>
        <boxGeometry args={[0.22, 0.09, 0.12]} />
      </mesh>
      <mesh position={[-1.02, 0.8, 1.4]} material={mats.trim}>
        <boxGeometry args={[0.22, 0.09, 0.12]} />
      </mesh>

      {/* exhausts */}
      <mesh position={[0.3, 0.36, -2.26]} rotation={[Math.PI / 2, 0, 0]} material={mats.chrome}>
        <cylinderGeometry args={[0.075, 0.085, 0.16, 14]} />
      </mesh>
      <mesh position={[-0.3, 0.36, -2.26]} rotation={[Math.PI / 2, 0, 0]} material={mats.chrome}>
        <cylinderGeometry args={[0.075, 0.085, 0.16, 14]} />
      </mesh>

      {/* nitro flames */}
      <mesh ref={nitroL} position={[0.3, 0.36, -2.7]} rotation={[-Math.PI / 2, 0, 0]} material={mats.flame} visible={false}>
        <coneGeometry args={[0.12, 0.8, 10, 1, true]} />
      </mesh>
      <mesh ref={nitroR} position={[-0.3, 0.36, -2.7]} rotation={[-Math.PI / 2, 0, 0]} material={mats.flame} visible={false}>
        <coneGeometry args={[0.12, 0.8, 10, 1, true]} />
      </mesh>

      {/* number plates — AY11 ALG, front and rear */}
      <mesh position={[0, 0.5, 2.31]}>
        <planeGeometry args={[0.62, 0.15]} />
        <meshBasicMaterial map={plateFront} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.52, -2.33]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.62, 0.15]} />
        <meshBasicMaterial map={plateRear} toneMapped={false} />
      </mesh>

      {/* wheel arches — dark openings so the wheels read against the body */}
      {WHEELS.map((w) => (
        <mesh
          key={`arch-${w.key}`}
          position={[Math.sign(w.x) * 0.96, 0.42, w.z]}
          rotation={[0, Math.sign(w.x) * (Math.PI / 2), 0]}
          material={mats.trim}
        >
          <circleGeometry args={[0.47, 24]} />
        </mesh>
      ))}

      {/* wheels */}
      {WHEELS.map((w, i) => (
        <group key={w.key} position={[w.x, 0.365, w.z]}>
          <group ref={(el) => { steerRefs.current[i] = el }}>
            <group ref={(el) => { spinRefs.current[i] = el }}>
              <mesh geometry={geoms.wheel} material={mats.rubber} castShadow />
              <mesh geometry={geoms.rim} material={mats.rim} />
              <mesh geometry={geoms.hub} material={mats.chrome} />
              {[0, 1, 2, 3, 4].map((s) => (
                <mesh
                  key={s}
                  geometry={geoms.spoke}
                  material={mats.rim}
                  position={[0, Math.cos((s / 5) * Math.PI * 2) * 0.16, Math.sin((s / 5) * Math.PI * 2) * 0.16]}
                  rotation={[0, 0, -(s / 5) * Math.PI * 2]}
                />
              ))}
              <mesh geometry={geoms.disc} material={mats.trim} />
            </group>
          </group>
          <mesh position={[Math.sign(w.x) * 0.16, 0.02, 0.1]} material={mats.caliper}>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
          </mesh>
        </group>
      ))}

      {showShadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} material={mats.under}>
          <planeGeometry args={[5.6, 7.2]} />
        </mesh>
      )}

      {headlights && <pointLight position={[0, 0.85, 3.4]} intensity={16} distance={34} decay={1.7} color="#fff1d6" />}
    </group>
  )
}
