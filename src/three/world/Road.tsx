import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Track } from '../../game/track'
import type { WorldPalette } from '../../game/themes'

function ribbonGeometry(track: Track, offset: number, width: number, yOff: number) {
  const n = track.samples.length
  const positions = new Float32Array(n * 6)
  const indices: number[] = []
  for (let i = 0; i < n; i++) {
    const sm = track.samples[i]
    const cx = sm.position.x + sm.right.x * offset
    const cz = sm.position.z + sm.right.z * offset
    const hw = width / 2
    positions[i * 6 + 0] = cx - sm.right.x * hw
    positions[i * 6 + 1] = sm.position.y + yOff
    positions[i * 6 + 2] = cz - sm.right.z * hw
    positions[i * 6 + 3] = cx + sm.right.x * hw
    positions[i * 6 + 4] = sm.position.y + yOff
    positions[i * 6 + 5] = cz + sm.right.z * hw
    if (i < n - 1) {
      const a = i * 2
      // Counter-clockwise seen from above so the road faces the sky.
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function terrainGeometry(track: Track, palette: WorldPalette, watery: boolean) {
  const offsets = [-190, -90, -34, -track.halfRoad - 0.8, track.halfRoad + 0.8, 34, 90, 190]
  const heights = watery
    ? [-2.4, -2.8, -2.4, 0, 0, 0.2, 0.5, 1.0]
    : [0.7, 0.35, 0.1, 0, 0, 0.15, 0.4, 0.9]
  const n = track.samples.length
  const cols = offsets.length
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const base = new THREE.Color(palette.ground)
  const alt = new THREE.Color(palette.groundAlt)
  for (let i = 0; i < n; i++) {
    const sm = track.samples[i]
    for (let j = 0; j < cols; j++) {
      const off = offsets[j]
      positions.push(
        sm.position.x + sm.right.x * off,
        sm.position.y + heights[j],
        sm.position.z + sm.right.z * off,
      )
      const t = (Math.sin(i * 0.7 + j * 1.3) * 0.5 + 0.5) * 0.55 + (j % 2 === 0 ? 0.2 : 0)
      const c = base.clone().lerp(alt, Math.min(1, t))
      colors.push(c.r, c.g, c.b)
    }
    if (i < n - 1) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j
        const b = a + 1
        const c = a + cols
        const d = c + 1
        indices.push(a, b, c, b, d, c)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function DashLines({ track, palette }: { track: Track; palette: WorldPalette }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = Math.max(1, Math.floor(track.length / 10))
  const geo = useMemo(() => new THREE.BoxGeometry(0.16, 0.02, 3.4), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.line, roughness: 0.6, metalness: 0.05, emissive: palette.line, emissiveIntensity: 0.06 }),
    [palette.line],
  )
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const s = (i + 0.5) * 10
      const t = Math.min(0.999, s / track.length)
      const idx = Math.round(t * (track.samples.length - 1))
      const sm = track.samples[idx]
      dummy.position.set(sm.position.x, sm.position.y + 0.045, sm.position.z)
      dummy.rotation.set(0, Math.atan2(sm.tangent.x, sm.tangent.z), 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      ref.current?.setMatrixAt(i, dummy.matrix)
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [track, count])
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

function Kerbs({ track, palette }: { track: Track; palette: WorldPalette }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = Math.max(2, Math.floor(track.length / 6) * 2)
  const geo = useMemo(() => new THREE.BoxGeometry(1.1, 0.12, 3), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.55 }), [palette.accent])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    let i = 0
    for (let s = 20; s < track.length - 60 && i < count - 1; s += 6) {
      const idx = Math.round((s / track.length) * (track.samples.length - 1))
      const sm = track.samples[idx]
      for (const side of [-1, 1]) {
        dummy.position.set(
          sm.position.x + sm.right.x * side * (track.halfRoad + 0.55),
          sm.position.y + 0.06,
          sm.position.z + sm.right.z * side * (track.halfRoad + 0.55),
        )
        dummy.rotation.set(0, Math.atan2(sm.tangent.x, sm.tangent.z), 0)
        dummy.updateMatrix()
        if (i < count) ref.current?.setMatrixAt(i, dummy.matrix)
        i++
      }
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [track, count])
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

function Tunnel({ track, palette }: { track: Track; palette: WorldPalette }) {
  const count = Math.max(1, Math.floor(track.length / 9))
  const ring = useMemo(() => new THREE.TorusGeometry(9.2, 0.55, 6, 18), [])
  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.85, metalness: 0.25 }), [])
  const lightGeo = useMemo(() => new THREE.BoxGeometry(0.3, 0.16, 3.2), [])
  const lightMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#fff6e2', emissive: palette.lampColor, emissiveIntensity: 3.4, roughness: 0.4 }),
    [palette.lampColor],
  )
  const rings = useRef<THREE.InstancedMesh>(null)
  const lights = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const s = (i + 0.5) * 9
      const idx = Math.min(track.samples.length - 1, Math.round((s / track.length) * (track.samples.length - 1)))
      const sm = track.samples[idx]
      const yaw = Math.atan2(sm.tangent.x, sm.tangent.z)
      dummy.position.set(sm.position.x, sm.position.y + 3.1, sm.position.z)
      dummy.rotation.set(0, yaw, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      rings.current?.setMatrixAt(i, dummy.matrix)
      if (lights.current) {
        for (let side = 0; side < 2; side++) {
          const dir = side === 0 ? 1 : -1
          const p = sm.position.clone().addScaledVector(sm.right, dir * (track.halfRoad - 0.5))
          dummy.position.set(p.x, sm.position.y + 5.2, p.z)
          dummy.rotation.set(0, yaw, 0)
          dummy.updateMatrix()
          lights.current.setMatrixAt(i * 2 + side, dummy.matrix)
        }
      }
    }
    if (rings.current) rings.current.instanceMatrix.needsUpdate = true
    if (lights.current) lights.current.instanceMatrix.needsUpdate = true
  }, [track, count])

  return (
    <group>
      <instancedMesh ref={rings} args={[ring, ringMat, count]} frustumCulled={false} />
      <instancedMesh ref={lights} args={[lightGeo, lightMat, count * 2]} frustumCulled={false} />
    </group>
  )
}

