import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Environment, Lightformer, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CarModel } from './CarModel'

function glowCanvas(text: string, color: string, size = 512) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size / 2
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.font = `bold ${Math.floor(c.height * 0.8)}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 42
  ctx.fillStyle = color
  ctx.fillText(text, c.width / 2, c.height / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Fireworks({ low }: { low: boolean }) {
  const count = low ? 500 : 1600
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(
    () => ({
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      velocity: new Float32Array(count * 3),
      life: new Float32Array(count),
      cursor: 0,
      timer: 0,
    }),
    [count],
  )

  useMemo(() => {
    for (let i = 0; i < count; i++) data.positions[i * 3 + 1] = -200
  }, [data, count])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const pts = ref.current
    if (!pts) return
    data.timer -= dt
    if (data.timer <= 0) {
      data.timer = low ? 1.5 : 0.85
      const bursts = low ? 1 : 2
      for (let b = 0; b < bursts; b++) {
        const cx = (Math.random() - 0.5) * 60
        const cy = 22 + Math.random() * 20
        const cz = -30 + Math.random() * 34
        const hue = Math.random()
        const col = new THREE.Color().setHSL(hue, 0.85, 0.62)
        const per = low ? 55 : 85
        for (let i = 0; i < per; i++) {
          const idx = data.cursor % count
          data.cursor++
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const speed = 6 + Math.random() * 12
          data.positions[idx * 3] = cx
          data.positions[idx * 3 + 1] = cy
          data.positions[idx * 3 + 2] = cz
          data.velocity[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed
          data.velocity[idx * 3 + 1] = Math.cos(phi) * speed
          data.velocity[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
          data.colors[idx * 3] = col.r
          data.colors[idx * 3 + 1] = col.g
          data.colors[idx * 3 + 2] = col.b
          data.life[idx] = 1.4 + Math.random() * 1.4
        }
      }
    }

    for (let i = 0; i < count; i++) {
      if (data.life[i] <= 0) continue
      data.life[i] -= dt
      data.velocity[i * 3 + 1] -= 7.4 * dt
      data.positions[i * 3] += data.velocity[i * 3] * dt
      data.positions[i * 3 + 1] += data.velocity[i * 3 + 1] * dt
      data.positions[i * 3 + 2] += data.velocity[i * 3 + 2] * dt
      if (data.life[i] <= 0) data.positions[i * 3 + 1] = -200
    }

    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = pts.geometry.getAttribute('color') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.55} sizeAttenuation vertexColors transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Confetti({ low }: { low: boolean }) {
  const count = low ? 160 : 420
  const ref = useRef<THREE.InstancedMesh>(null)
  const parts = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 70,
        y: Math.random() * 40,
        z: (Math.random() - 0.5) * 60 - 10,
        vy: 1.4 + Math.random() * 2.6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 3,
        scale: 0.18 + Math.random() * 0.22,
      })),
    [count],
  )
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 }), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const arr = ['#d5c5a1', '#a82430', '#f5f5f5', '#b8b8b8', '#e7b25a']
    const list = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const c = new THREE.Color(arr[i % arr.length])
      list[i * 3] = c.r
      list[i * 3 + 1] = c.g
      list[i * 3 + 2] = c.b
    }
    return list
  }, [count])

  useLayoutEffect(() => {
    if (!ref.current) return
    const attr = new THREE.InstancedBufferAttribute(colors, 3)
    ref.current.instanceColor = attr
    attr.needsUpdate = true
  }, [colors, count])

  useFrame((state, rawDt) => {
    if (!ref.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      p.y -= p.vy * dt
      p.rot += p.vr * dt
      if (p.y < -1) p.y = 38 + Math.random() * 6
      dummy.position.set(p.x + Math.sin(t * 0.6 + i) * 0.6, p.y, p.z)
      dummy.rotation.set(p.rot, p.rot * 0.8, p.rot * 1.4)
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

function OrbitCamera() {
  const { camera } = useThree()
  const t = useRef(0)
  const look = useRef(new THREE.Vector3(0, 1.1, 0))
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    t.current += dt
    const angle = 2.2 + t.current * 0.16
    const radius = 10.5 + Math.sin(t.current * 0.18) * 1.6
    camera.position.lerp(new THREE.Vector3(Math.sin(angle) * radius, 2.4 + Math.sin(t.current * 0.3) * 0.3, Math.cos(angle) * radius), 1 - Math.exp(-1.6 * dt))
    look.current.lerp(new THREE.Vector3(0, 1.05, 0), 1 - Math.exp(-2.4 * dt))
    camera.lookAt(look.current)
  })
  return null
}

export function FinaleScene({ lowGraphics = false }: { lowGraphics?: boolean }) {
  const glow25 = useMemo(() => glowCanvas('25', '#ffd7a0'), [])
  const beamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffd9a8', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    [],
  )

  return (
    <>
      <color attach="background" args={['#04050a']} />
      <fog attach="fog" args={['#06080f', 40, 220]} />
      <Stars radius={380} depth={50} count={lowGraphics ? 800 : 1800} factor={5} saturation={0} fade speed={0.2} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#2a3550', '#0a0a0e', 0.6]} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#9fb8ff" />

      <Environment resolution={lowGraphics ? 64 : 128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 8, 5]} scale={[20, 6, 1]} color="#ffd9a8" />
        <Lightformer intensity={1.2} position={[-14, 6, -6]} scale={[10, 8, 1]} color="#a82430" />
        <Lightformer intensity={1.6} position={[0, 12, -10]} scale={[8, 4, 1]} color="#ffe9c9" />
      </Environment>

      {/* plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[220, 220]} />
        <meshPhysicalMaterial color="#0b0d11" metalness={0.78} roughness={0.22} clearcoat={1} envMapIntensity={1.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}>
        <circleGeometry args={[7.4, 64]} />
        <meshStandardMaterial color="#131519" metalness={0.8} roughness={0.24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 2]}>
        <ringGeometry args={[7.4, 7.62, 64]} />
        <meshStandardMaterial color="#d5c5a1" emissive="#d5c5a1" emissiveIntensity={2.2} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 2]}>
        <planeGeometry args={[3.2, 22]} />
        <meshStandardMaterial color="#5a1820" roughness={0.55} metalness={0.1} />
      </mesh>

      {/* building */}
      <group position={[0, 0, -34]}>
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[54, 20, 18]} />
          <meshStandardMaterial color="#0e1016" roughness={0.65} metalness={0.35} />
        </mesh>
        <mesh position={[0, 4.6, 9.1]}>
          <planeGeometry args={[30, 8.4]} />
          <meshStandardMaterial color="#101821" emissive="#ffd9a0" emissiveIntensity={0.5} metalness={0.6} roughness={0.15} />
        </mesh>
        <mesh position={[0, 2.2, 9.15]}>
          <planeGeometry args={[9, 4.4]} />
          <meshStandardMaterial color="#1a1208" emissive="#ffcf8a" emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
        {[-18, -12, -6, 6, 12, 18].map((x) => (
          <mesh key={x} position={[x, 13.5, 9.1]}>
            <planeGeometry args={[2.4, 6]} />
            <meshStandardMaterial color="#0e1620" emissive="#ffe6bb" emissiveIntensity={0.55} roughness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, 19.6, 9.2]}>
          <planeGeometry args={[14, 7]} />
          <meshBasicMaterial map={glow25} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh position={[0, 1.9, 12]}>
          <boxGeometry args={[5.2, 0.4, 5.6]} />
          <meshStandardMaterial color="#14161b" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>

      {/* vertical celebration beams */}
      {[-24, -12, 12, 24].map((x, i) => (
        <group key={x} position={[x, 0, -16 - (i % 2) * 6]}>
          <mesh position={[0, 13, 0]} material={beamMat}>
            <cylinderGeometry args={[0.5, 2.6, 26, 14, 1, true]} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[1.1, 1.1, 0.6, 16]} />
            <meshStandardMaterial color="#1a1c21" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}

      <group position={[0, 0, 2]}>
        <CarModel showShadow={false} headlights />
      </group>

      <Fireworks low={lowGraphics} />
      <Confetti low={lowGraphics} />
      <OrbitCamera />
    </>
  )
}
