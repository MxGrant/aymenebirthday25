import { useMemo } from 'react'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'
import type { WorldPalette } from '../../game/themes'

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(bottomColor, topColor, pow(h, 0.72));
    vec3 dir = normalize(vDir);
    float d = max(dot(dir, normalize(sunDir)), 0.0);
    col += sunColor * pow(d, 120.0) * 1.6;
    col += sunColor * pow(d, 7.0) * 0.22;
    float horizon = smoothstep(0.55, 0.0, abs(vDir.y));
    col += sunColor * horizon * 0.05;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function SkyDome({ palette }: { palette: WorldPalette }) {
  const uniforms = useMemo(() => {
    const dir = new THREE.Vector3(...palette.sunPosition).normalize()
    return {
      topColor: { value: new THREE.Color(palette.skyTop) },
      bottomColor: { value: new THREE.Color(palette.skyBottom) },
      sunColor: { value: new THREE.Color(palette.sunColor) },
      sunDir: { value: dir },
    }
  }, [palette])

  return (
    <>
      <mesh renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[1200, 32, 20]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <fog attach="fog" args={[palette.fogColor, palette.fogNear, palette.fogFar]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 0.9]} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={palette.sunPosition} intensity={palette.sunIntensity} color={palette.sunColor} />
      {palette.stars && (
        <Stars radius={520} depth={60} count={1600} factor={5} saturation={0} fade speed={0.3} />
      )}
    </>
  )
}
