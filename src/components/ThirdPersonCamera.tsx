import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function ThirdPersonCamera({ targetRef }: { targetRef: React.RefObject<THREE.Group | null> }) {
  const { camera } = useThree();
  const desiredOffset = new THREE.Vector3(0, 2.5, 6);
  useFrame(() => {
    const t = targetRef.current;
    if (!t) return;
    const worldPos = new THREE.Vector3();
    t.getWorldPosition(worldPos);

    const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(t.quaternion).multiplyScalar(desiredOffset.z);
    const up = new THREE.Vector3(0, desiredOffset.y, 0);
    const camPos = worldPos.clone().add(behind).add(up);

    camera.position.lerp(camPos, 0.12);
    camera.lookAt(worldPos);
  });
  return null;
}
