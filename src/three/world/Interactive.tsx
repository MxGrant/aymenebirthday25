import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { pointOnTrack, type Collectible, type Gate, type Track } from '../../game/track'
import type { WorldPalette } from '../../game/themes'

const KIND_COLOR: Record<string, string> = {
  fuel: '#ff5a3c',
  sweet: '#ff8fc7',
  food: '#ffc45c',
  star: '#ffe9a8',
  badge: '#cfd6df',
  token: '#69e9ff',
}

export function Collectibles({ track, collected }: { track: Track; collected: string[] }) {
  const group = useRef<THREE.Group>(null)
  const items = track.collectibles
  useFrame((state) => {
    if (group.current) group.current.rotation.y = state.clock.elapsedTime * 0.6
  })
  return (
    <group ref={group}>
      {items.map((c: Collectible) => {
        const taken = collected.includes(c.id)
        if (taken) return null
        const color = KIND_COLOR[c.kind] ?? '#ffd27a'
        return (
          <group key={c.id} position={[c.position.x, c.position.y, c.position.z]}>
            <mesh>
              <octahedronGeometry args={[0.62, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} metalness={0.7} roughness={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.15, 0.045, 6, 26]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
              <circleGeometry args={[0.9, 20]} />
              <meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function Gates({ track, passed }: { track: Track; passed: number }) {
  const glow = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (glow.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02
      glow.current.scale.set(s, 1, s)
    }
  })
  return (
    <group>
      {track.gates.map((g: Gate, i) => {
        const done = i < passed
        const next = i === passed
        const color = done ? '#3c7d52' : next ? '#ffd47a' : '#5d6773'
        return (
          <group key={i} position={[g.position.x, g.position.y, g.position.z]} rotation={[0, g.yaw, 0]}>
            <group ref={next ? glow : undefined}>
              {[-5.4, 5.4].map((x) => (
                <mesh key={x} position={[x, 3.1, 0]}>
                  <boxGeometry args={[0.3, 6.2, 0.3]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={done ? 0.6 : 2.2} roughness={0.35} metalness={0.6} />
                </mesh>
              ))}
              <mesh position={[0, 6.1, 0]}>
                <boxGeometry args={[11.1, 0.34, 0.34]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={done ? 0.5 : 2.4} roughness={0.35} metalness={0.5} />
              </mesh>
              {!done && (
                <mesh position={[0, 2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[10.4, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              )}
            </group>
          </group>
        )
      })}
    </group>
  )
}

interface TrafficCar {
  s: number
  speed: number
  lane: number
  color: string
  dir: 1 | -1
}

const TRAFFIC_COLORS = ['#b8b8b8', '#2f3640', '#7d1f28', '#1f3b57', '#d9d4c6', '#384a3a']

function SimpleCar({ color, dir }: { color: string; dir: 1 | -1 }) {
  return (
    <group rotation={[0, dir === 1 ? 0 : Math.PI, 0]}>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.82, 0.62, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.12, -0.2]}>
        <boxGeometry args={[1.6, 0.55, 2]} />
        <meshStandardMaterial color="#0d1116" metalness={0.5} roughness={0.15} />
      </mesh>
      {[
        [0.78, 1.35],
        [-0.78, 1.35],
        [0.78, -1.35],
        [-0.78, -1.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.2, 12]} />
          <meshStandardMaterial color="#0c0c0e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 2.11]}>
        <boxGeometry args={[1.4, 0.12, 0.06]} />
        <meshStandardMaterial color="#fff6e0" emissive="#fff6e0" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, 0.72, -2.11]}>
        <boxGeometry args={[1.4, 0.12, 0.06]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff2b2b" emissiveIntensity={1.8} />
      </mesh>
    </group>
  )
}

export function Traffic({ track, count, register }: { track: Track; count: number; register: (cars: TrafficCar[], positions: { x: number; z: number }[]) => void }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const positions = useMemo(() => Array.from({ length: count }, () => ({ x: 0, z: 0 })), [count])
  const cars = useMemo(() => {
    const out: TrafficCar[] = []
    for (let i = 0; i < count; i++) {
      out.push({
        s: 70 + (i / Math.max(1, count)) * (track.length - 140),
        speed: 11 + (i % 4) * 2.5,
        lane: i % 2 === 0 ? track.halfRoad * 0.42 : -track.halfRoad * 0.42,
        color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
        dir: i % 5 === 0 ? -1 : 1,
      })
    }
    return out
  }, [count, track])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]
      c.s += c.speed * step * c.dir
      if (c.s > track.length - 40) {
        c.s = 30
        c.dir = 1
      }
      if (c.s < 24) {
        c.s = track.length - 50
        c.dir = -1
      }
      const p = pointOnTrack(track, c.s, c.lane)
      const g = refs.current[i]
      if (g) {
        g.position.set(p.x, p.y + 0.02, p.z)
        const ahead = pointOnTrack(track, Math.max(0, Math.min(track.length, c.s + 2 * c.dir)), c.lane)
        g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z)
      }
      positions[i] = { x: p.x, z: p.z }
    }
    register(cars, positions)
  })

  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <SimpleCar color={c.color} dir={c.dir} />
        </group>
      ))}
    </group>
  )
}

export function Rain({ palette, active }: { palette: WorldPalette; active: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const count = 1500
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 70
      arr[i * 3 + 1] = Math.random() * 40
      arr[i * 3 + 2] = (Math.random() - 0.5) * 70
    }
    return arr
  }, [])

  useFrame((state, dt) => {
    if (!active || !ref.current) return
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const speed = 42 * Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speed
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 40
        arr[i * 3] = (Math.random() - 0.5) * 70
        arr[i * 3 + 2] = (Math.random() - 0.5) * 70
      }
    }
    attr.needsUpdate = true
    const cam = state.camera.position
    ref.current.position.set(cam.x, 0, cam.z)
  })

  if (!active) return null
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={palette.wet ? '#cfe3ef' : '#9fb6c4'} size={0.09} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  )
}

export function StartLights({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 2]} />
        <meshStandardMaterial color="#d8d8d2" roughness={0.7} />
      </mesh>
    </group>
  )
}
