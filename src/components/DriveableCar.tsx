import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";

type HUDRef = React.RefObject<{ speed: number; steer: number; drifting: boolean }>;

export default function DriveableCar({ modelScene, cameraRef, hudRef, emitterRef, startPosition, }: {
  modelScene?: THREE.Object3D | null;
  cameraRef?: React.RefObject<THREE.Group | null>;
  hudRef?: HUDRef;
  emitterRef?: React.RefObject<{ emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity?: number) => void } | null>;
  startPosition?: [number, number, number];
}) {
  const ownRef = useRef<THREE.Group | null>(null);
  const rigidRef = useRef<any | null>(null);
  const camAnchorRef = cameraRef ?? ownRef;
  const [carObject, setCarObject] = useState<THREE.Object3D | null>(null);
  const visualRef = useRef<THREE.Group | null>(null);

  const velocityDir = useRef(new THREE.Vector3(0, 0, -1));

  // Movement state
  const initialPos = startPosition ? new THREE.Vector3(...startPosition) : new THREE.Vector3(2, 0, -3);
  const position = useRef(initialPos.clone());
  const heading = useRef(Math.PI / 2); // face north by default
  const speed = useRef(0);

  // Inputs
  const keys = useRef<Record<string, boolean>>({});

  // Tunables
  const MAX_FORWARD = 60;
  const MAX_REVERSE = -6;
  const ACCELERATION = 12;
  const BRAKE_DECEL = 60;
  const COAST_DRAG = 8;
  const TURN_RATE = Math.PI * 1.8;
  const HANDBRAKE_DRAG = 20;

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!modelScene) { setCarObject(null); return; }
    const clone = modelScene.clone(true) as THREE.Object3D;
    clone.position.set(0,0,0);
    clone.scale.set(1,1,1);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetLength = 3.8;
    const targetHeight = 1.3;
    const s1 = targetLength / Math.max(size.z, 1e-4);
    const s2 = targetHeight / Math.max(size.y, 1e-4);
    const scale = Math.min(s1, s2);
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);

    const box2 = new THREE.Box3().setFromObject(clone);
    const c = new THREE.Vector3();
    box2.getCenter(c);
    const bottomY = box2.min.y;
    clone.position.x = -c.x;
    clone.position.z = -c.z;
    clone.position.y = -bottomY;
  // Rotate the visual model -90 degrees (clockwise when viewed from above)
  // This adjusts the model's local forward to match the controller's forward direction.
  clone.rotation.y += -Math.PI / 2;
  clone.updateMatrixWorld(true);

    setCarObject(clone);
  }, [modelScene]);

  useFrame((state: any, delta: number) => {
    const forwardInput = keys.current["KeyW"] ? 1 : keys.current["KeyS"] ? -1 : 0;
    const steerInput = keys.current["KeyA"] ? 1 : keys.current["KeyD"] ? -1 : 0;
    const handbrake = Boolean(keys.current["Space"]);

    if (forwardInput > 0) {
      speed.current += ACCELERATION * delta * forwardInput;
    } else if (forwardInput < 0) {
      speed.current -= ACCELERATION * delta * -forwardInput;
    } else {
      const drag = COAST_DRAG * delta;
      if (speed.current > 0) speed.current = Math.max(0, speed.current - drag);
      else speed.current = Math.min(0, speed.current + drag);
    }

    if (handbrake) {
      if (speed.current > 0) speed.current = Math.max(0, speed.current - HANDBRAKE_DRAG * delta);
      else speed.current = Math.min(0, speed.current + HANDBRAKE_DRAG * delta);
    }

    speed.current = Math.max(MAX_REVERSE, Math.min(MAX_FORWARD, speed.current));

    const speedNorm = Math.min(1, Math.abs(speed.current) / MAX_FORWARD);
    const steerCurve = Math.pow(speedNorm, 0.6);
    const lowSpeedAssist = 0.18;
    let turnScale = Math.max(steerCurve, lowSpeedAssist);
    const throttleFactor = forwardInput > 0 ? 1 + 0.2 * forwardInput : 1;
    const handbrakeFactor = handbrake ? 1.6 : 1;
    turnScale *= throttleFactor * handbrakeFactor;
    turnScale *= 1 - 0.5 * speedNorm;
    const directionSign = speed.current >= 0 ? 1 : -1;
    const turn = steerInput * TURN_RATE * turnScale * delta * directionSign;
    heading.current += turn;

    const forwardVec = new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0, heading.current, 0)).setY(0).normalize();
    const desiredDir = forwardVec.clone();
    const baseGrip = 0.88;
    const speedFactor = Math.min(1, Math.abs(speed.current) / MAX_FORWARD);
    const gripWhileDriving = baseGrip * (1 - 0.35 * speedFactor);
    const grip = handbrake ? 0.18 : gripWhileDriving;
    velocityDir.current.lerp(desiredDir, Math.max(0, grip) * Math.min(1, delta * 8));
    velocityDir.current.normalize();

    const nextPos = position.current.clone().addScaledVector(velocityDir.current, speed.current * delta);
    position.current.copy(nextPos);

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading.current, 0));

    const ROTATE_SPEED_THRESHOLD = 2.2;
    const rotateEnabled = handbrake || Math.abs(speed.current) > ROTATE_SPEED_THRESHOLD;

    try {
      if (rigidRef.current) {
        rigidRef.current.setNextKinematicTranslation({ x: nextPos.x, y: nextPos.y, z: nextPos.z });
        if (rotateEnabled) rigidRef.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      }
    } catch (e) { }

    if (camAnchorRef && (camAnchorRef as any).current) {
      try {
        (camAnchorRef as any).current.position.copy(nextPos);
        if (rotateEnabled) (camAnchorRef as any).current.quaternion.copy(q);
      } catch (err) { }
    }

    const rightVec = new THREE.Vector3(1,0,0).applyEuler(new THREE.Euler(0, heading.current, 0)).normalize();
    const lateralSpeed = rightVec.dot(velocityDir.current) * speed.current;
    const isDrifting = handbrake && Math.abs(lateralSpeed) > 0.8;

    try {
      const emitter = emitterRef && (emitterRef as any).current;
      if (emitter && Math.abs(lateralSpeed) > 0.6) {
        const rearOffset = forwardVec.clone().multiplyScalar(-1.4).setY(0.15);
        const rearPos = nextPos.clone().add(rearOffset);
        const intensity = Math.min(1, Math.abs(lateralSpeed) / 6);
        const emitDir = rightVec.clone().multiplyScalar(Math.sign(lateralSpeed) * -1).setY(0);
        emitter.emit(rearPos, emitDir, intensity);
      }
    } catch (err) {}

    if (visualRef.current) {
      const targetRoll = isDrifting ? -Math.sign(lateralSpeed) * Math.min(0.45, Math.abs(lateralSpeed) / 8) : 0;
      visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z || 0, targetRoll, Math.min(1, delta * 6));
    }

    if (hudRef && hudRef.current) {
      hudRef.current.speed = Math.round(speed.current * 10) / 10;
      hudRef.current.steer = steerInput;
      hudRef.current.drifting = !!(handbrake && Math.abs(velocityDir.current.dot(rightVec)) > 0.25);
    }
  });

  return (
    <RigidBody ref={(r: any | null) => { rigidRef.current = r; }} type={"kinematicPosition"} position={[initialPos.x, initialPos.y, initialPos.z]} rotation={[0, heading.current, 0]}>
      <group ref={ownRef as any}>
        <group ref={visualRef as any}>
          {carObject ? <primitive object={carObject} /> : <mesh>
            <boxGeometry args={[1.6, 0.5, 3]} />
            <meshStandardMaterial color={0xff0000} />
          </mesh>}
        </group>
      </group>
    </RigidBody>
  );
}
