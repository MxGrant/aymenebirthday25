import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Track } from '../../game/track'
import type { WorldPalette } from '../../game/themes'
import { stationSignTexture, arrowTexture, chequerTexture } from '../textures'

const STATION_ACCENT: Record<string, string> = {
  premium: '#d5c5a1',
  neon: '#59e3ff',
  classic: '#c0392b',
  country: '#8fae6a',
  coastal: '#59c7c7',
  racing: '#e63946',
}

function Pump({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.2, 0.16, 1.4]} />
        <meshStandardMaterial color="#23262b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.95, 1.9, 0.62]} />
        <meshStandardMaterial color="#e9e6df" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.5, 0.33]}>
        <boxGeometry args={[0.62, 0.5, 0.04]} />
        <meshStandardMaterial color="#0c1a1a" emissive={accent} emissiveIntensity={1.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.98, 0.16, 0.66]} />
        <meshStandardMaterial color={accent} roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0.42, 1.05, 0.4]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#16181b" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function Station({ track, palette, levelId }: { track: Track; palette: WorldPalette; levelId: number }) {
  const accent = STATION_ACCENT[track.level.station.style] ?? '#d5c5a1'
  const beacon = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)
  const arrows = useRef<THREE.Mesh>(null)
  const isNight = palette.lamps || track.level.timeOfDay === 'night' || track.level.timeOfDay === 'sunset'
  const style = track.level.station.style
  const variant = (levelId - 1) % 4
  const canopyW = 29 - variant * 2.2
  const canopyD = 19 - variant * 1.6
  const pillarColor = style === 'country' ? '#6b5340' : style === 'racing' ? '#3b3f46' : '#2a2d33'
  const band2 = style === 'neon' ? '#ff5fd2' : style === 'coastal' ? '#2f9fb0' : style === 'country' ? '#7d8f5a' : style === 'racing' ? '#f5f5f5' : '#8a6f3f'

  const sign = useMemo(
    () => stationSignTexture(track.level.station.name, track.level.station.tagline, accent),
    [track.level.station, accent],
  )
  const arrow = useMemo(() => arrowTexture(), [])
  const chequer = useMemo(() => chequerTexture(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (beacon.current) {
      beacon.current.position.y = 8.4 + Math.sin(t * 2) * 0.15
      beacon.current.rotation.y = t * 0.8
    }
    if (beam.current) {
      const mat = beam.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.09 + Math.sin(t * 2.4) * 0.03
    }
    if (arrows.current) arrows.current.position.y = 2.6 + Math.sin(t * 2.2) * 0.12
  })

  return (
    <group position={[track.station.bay.x, track.samples[track.samples.length - 1].position.y, track.station.bay.z]} rotation={[0, track.station.bay.yaw, 0]}>
      {/* forecourt apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 12]}>
        <planeGeometry args={[92, 96]} />
        <meshStandardMaterial color={palette.road} roughness={palette.wet ? 0.3 : 0.78} metalness={palette.wet ? 0.4 : 0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 12]}>
        <ringGeometry args={[16, 16.3, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} roughness={0.4} />
      </mesh>

      {/* parking bay */}
      <group position={[0, 0.035, 0]}>
        {[
          [0, -6.2, 6.8, 0.16],
          [0, 6.2, 6.8, 0.16],
          [-3.4, 0, 0.16, 12.4],
          [3.4, 0, 0.16, 12.4],
        ].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} roughness={0.4} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.7]}>
          <planeGeometry args={[6.4, 11.4]} />
          <meshBasicMaterial color={accent} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* canopy — proportions vary per stop */}
      <group position={[0, 0, 4]}>
        <mesh position={[0, 6.4, 0]} castShadow>
          <boxGeometry args={[canopyW, 0.7, canopyD]} />
          <meshStandardMaterial color="#1c1f24" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 6.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[canopyW - 2, canopyD - 2]} />
          <meshStandardMaterial color="#f6f1e4" emissive={isNight ? '#fff3d6' : '#ffffff'} emissiveIntensity={isNight ? 1.9 : 0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, 6.78, 0]}>
          <boxGeometry args={[canopyW + 0.4, 0.12, canopyD + 0.4]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} roughness={0.4} />
        </mesh>
        <mesh position={[0, 6.62, 0]}>
          <boxGeometry args={[canopyW + 0.2, 0.1, canopyD + 0.2]} />
          <meshStandardMaterial color={band2} emissive={band2} emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
        {[
          [-(canopyW / 2 - 1.6), -(canopyD / 2 - 1.2)],
          [canopyW / 2 - 1.6, -(canopyD / 2 - 1.2)],
          [-(canopyW / 2 - 1.6), canopyD / 2 - 1.2],
          [canopyW / 2 - 1.6, canopyD / 2 - 1.2],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 3.1, z]}>
            <boxGeometry args={[0.45, 6.2, 0.45]} />
            <meshStandardMaterial color={pillarColor} roughness={0.55} metalness={0.45} />
          </mesh>
        ))}
        {isNight && <pointLight position={[0, 5.6, 0]} intensity={42} distance={42} decay={1.5} color="#fff0d0" />}
      </group>

      {style === 'racing' && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -5]}>
            <planeGeometry args={[canopyW, 1.4]} />
            <meshStandardMaterial map={chequer} roughness={0.6} />
          </mesh>
          {[-13.5, 13.5].map((x) => (
            <group key={x} position={[x, 0, -8]}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} position={[0, 0.3 + i * 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.55, 0.55, 0.44, 12]} />
                  <meshStandardMaterial color="#141418" roughness={0.95} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}
      {style === 'neon' && (
        <group>
          {[-(canopyW / 2 - 0.7), canopyW / 2 - 0.7].map((x) => (
            <mesh key={x} position={[x, 3.2, 4]}>
              <boxGeometry args={[0.12, 6, 0.12]} />
              <meshStandardMaterial color="#59e3ff" emissive="#59e3ff" emissiveIntensity={3} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
      {style === 'coastal' && (
        <group position={[-12, 0, -8]}>
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 8, 8]} />
            <meshStandardMaterial color="#b8bcc2" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[1.1, 6.8, 0]}>
            <boxGeometry args={[2.2, 1.2, 0.06]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      <Pump position={[7.2, 0, 2]} accent={accent} />
      <Pump position={[-7.2, 0, 2]} accent={accent} />

      {/* shop */}
      <group position={[17, 0, 4]}>
        <mesh position={[0, 2.8, 0]} castShadow>
          <boxGeometry args={[12, 5.6, 17]} />
          <meshStandardMaterial color="#22252a" roughness={0.6} metalness={0.25} />
        </mesh>
        <mesh position={[-6.02, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[13.5, 3.2]} />
          <meshStandardMaterial color="#0f1a20" emissive="#ffd9a0" emissiveIntensity={isNight ? 0.75 : 0.35} roughness={0.15} metalness={0.4} transparent opacity={0.92} />
        </mesh>
        <mesh position={[-6.1, 4.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[13.8, 1.5]} />
          <meshStandardMaterial map={sign} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[-6.06, 1.05, -3.6]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 2.1]} />
          <meshStandardMaterial color="#1d2b33" emissive="#9fe8ff" emissiveIntensity={0.25} roughness={0.2} metalness={0.5} />
        </mesh>
        {isNight && <pointLight position={[-3, 3.2, 0]} intensity={22} distance={26} decay={1.6} color="#ffe2b0" />}
      </group>

      {/* price totem */}
      <group position={[-16, 0, -2]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.7, 6, 0.7]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 7.2, 0]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[6.4, 3.4, 0.25]} />
          <meshStandardMaterial color="#14161a" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 7.2, 0.14]} rotation={[0, 0.35, 0]}>
          <planeGeometry args={[6.2, 3.2]} />
          <meshStandardMaterial map={sign} emissive="#ffffff" emissiveIntensity={isNight ? 0.9 : 0.2} roughness={0.5} />
        </mesh>
      </group>

      {/* beacon above the bay */}
      <mesh ref={beam} position={[0, 5, 0]}>
        <cylinderGeometry args={[2.6, 3.4, 12, 20, 1, true]} />
        <meshBasicMaterial color={accent} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={beacon} position={[0, 8.4, 0]}>
        <torusGeometry args={[1.5, 0.14, 8, 32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.6} roughness={0.3} />
      </mesh>
      <mesh ref={arrows} position={[0, 2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial map={arrow} transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {/* chequered welcome strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -9]}>
        <planeGeometry args={[8, 1.2]} />
        <meshStandardMaterial map={chequer} roughness={0.6} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -13]}>
        <planeGeometry args={[14, 1]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <group position={[0, 0, 20]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[9, 32]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.7} />
        </mesh>
      </group>

      <group position={[0, 0, 0]}>
        <mesh position={[10, 0.05, -6]}>
          <boxGeometry args={[0.2, 0.05, 5]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
        </mesh>
      </group>

      <group visible={levelId === 25}>
        <mesh position={[0, 10, 8]}>
          <torusGeometry args={[3.4, 0.18, 10, 48]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} roughness={0.2} metalness={0.6} />
        </mesh>
      </group>
    </group>
  )
}