export function Road({ track, palette }: { track: Track; palette: WorldPalette }) {
  const level = track.level
  const watery = level.surface === 'lake' || level.surface === 'coast' || level.surface === 'riverside'

  const terrain = useMemo(() => terrainGeometry(track, palette, watery), [track, palette, watery])
  const road = useMemo(() => ribbonGeometry(track, 0, track.halfRoad * 2, 0.03), [track])
  const edgeL = useMemo(() => ribbonGeometry(track, -track.halfRoad + 0.45, 0.18, 0.045), [track])
  const edgeR = useMemo(() => ribbonGeometry(track, track.halfRoad - 0.45, 0.18, 0.045), [track])
  const shoulderL = useMemo(() => ribbonGeometry(track, -track.halfRoad - 0.9, 1.8, 0.015), [track])
  const shoulderR = useMemo(() => ribbonGeometry(track, track.halfRoad + 0.9, 1.8, 0.015), [track])
  const water = useMemo(
    () => (watery ? ribbonGeometry(track, -72, 95, -0.75) : null),
    [track, watery],
  )

  const roadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: palette.road,
        roughness: palette.roadRoughness,
        metalness: palette.roadMetalness,
        envMapIntensity: palette.wet ? 1.1 : 0.35,
      }),
    [palette],
  )
  const terrainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 }),
    [],
  )
  const lineMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.line, roughness: 0.5, emissive: palette.line, emissiveIntensity: 0.08 }),
    [palette.line],
  )
  const shoulderMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.groundAlt, roughness: 0.95 }),
    [palette.groundAlt],
  )
  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: palette.water,
        roughness: 0.08,
        metalness: 0.95,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 0.92,
      }),
    [palette.water],
  )

  return (
    <group>
      <mesh geometry={terrain} material={terrainMat} receiveShadow={false} frustumCulled={false} />
      <mesh geometry={shoulderL} material={shoulderMat} />
      <mesh geometry={shoulderR} material={shoulderMat} />
      <mesh geometry={road} material={roadMat} receiveShadow={false} />
      <mesh geometry={edgeL} material={lineMat} />
      <mesh geometry={edgeR} material={lineMat} />
      {water && <mesh geometry={water} material={waterMat} />}
      <DashLines track={track} palette={palette} />
      {level.surface === 'circuit' && <Kerbs track={track} palette={palette} />}
      {level.surface === 'tunnel' && <Tunnel track={track} palette={palette} />}
      {/* distant ground fill */}
      <mesh position={[0, -4.5, -track.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={palette.groundAlt} roughness={1} />
      </mesh>
    </group>
  )
}
