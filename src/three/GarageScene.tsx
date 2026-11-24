import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CarModel } from './CarModel'
import { plateTexture } from './textures'

export type GarageMode = 'menu' | 'inspect' | 'intro'

function GarageShell({ phase, mode }: { phase: number; mode: GarageMode }) {
  const doorL = useRef<THREE.Mesh>(null)
  const doorR = useRef<THREE.Mesh>(null)
  const target = useRef(0)
  const open = phase >= 1 || mode === 'intro'

  useFrame((_, dt) => {
    target.current += ((open ? 1 : 0) - target.current) * Math.min(1, dt * 1.4)
    const y = 3.6 * target.current
    if (doorL.current) doorL.current.position.y = 3.1 + y
    if (doorR.current) doorR.current.position.y = -3.1 - y
  })

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshPhysicalMaterial color="#0d0e11" metalness={0.86} roughness={0.16} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.1} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 8, -26]}>
        <boxGeometry args={[70, 20, 1]} />
        <meshStandardMaterial color="#141519" roughness={0.85} metalness={0.2} />
      </mesh>
      <mesh position={[-26, 8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[54, 20, 1]} />
        <meshStandardMaterial color="#111216" roughness={0.9} metalness={0.15} />
      </mesh>
      <mesh position={[26, 8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[54, 20, 1]} />
        <meshStandardMaterial color="#111216" roughness={0.9} metalness={0.15} />
      </mesh>
      <mesh position={[0, 18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 54]} />
        <meshStandardMaterial color="#0a0b0d" roughness={1} />
      </mesh>

      {/* garage door opening */}
      <mesh position={[0, 0.02, 14]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#05070b" roughness={1} />
      </mesh>
      <mesh position={[0, 8, 13.5]}>
        <boxGeometry args={[18, 2, 1]} />
        <meshStandardMaterial color="#1a1c21" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh ref={doorL} position={[0, 3.1, 13.4]}>
        <boxGeometry args={[16, 6.2, 0.3]} />
        <meshStandardMaterial color="#191b20" roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh ref={doorR} position={[0, -3.1, 13.4]}>
        <boxGeometry args={[16, 6.2, 0.3]} />
        <meshStandardMaterial color="#191b20" roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.06, 13.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[16, 0.1, 0.5]} />
        <meshStandardMaterial color="#d5c5a1" emissive="#d5c5a1" emissiveIntensity={1.4} />
      </mesh>

      {/* ceiling light strips */}
      {[-8, 0, 8].map((x) => (
        <mesh key={x} position={[x, 7.4, -2]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.16, 22, 0.16]} />
          <meshStandardMaterial color="#ffffff" emissive="#eaf2ff" emissiveIntensity={2.4} />
        </mesh>
      ))}
      {[-6, 6].map((z) => (
        <mesh key={z} position={[0, 7.2, z]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.12, 16, 0.12]} />
          <meshStandardMaterial color="#ffffff" emissive="#cfd9ff" emissiveIntensity={1.4} />
        </mesh>
      ))}

      <spotLight position={[0, 9, 4]} angle={0.7} penumbra={0.8} intensity={150} distance={40} castShadow color="#dce7ff" shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-9, 8, -6]} angle={0.8} penumbra={1} intensity={55} distance={40} color="#ffd9b0" />
      <spotLight position={[10, 7, -8]} angle={0.8} penumbra={1} intensity={55} distance={40} color="#a82430" />
      <pointLight position={[0, 3, 10]} intensity={22} distance={26} decay={1.6} color="#fff2dc" />

      {/* floor ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.72, 64]} />
        <meshStandardMaterial color="#d5c5a1" emissive="#d5c5a1" emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.55, 64]} />
        <meshStandardMaterial color="#101114" metalness={0.7} roughness={0.25} envMapIntensity={0.9} />
      </mesh>

      {/* back wall branding */}
      <mesh position={[0, 5.6, -25.4]}>
        <planeGeometry args={[13, 2.6]} />
        <meshStandardMaterial color="#0c0d10" emissive="#d5c5a1" emissiveIntensity={0.05} />
      </mesh>
    </group>
  )
}

function CameraWork({ mode }: { mode: GarageMode }) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 0.9, 0))
  const t = useRef(0)

  useFrame((_, rawDt) => {
    if (mode === 'inspect') return
    const dt = Math.min(rawDt, 0.05)
    t.current += dt
    if (mode === 'menu') {
      const a = t.current * 0.11 + 0.7
      const r = 11.6
      camera.position.lerp(new THREE.Vector3(Math.sin(a) * r, 4.0 + Math.sin(t.current * 0.3) * 0.25, Math.cos(a) * r), 1 - Math.exp(-1.4 * dt))
      look.current.lerp(new THREE.Vector3(0, 0.85, 0), 1 - Math.exp(-2 * dt))
    } else {
      const open = Math.min(1, t.current / 9)
      const r = 6.4 + open * 5.2
      const a = 2.2 + open * 0.9
      camera.position.lerp(new THREE.Vector3(Math.sin(a) * r, 2.1 - open * 0.4, Math.cos(a) * r + 1.2), 1 - Math.exp(-1.2 * dt))
      look.current.lerp(new THREE.Vector3(0, 0.9, 1.4), 1 - Math.exp(-2 * dt))
    }
    camera.lookAt(look.current)
  })
  return null
}

export function GarageScene({ mode = 'menu', phase = 0, lowGraphics = false }: { mode?: GarageMode; phase?: number; lowGraphics?: boolean }) {
  const turntable = useRef<THREE.Group>(null)
  const plate = useMemo(() => plateTexture(true), [])

  useFrame((_, dt) => {
    if (turntable.current && mode !== 'inspect') turntable.current.rotation.y += dt * 0.1
  })

  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 18, 62]} />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#2a3446', '#0a0a0c', 0.45]} />
      <Environment resolution={lowGraphics ? 64 : 256} frames={1}>
        <Lightformer intensity={2.4} position={[0, 10, 4]} scale={[16, 3, 1]} color="#eaf2ff" />
        <Lightformer intensity={1.6} position={[-10, 6, -6]} scale={[12, 6, 1]} color="#ffd9b0" />
        <Lightformer intensity={1.1} position={[12, 5, -4]} scale={[8, 4, 1]} color="#a82430" />
        <Lightformer form="ring" intensity={1.4} position={[0, 4, -10]} scale={6} color="#d5c5a1" />
      </Environment>

      <GarageShell phase={phase} mode={mode} />

      <group ref={turntable}>
        <CarModel showShadow={false} headlights={mode === 'intro' && phase >= 2} />
      </group>

      <ContactShadows position={[0, 0.03, 0]} opacity={0.75} scale={16} blur={2.6} far={5} color="#000000" />
      <CameraWork mode={mode} />

      {mode === 'inspect' && (
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={14}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.85, 0]}
          autoRotate
          autoRotateSpeed={0.6}
        />
      )}

      {/* inspection plate stand */}
      {mode === 'inspect' && (
        <group position={[0, 0.02, 4.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[1.6, 0.36]} />
            <meshStandardMaterial map={plate} roughness={0.5} />
          </mesh>
        </group>
      )}
    </>
  )
}
