import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function ThirdPersonCamera({ targetRef }: { targetRef: React.RefObject<THREE.Group | null> }) {
  const { camera, gl } = useThree();
  // default follow offset when user isn't orbiting
  const desiredOffset = useRef(new THREE.Vector3(0, 2.5, 6));

  // orbital controls state (spherical coordinates)
  const azimuth = useRef(0); // horizontal angle
  const polar = useRef(Math.PI / 4); // vertical angle (from Y up)
  const radius = useRef(6);
  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const userInteracting = useRef(false);

  // sensitivity / clamp params
  const rotateSpeed = 0.005; // radians per pixel
  const zoomSpeed = 0.002; // per wheel delta
  const minPolar = 0.15;
  const maxPolar = Math.PI / 2 - 0.05;
  const minRadius = 2.0;
  const maxRadius = 20.0;

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // Only start dragging on primary or secondary button (left/right)
      if (e.button !== 0 && e.button !== 2) return;
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      userInteracting.current = true;
      // prevent context menu on right-click drag
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !lastPos.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      azimuth.current -= dx * rotateSpeed;
      polar.current -= dy * rotateSpeed;
      polar.current = Math.max(minPolar, Math.min(maxPolar, polar.current));
    };

    const onPointerUp = (_e: PointerEvent) => {
      isDragging.current = false;
      lastPos.current = null;
      // schedule a short timeout to keep userInteracting true for a bit so camera doesn't pop
      setTimeout(() => (userInteracting.current = false), 200);
    };

    const onWheel = (e: WheelEvent) => {
      // zoom in/out
      const delta = e.deltaY;
      radius.current = Math.max(minRadius, Math.min(maxRadius, radius.current + delta * zoomSpeed * radius.current));
      userInteracting.current = true;
      // clear after a short delay
      setTimeout(() => (userInteracting.current = false), 200);
    };

    // Attach to the canvas (renderer.domElement) so only camera area interactions are used
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel as any);
    };
  }, [gl.domElement]);

  useFrame(() => {
    const t = targetRef.current;
    if (!t) return;
    const worldPos = new THREE.Vector3();
    t.getWorldPosition(worldPos);

    // If user is not interacting, use the behind-the-target default offset (based on target orientation)
    let desiredCamPos: THREE.Vector3;
    if (!userInteracting.current) {
      const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(t.quaternion).multiplyScalar(desiredOffset.current.z);
      const up = new THREE.Vector3(0, desiredOffset.current.y, 0);
      desiredCamPos = worldPos.clone().add(behind).add(up);
      // update spherical values to match the default behind position so transitions are smooth
      const dir = desiredCamPos.clone().sub(worldPos);
      const r = dir.length();
      radius.current = THREE.MathUtils.lerp(radius.current, r, 0.06);
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(dir);
      azimuth.current = THREE.MathUtils.lerp(azimuth.current, spherical.theta, 0.06);
      polar.current = THREE.MathUtils.lerp(polar.current, spherical.phi, 0.06);
    } else {
      // compute camera position from spherical coords relative to target
      const spherical = new THREE.Spherical(radius.current, polar.current, azimuth.current);
      const offset = new THREE.Vector3().setFromSpherical(spherical);
      desiredCamPos = worldPos.clone().add(offset);
    }

    // smooth camera movement and lookAt
    camera.position.lerp(desiredCamPos, 0.12);
    camera.lookAt(worldPos);
  });

  return null;
}
