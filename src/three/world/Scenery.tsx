import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PropSpec, Track } from '../../game/track'
import type { WorldPalette } from '../../game/themes'
import { signTexture, windowTexture } from '../textures'

interface Transform {
  x: number
  y: number
  z: number
  rotY: number
  sx: number
  sy: number
  sz: number
}

function Instances({
  items,
  geometry,
  material,
  transform,
}: {
  items: PropSpec[]
  geometry: THREE.BufferGeometry
  material: THREE.Material
  transform: (p: PropSpec) => Transform
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = Math.max(1, items.length)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < items.length; i++) {
      const t = transform(items[i])
      dummy.position.set(t.x, t.y, t.z)
      dummy.rotation.set(0, t.rotY, 0)
      dummy.scale.set(t.sx, t.sy, t.sz)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.count = items.length
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, transform])
  return <instancedMesh ref={ref} args={[geometry, material, count]} visible={items.length > 0} frustumCulled={false} />
}

export function Scenery({ track, palette }: { track: Track; palette: WorldPalette }) {
  const byType = useMemo(() => {
    const map = new Map<string, PropSpec[]>()
    for (const p of track.props) {
      const arr = map.get(p.type) ?? []
      arr.push(p)
      map.set(p.type, arr)
    }
    return map
  }, [track])

  const g = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.28, 2.6, 7)
    trunk.translate(0, 1.3, 0)
    const canopy = new THREE.IcosahedronGeometry(1.75, 0)
    canopy.translate(0, 3.5, 0)
    const canopy2 = new THREE.IcosahedronGeometry(1.2, 0)
    canopy2.translate(0, 4.5, 0)
    const pineTrunk = new THREE.CylinderGeometry(0.12, 0.22, 1.8, 6)
    pineTrunk.translate(0, 0.9, 0)
    const pineBody = new THREE.ConeGeometry(1.35, 5.4, 8)
    pineBody.translate(0, 4.2, 0)
    const hedge = new THREE.BoxGeometry(3.2, 1.35, 1.3)
    hedge.translate(0, 0.65, 0)
    const fence = new THREE.BoxGeometry(3.4, 1, 0.12)
    fence.translate(0, 0.5, 0)
    const lampPole = new THREE.CylinderGeometry(0.08, 0.11, 6.6, 6)
    lampPole.translate(0, 3.3, 0)
    const lampHead = new THREE.BoxGeometry(0.75, 0.16, 0.34)
    lampHead.translate(0.28, 6.55, 0)
    const lampGlow = new THREE.SphereGeometry(0.42, 8, 6)
    lampGlow.translate(0.28, 6.45, 0)
    const signPole = new THREE.CylinderGeometry(0.07, 0.07, 2.8, 6)
    signPole.translate(0, 1.4, 0)
    const signPanel = new THREE.PlaneGeometry(2.3, 1.2)
    signPanel.translate(0, 2.9, 0)
    const signBack = new THREE.BoxGeometry(2.35, 1.25, 0.08)
    signBack.translate(0, 2.9, -0.05)
    const unitBox = new THREE.BoxGeometry(1, 1, 1)
    unitBox.translate(0, 0.5, 0)
    const roof = new THREE.ConeGeometry(0.72, 1, 4)
    roof.rotateY(Math.PI / 4)
    roof.translate(0, 0.5, 0)
    const mountain = new THREE.ConeGeometry(1, 1, 7)
    mountain.translate(0, 0.5, 0)
    const rock = new THREE.IcosahedronGeometry(1, 0)
    rock.translate(0, 0.45, 0)
    const tyre = new THREE.CylinderGeometry(0.62, 0.62, 1.7, 12)
    tyre.rotateZ(Math.PI / 2)
    tyre.translate(0, 0.62, 0)
    const canopyStall = new THREE.BoxGeometry(1, 0.14, 1)
    const bush = new THREE.IcosahedronGeometry(1, 0)
    bush.translate(0, 0.75, 0)
    return { trunk, canopy, canopy2, pineTrunk, pineBody, hedge, fence, lampPole, lampHead, lampGlow, signPole, signPanel, signBack, unitBox, roof, mountain, rock, tyre, canopyStall, bush }
  }, [])

  const mats = useMemo(() => {
    const foliage = new THREE.MeshStandardMaterial({ color: palette.foliage, roughness: 0.9, flatShading: true })
    const foliageAlt = new THREE.MeshStandardMaterial({ color: palette.foliageAlt, roughness: 0.92, flatShading: true })
    const trunk = new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: 0.95 })
    const hedge = new THREE.MeshStandardMaterial({ color: palette.foliageAlt, roughness: 0.95, flatShading: true })
    const fence = new THREE.MeshStandardMaterial({ color: '#6b5a45', roughness: 0.9 })
    const pole = new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.6, metalness: 0.6 })
    const lampHead = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: palette.lampColor, emissiveIntensity: palette.lamps ? 3.2 : 0.4, roughness: 0.4 })
    const glow = new THREE.MeshBasicMaterial({ color: palette.lampColor, transparent: true, opacity: palette.lamps ? 0.18 : 0.05, blending: THREE.AdditiveBlending, depthWrite: false })
    const buildingA = new THREE.MeshStandardMaterial({ map: windowTexture(97, palette.building, palette.window, `win-a-${palette.building}-${palette.window}`), roughness: 0.75, metalness: 0.15 })
    const buildingB = new THREE.MeshStandardMaterial({ map: windowTexture(311, palette.buildingAlt, palette.window, `win-b-${palette.buildingAlt}-${palette.window}`), roughness: 0.78, metalness: 0.15 })
    const house = new THREE.MeshStandardMaterial({ color: palette.building, roughness: 0.85 })
    const roofMat = new THREE.MeshStandardMaterial({ color: '#4a3b34', roughness: 0.9, flatShading: true })
    const rockMat = new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 0.95, flatShading: true })
    const mountainMat = new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 1, flatShading: true })
    const tyreMat = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.95 })
    const stallMat = new THREE.MeshStandardMaterial({ color: palette.buildingAlt, roughness: 0.7, metalness: 0.1 })
    const stallRoof = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.5, metalness: 0.2, emissive: palette.accent, emissiveIntensity: 0.12 })
    const signPoleMat = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.7, metalness: 0.5 })
    const signFace = new THREE.MeshStandardMaterial({ map: signTexture('A25', 'ROAD TRIP', palette.accent), roughness: 0.65, metalness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.04 })
    const signFace2 = new THREE.MeshStandardMaterial({ map: signTexture('25', 'STOPS', palette.accent), roughness: 0.65, metalness: 0.2 })
    const signBackMat = new THREE.MeshStandardMaterial({ color: '#20232a', roughness: 0.8 })
    const bushMat = new THREE.MeshStandardMaterial({ color: palette.foliage, roughness: 0.95, flatShading: true })
    return { foliage, foliageAlt, trunk, hedge, fence, pole, lampHead, glow, buildingA, buildingB, house, roofMat, rockMat, mountainMat, tyreMat, stallMat, stallRoof, signPoleMat, signFace, signFace2, signBackMat, bushMat }
  }, [palette])

  const trees = byType.get('tree') ?? []
  const pines = byType.get('pine') ?? []
  const hedges = byType.get('hedge') ?? []
  const fences = byType.get('fence') ?? []
  const lamps = byType.get('lamp') ?? []
  const signs = byType.get('sign') ?? []
  const buildings = byType.get('building') ?? []
  const towers = byType.get('tower') ?? []
  const houses = byType.get('house') ?? []
  const mountains = byType.get('mountain') ?? []
  const rocks = byType.get('rock') ?? []
  const tyres = byType.get('tyre') ?? []
  const stands = byType.get('grandstand') ?? []
  const stalls = byType.get('stall') ?? []
  const bushes = byType.get('bush') ?? []

  const uniform = (extra = 1) => (p: PropSpec): Transform => ({
    x: p.x,
    y: p.y,
    z: p.z,
    rotY: p.rotY,
    sx: p.scale * extra,
    sy: p.scale,
    sz: p.scale * extra,
  })

  return (
    <group>
      <Instances items={trees} geometry={g.trunk} material={mats.trunk} transform={uniform(1)} />
      <Instances items={trees} geometry={g.canopy} material={mats.foliage} transform={uniform(1)} />
      <Instances items={trees} geometry={g.canopy2} material={mats.foliageAlt} transform={uniform(1)} />

      <Instances items={pines} geometry={g.pineTrunk} material={mats.trunk} transform={uniform(1)} />
      <Instances items={pines} geometry={g.pineBody} material={mats.foliage} transform={uniform(1)} />

      <Instances items={hedges} geometry={g.hedge} material={mats.hedge} transform={uniform(1)} />
      <Instances items={fences} geometry={g.fence} material={mats.fence} transform={uniform(1)} />
      <Instances items={bushes} geometry={g.bush} material={mats.bushMat} transform={(p) => ({ ...uniform(1)(p), sy: p.scale * 0.8 })} />

      <Instances items={lamps} geometry={g.lampPole} material={mats.pole} transform={uniform(1)} />
      <Instances items={lamps} geometry={g.lampHead} material={mats.lampHead} transform={uniform(1)} />
      {palette.lamps && <Instances items={lamps} geometry={g.lampGlow} material={mats.glow} transform={uniform(1)} />}

      <Instances items={signs} geometry={g.signPole} material={mats.signPoleMat} transform={uniform(1)} />
      <Instances items={signs} geometry={g.signBack} material={mats.signBackMat} transform={uniform(1)} />
      <Instances items={signs.filter((s) => (s.variant ?? 0) < 0.5)} geometry={g.signPanel} material={mats.signFace} transform={uniform(1)} />
      <Instances items={signs.filter((s) => (s.variant ?? 0) >= 0.5)} geometry={g.signPanel} material={mats.signFace2} transform={uniform(1)} />

      <Instances
        items={buildings.filter((b) => (b.variant ?? 0) <= 0.55)}
        geometry={g.unitBox}
        material={mats.buildingA}
        transform={(p) => ({ x: p.x, y: p.y, z: p.z, rotY: p.rotY, sx: p.scale * 9, sy: p.height ?? 16, sz: p.scale * 9 })}
      />
      <Instances
        items={buildings.filter((b) => (b.variant ?? 0) > 0.55)}
        geometry={g.unitBox}
        material={mats.buildingB}
        transform={(p) => ({ x: p.x, y: p.y + 0.5, z: p.z, rotY: p.rotY, sx: p.scale * 7.5, sy: p.height ?? 16, sz: p.scale * 7.5 })}
      />
      <Instances
        items={towers}
        geometry={g.unitBox}
        material={mats.buildingB}
        transform={(p) => ({ x: p.x, y: p.y, z: p.z, rotY: p.rotY, sx: p.scale * 9, sy: p.height ?? 60, sz: p.scale * 9 })}
      />

      <Instances
        items={houses}
        geometry={g.unitBox}
        material={mats.house}
        transform={(p) => ({ x: p.x, y: p.y, z: p.z, rotY: p.rotY, sx: p.scale * 7, sy: p.height ?? 6, sz: p.scale * 5 })}
      />
      <Instances
        items={houses}
        geometry={g.roof}
        material={mats.roofMat}
        transform={(p) => ({ x: p.x, y: p.y + (p.height ?? 6), z: p.z, rotY: p.rotY, sx: p.scale * 7.8, sy: p.scale * 2.6, sz: p.scale * 5.8 })}
      />

      <Instances
        items={mountains}
        geometry={g.mountain}
        material={mats.mountainMat}
        transform={(p) => ({ x: p.x, y: p.y - 2, z: p.z, rotY: p.rotY, sx: p.scale * 90, sy: p.height ?? 110, sz: p.scale * 90 })}
      />
      <Instances items={rocks} geometry={g.rock} material={mats.rockMat} transform={uniform(1.1)} />
      <Instances items={tyres} geometry={g.tyre} material={mats.tyreMat} transform={uniform(1)} />

      <Instances
        items={stands}
        geometry={g.unitBox}
        material={mats.stallMat}
        transform={(p) => ({ x: p.x, y: p.y, z: p.z, rotY: p.rotY, sx: p.scale * 16, sy: 5.5, sz: p.scale * 9 })}
      />
      <Instances
        items={stands}
        geometry={g.unitBox}
        material={mats.stallRoof}
        transform={(p) => ({ x: p.x, y: p.y + 5.5, z: p.z, rotY: p.rotY, sx: p.scale * 18, sy: 0.5, sz: p.scale * 10 })}
      />

      <Instances
        items={stalls}
        geometry={g.unitBox}
        material={mats.stallMat}
        transform={(p) => ({ x: p.x, y: p.y, z: p.z, rotY: p.rotY, sx: p.scale * 3.4, sy: 2.4, sz: p.scale * 2.4 })}
      />
      <Instances
        items={stalls}
        geometry={g.canopyStall}
        material={mats.stallRoof}
        transform={(p) => ({ x: p.x, y: p.y + 2.5, z: p.z, rotY: p.rotY, sx: p.scale * 4.2, sy: 0.18, sz: p.scale * 3.2 })}
      />
    </group>
  )
}
