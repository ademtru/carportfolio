import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SkidParticles = React.forwardRef(function SkidParticles(_props: any, ref: any) {
  const MAX = 256;
  const positions = useRef(new Float32Array(MAX * 3));
  const velocities = useRef(new Float32Array(MAX * 3));
  const ages = useRef(new Float32Array(MAX));
  const lives = useRef(new Float32Array(MAX));
  const poolIndex = useRef(0);
  const pointsRef = useRef<THREE.Points | null>(null);

  React.useMemo(() => {
    for (let i = 0; i < MAX; i++) {
      const i3 = i * 3;
      positions.current[i3] = 9999;
      positions.current[i3 + 1] = 9999;
      positions.current[i3 + 2] = 9999;
      ages.current[i] = 0;
      lives.current[i] = 0;
    }
    return null;
  }, []);

  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions.current, 3));
    return g;
  }, []);

  React.useImperativeHandle(ref, () => ({
    emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity = 1) => {
      const idx = poolIndex.current % MAX;
      poolIndex.current += 1;
      const i3 = idx * 3;
      positions.current[i3] = pos.x + (Math.random() - 0.5) * 0.1;
      positions.current[i3 + 1] = pos.y + 0.05 + (Math.random() - 0.5) * 0.05;
      positions.current[i3 + 2] = pos.z + (Math.random() - 0.5) * 0.1;

      const speed = 2 + 6 * intensity;
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
      const v = dir.clone().multiplyScalar(speed).add(jitter);
      velocities.current[i3] = v.x;
      velocities.current[i3 + 1] = v.y;
      velocities.current[i3 + 2] = v.z;

      const life = 0.45 + 0.4 * intensity;
      ages.current[idx] = life;
      lives.current[idx] = life;

      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    },
  } as any));

  useFrame((_, delta: number) => {
    const posArr = positions.current;
    const velArr = velocities.current;
    const aArr = ages.current;

    for (let i = 0; i < MAX; i++) {
      if (aArr[i] > 0) {
        const i3 = i * 3;
        velArr[i3 + 1] -= 9.8 * 0.18 * delta;
        posArr[i3] += velArr[i3] * delta;
        posArr[i3 + 1] += velArr[i3 + 1] * delta;
        posArr[i3 + 2] += velArr[i3 + 2] * delta;

        aArr[i] -= delta;
        if (aArr[i] <= 0) {
          posArr[i3] = 9999;
          posArr[i3 + 1] = 9999;
          posArr[i3 + 2] = 9999;
        }
      }
    }

    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (pointsRef.current) {
      const active = aArr.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = Math.min(1, 0.6 + active / 300);
    }
  });

  return (
    <points ref={pointsRef as any} geometry={geom} frustumCulled={false}>
      <pointsMaterial attach="material" color={0xcccccc} size={0.12} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
});

export default SkidParticles;
