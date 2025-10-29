import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text3D, Center, Sky, Edges } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect } from "react";
import * as THREE from "three";

type HoldProps = {
  position: [number, number, number];
  color?: number;
};

function Hold({ position, color = 0xffa500 }: HoldProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      castShadow
    >
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial
        color={hovered ? 0xff0000 : color}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}

function Wall({
  position,
  rotationY = 0,
  width = 8,
  height = 4,
  depth = 0.2,
  color = 0x8b4513,
}: any) {
  return (
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Mat({
  position,
  width = 16,
  depth = 4,
  height = 0.2,
  color = 0x222222,
}: any) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function FloatingText({ position = [0, 2, -6], text = "", color = "#ffffff" }: { position?: [number, number, number]; text?: string; color?: string; }) {
  // Use the TTF placed in public/fonts as the font for troika-based Text.
  // Use local typeface.json placed in public/fonts. Use Text3D for real extrusion.
  const fontUrl = encodeURI("/fonts/Jersey_10/Jersey 10_Regular.json");
  const size = 1.6;
  const height = 0.55;
  const bevelEnabled = true;
  const bevelThickness = 0.04;
  const bevelSize = 0.04;

  return (
    <group position={position as any}>
      <Center>
        <Text3D
          font={fontUrl}
          size={size}
          height={height}
          bevelEnabled={bevelEnabled}
          bevelThickness={bevelThickness}
          bevelSize={bevelSize}
          curveSegments={12}
        >
          {text}
          {/* main white material */}
          <meshStandardMaterial attach="material" color={0xffffff} roughness={0} metalness={0.0} />
          {/* thin black outline using Edges for a crisp border */}
          <Edges threshold={15} color={0x000000} />
        </Text3D>
      </Center>
    </group>
  );
}

function SceneContent({ wallCount = 2, hudRef }: { wallCount?: number; hudRef?: React.RefObject<{ speed: number; steer: number; drifting: boolean }>; }) {
  // Prefer the 'mes-climbing-gym' model (exists in public models)
  const publicPath = "/models/mes-climbing-gym/mesa_rim_climbing_gym.glb";
  const fallbackPublic = "/models/mphc-climbing-gym-22824/source/poly.glb";
  const srcPath = "/src/models/mphc-climbing-gym-22824/source/poly.glb";
  const [gltfScene, setGltfScene] = React.useState<any>(null);
  const [rx7Scene, setRx7Scene] = React.useState<any>(null);
  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();

    const tryLoad = async (url: string) => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok) throw new Error("not found");
      } catch (err) {
        return false;
      }
      return new Promise<boolean>((resolve) => {
        loader.load(
          url,
          (gltf) => {
            if (!mounted) return resolve(true);
            setGltfScene(gltf.scene);
            resolve(true);
          },
          undefined,
          () => resolve(false)
        );
      });
    };

    (async () => {
      // // prefer mes-climbing-gym public path
      // let ok = await tryLoad(publicPath);
      // if (!ok) {
      //     // try fallback public model
      //     ok = await tryLoad(fallbackPublic);
      // }
      // if (!ok) {
      //     // try src path (may not be served in production)
      //     await tryLoad(srcPath);
      // }

      // try loading RX7 car model if present in public
      const rx7Path = "/models/mazda_rx7_stylised.glb";
      try {
        const response = await fetch(rx7Path, { method: "HEAD" });
        if (response.ok) {
          // load it
          const loader2 = new GLTFLoader();
          loader2.load(rx7Path, (g) => setRx7Scene(g.scene));
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // optional: fallback procedural holds if model isn't present
  const holds = useMemo(() => {
    return [
      [0.5, 1.2, -1.2],
      [-0.8, 1.6, -1.0],
      [1.2, 2.0, -0.5],
    ] as [number, number, number][];
  }, []);

  function ModelWrapper({ object }: { object: THREE.Object3D }) {
    const ref = React.useRef<THREE.Group>(null!);

    React.useEffect(() => {
      if (!object) return;
      // compute bbox
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // desired max height in scene units
      const desiredHeight = 4; // tune this to fit the gym in the view
      const scale = desiredHeight / Math.max(size.y, 0.0001);

      // apply scale and reposition so bottom sits on y=0
      object.scale.setScalar(scale);
      object.updateMatrixWorld(true);

      // recompute bbox after scaling
      const box2 = new THREE.Box3().setFromObject(object);
      const size2 = new THREE.Vector3();
      box2.getSize(size2);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);

      // translate so center.xz -> 0 and bottom y -> 0
      const bottomY = box2.min.y;
      object.position.x = -center2.x;
      object.position.z = -center2.z;
      object.position.y = -bottomY;

      // ensure matrix updates
      object.updateMatrixWorld(true);
    }, [object]);

    return <group ref={ref}>{object && <primitive object={object} />}</group>;
  }

  useFrame(() => {
    // optional: subtle animation or update
  });

  function Clouds({ count = 8 }: { count?: number }) {
    // Load low-poly cloud GLB from public/models and scatter copies
    const gltf = useGLTF("/models/low_poly_cloud.glb") as any;
    const cloudScene = gltf?.scene;

    const instances = React.useMemo(() => {
      return Array.from({ length: count }).map(() => {
        return {
          pos: [(Math.random() - 0.5) * 60, 6 + Math.random() * 10, -20 - Math.random() * 160],
          // smaller scales: range ~0.6 -> 1.5
          scale: 0.6 + Math.random() * 0.9,
          rotY: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.6 + 0.15) * (Math.random() > 0.5 ? 1 : -1), // units per second
        };
      });
    }, [count]);
    const cloudRefs = React.useRef<Array<THREE.Group | null>>([]);

    useFrame((_, delta) => {
      for (let i = 0; i < instances.length; i++) {
        const g = cloudRefs.current[i];
        if (!g) continue;
        // move horizontally (X axis) based on assigned speed
        g.position.x += (instances[i].speed as number) * delta;
        // wrap around when off-screen to keep clouds in view
        const limit = 40;
        if (g.position.x > limit) g.position.x = -limit;
        if (g.position.x < -limit) g.position.x = limit;
      }
    });

    return (
      <group>
        {instances.map((it, i) => (
          <group
            key={i}
            ref={(r) => (cloudRefs.current[i] = r)}
            position={it.pos as any}
            rotation={[0, it.rotY, 0]}
            scale={[it.scale, it.scale, it.scale]}
          >
            {cloudScene ? <primitive object={cloudScene.clone(true)} /> : null}
          </group>
        ))}
      </group>
    );
  }

  // Driveable car + third-person camera
  function DriveableCar({
    modelScene,
    targetRef,
    hudRef,
    emitterRef,
  }: {
    modelScene?: THREE.Object3D | null;
    targetRef?: React.RefObject<THREE.Group | null>;
    hudRef?: React.RefObject<{ speed: number; steer: number; drifting: boolean }>;
    emitterRef?: React.RefObject<{ emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity?: number) => void } | null>;
  }) {
    const ownRef = useRef<THREE.Group | null>(null);
    const ref = targetRef ?? ownRef;
    const [carObject, setCarObject] = useState<THREE.Object3D | null>(null);
    const velocity = useRef(new THREE.Vector3());
    const forward = useRef(0);
    const steer = useRef(0);
    const keys = useRef<Record<string, boolean>>({});
  const prevDrift = useRef(false);
  const driftEmitTimer = useRef(0);
  const driftState = useRef(false); // whether we're currently in a sustained drift (throttle-driven)
  const driftDir = useRef(0);
  const driftCharge = useRef(0); // seconds of sustained drift conditions

    // simple car parameters
    const maxSpeed = 24; // units/s
    const accel = 12; // units/s^2
    const brake = 8;
    const turnSpeed = 1.5; // radians/s at low speed

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => (keys.current[e.code] = true);
      const onKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, []);

    // Auto-fit and position the car model so it's a reasonable size and sits on the floor
    useEffect(() => {
      if (!modelScene) {
        setCarObject(null);
        return;
      }
      // clone to avoid mutating original
      const clone = modelScene.clone(true) as THREE.Object3D;
      clone.position.set(0, 0, 0);
      clone.scale.set(1, 1, 1);
      clone.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      box.getSize(size);

      // target dimensions (sensible defaults)
      const desiredLength = 3.8; // front-to-back length
      const desiredHeight = 1.3; // vehicle height

      const scaleByLength = desiredLength / Math.max(size.z, 0.0001);
      const scaleByHeight = desiredHeight / Math.max(size.y, 0.0001);
      // choose a scale that fits both constraints
      const chosenScale = Math.min(scaleByLength, scaleByHeight);

      clone.scale.setScalar(chosenScale);
      clone.updateMatrixWorld(true);

      // recompute bbox after scaling
      const box2 = new THREE.Box3().setFromObject(clone);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);
      const bottomY = box2.min.y;

      // If the model's longest axis is X rather than Z, rotate so length aligns with Z
      const sizeAfter = new THREE.Vector3();
      box2.getSize(sizeAfter);
      const longestAxis = Math.max(sizeAfter.x, sizeAfter.y, sizeAfter.z);
      if (longestAxis === sizeAfter.x && sizeAfter.x > sizeAfter.z) {
        // rotate 180 degrees so model faces the -Z forward direction
        // (some models may be authored facing +Z or +X; apply a 180deg flip)
        clone.rotateY(Math.PI / -2);
        clone.updateMatrixWorld(true);
        // recompute bounding box after rotation
        const box3 = new THREE.Box3().setFromObject(clone);
        box3.getCenter(center2);
        // update bottomY as well
        const bottomAfter = box3.min.y;
        // shift down later using bottomAfter
        // we'll recompute box2 below by setting box2 = box3
        box2.copy(box3);
      }

      // center XZ and place bottom at y=0
      clone.position.x = -center2.x;
      clone.position.z = -center2.z;
      clone.position.y = -bottomY;
      clone.updateMatrixWorld(true);

      setCarObject(clone);
    }, [modelScene]);

    useFrame((_, delta) => {
      if (!ref.current) return;
      // read inputs: W/S accelerate/brake, A/D steer
      const k = keys.current;
      const inputForward = k["KeyW"] ? 1 : k["KeyS"] ? -1 : 0;
      const inputSteer = k["KeyA"] ? 1 : k["KeyD"] ? -1 : 0;

      // smooth inputs
      forward.current += (inputForward - forward.current) * Math.min(1, accel * delta);
      steer.current += (inputSteer - steer.current) * Math.min(1, 8 * delta);

      // compute forward direction and project current velocity onto it
      const forwardVec = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(ref.current.quaternion)
        .setY(0)
        .normalize();

      // signed forward speed along the car's forward vector
      const forwardSpeed = velocity.current.dot(forwardVec);

      // target speed from input (local space)
      const localForwardTarget = forward.current * maxSpeed;

      // If there's throttle or reverse input, accelerate toward target.
      // If there's no forward input, allow the car to coast with light rolling resistance
      if (Math.abs(inputForward) > 0.001) {
        const desiredSpeed = localForwardTarget;
        const speedDiff = desiredSpeed - forwardSpeed;
        const dv = Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), accel * delta);
        velocity.current.add(forwardVec.clone().multiplyScalar(dv));
      } else {
        // coast: gentle rolling resistance instead of forcing speed toward zero
        const rollingResistance = 1.5; // units/s^2 - small slow-down when coasting
        const dvCoast = -Math.sign(forwardSpeed) * Math.min(Math.abs(forwardSpeed), rollingResistance * delta);
        velocity.current.add(forwardVec.clone().multiplyScalar(dvCoast));
      }

      // braking: if S is held and we're moving forward, apply stronger deceleration
      if (k["KeyS"] && forwardSpeed > 0.001) {
        const brakeDV = -Math.min(Math.abs(forwardSpeed), brake * delta);
        velocity.current.add(forwardVec.clone().multiplyScalar(brakeDV));
      }

  // steering: use a simple bicycle model so the car cannot turn from standstill
      // wheelbase controls turning radius; maxSteerAngle limits wheel angle
      const wheelBase = 2.8; // distance between axles, tune for responsiveness
      const maxSteerAngle = Math.PI / 8; // ~30 degrees

      // steer.current is in [-1,1], map to wheel angle
      const wheelAngle = steer.current * maxSteerAngle;

      // forwardSpeed is signed along forwardVec; use its magnitude for yaw computation
      const v = forwardSpeed; // can be negative when reversing

      // yaw rate (rad/s) approximated by v / L * tan(steer)
      let yawRate = 0;
      if (Math.abs(wheelAngle) > 1e-4 && Math.abs(v) > 1e-3) {
        yawRate = (v / wheelBase) * Math.tan(wheelAngle);
      }

      // suppress yaw when nearly stationary so you can't spin in place
      const minSteerSpeed = 0.5; // below this speed, steering is scaled down
      if (Math.abs(v) < minSteerSpeed) {
        yawRate *= Math.abs(v) / minSteerSpeed;
      }

      const yaw = yawRate * delta;
      if (Math.abs(yaw) > 1e-6) {
        // rotate the car transform
        ref.current.rotateY(yaw);

        // rotate the horizontal velocity vector to follow the new heading
        const up = new THREE.Vector3(0, 1, 0);
        const horizVel = new THREE.Vector3(velocity.current.x, 0, velocity.current.z);
        horizVel.applyAxisAngle(up, yaw);
        velocity.current.x = horizVel.x;
        velocity.current.z = horizVel.z;
      }

      // update HUD ref with current debug values (speed/steer only)
      if (hudRef && hudRef.current) {
        try {
          hudRef.current.speed = Math.round(forwardSpeed * 10) / 10;
          hudRef.current.steer = Math.round(steer.current * 100) / 100;
        } catch (e) {
          // ignore
        }
      }

      // lateral damping: reduce sideways (right) component so the car doesn't keep sliding
      const up = new THREE.Vector3(0, 1, 0);
      const rightVec = new THREE.Vector3().crossVectors(up, forwardVec).normalize();
      const lateral = velocity.current.dot(rightVec);

      // drifting params (hysteresis + sustain timer for initiation)
      const driftEnterSpeed = 7.0; // speed to consider entering throttle-driven drift
      const driftExitSpeed = 4.5; // exiting drift when slower
      const driftEnterSteer = 0.45; // steer magnitude to begin charging drift
      const driftExitSteer = 0.3; // exit steer threshold
      const driftChargeTime = 0.12; // seconds of sustained conditions to actually enter drift
      const driftFactor = 1.1; // lateral accel factor when in drift
      const handbrake = k["Space"];

      // raw detection of potential throttle-driven drift
      const throttle = k["KeyW"] ? 1 : 0;
      const wantDrift = throttle > 0 && Math.abs(steer.current) > driftEnterSteer && Math.abs(forwardSpeed) > driftEnterSpeed;

      // charge up drift only when conditions sustained
      if (!driftState.current) {
        if (wantDrift) {
          driftCharge.current += delta;
          if (driftCharge.current >= driftChargeTime) {
            driftState.current = true;
            driftDir.current = Math.sign(steer.current) || 1;
            driftCharge.current = 0;
          }
        } else {
          driftCharge.current = Math.max(0, driftCharge.current - delta * 2);
        }
      } else {
        // when in drift, allow it to persist until exit conditions met
        const shouldExit = Math.abs(forwardSpeed) < driftExitSpeed || (Math.abs(steer.current) < driftExitSteer && !handbrake && throttle === 0);
        if (shouldExit && !handbrake) {
          driftState.current = false;
          driftDir.current = 0;
          driftCharge.current = 0;
        }
      }

      const isDrifting = Boolean(handbrake || driftState.current);

      // reduce lateral friction while drifting to allow slide but keep control
      let lateralFriction = isDrifting ? 4.2 : 9;
      const lateralDecay = Math.max(0, 1 - lateralFriction * delta);
      let newLateral = lateral * lateralDecay;

      if (isDrifting) {
        const speedFactor = Math.min(1, Math.abs(forwardSpeed) / maxSpeed);

        if (handbrake) {
          // Handbrake: rear steps out via lateral acceleration and yaw
          const handbrakeBrakeStrength = 16; // units/s^2
          const hbBrakeDV = Math.min(Math.abs(forwardSpeed), handbrakeBrakeStrength * delta);
          velocity.current.add(forwardVec.clone().multiplyScalar(-Math.sign(forwardSpeed || 1) * hbBrakeDV));

          lateralFriction = 3.0;
          const steerSign = steer.current !== 0 ? Math.sign(steer.current) : Math.sign(velocity.current.dot(rightVec)) || 1;
          const handbrakeYawStrength = 1.0;
          const yawAmount = handbrakeYawStrength * speedFactor * steerSign * delta * 0.9;
          ref.current.rotateY(yawAmount);

          // apply modest lateral acceleration (rear stepping out)
          const lateralAccelMag = 0.9 * speedFactor;
          const lateralAccel = rightVec.clone().multiplyScalar(steerSign * lateralAccelMag);
          velocity.current.addScaledVector(lateralAccel, delta);

          newLateral += (Math.sign(lateral) * 0.14) * speedFactor;
        } else {
          // throttle-driven drift: apply lateral acceleration gradually based on driftDir
          const dirSign = driftState.current ? driftDir.current || Math.sign(steer.current) : Math.sign(steer.current);
          const lateralAccel = rightVec.clone().multiplyScalar(-dirSign * driftFactor * speedFactor * Math.abs(steer.current));
          velocity.current.addScaledVector(lateralAccel, delta);

          newLateral += (Math.sign(lateral) * 0.14) * speedFactor;
        }
      }

      // write final drift state to HUD (overrides earlier drift field)
      if (hudRef && hudRef.current) {
        try {
          hudRef.current.drifting = Boolean(isDrifting);
        } catch (e) {
          /* ignore */
        }
      }

      // forward component after applying dv (signed)
      const newForward = velocity.current.dot(forwardVec);
      const newVelXZ = forwardVec.clone().multiplyScalar(newForward).add(rightVec.clone().multiplyScalar(newLateral));
      velocity.current.x = newVelXZ.x;
      velocity.current.z = newVelXZ.z;

      // apply light horizontal drag (keeps momentum but prevents runaway)
      const dragFactor = 1 - Math.min(0.9, 0.12 * delta);
      velocity.current.x *= dragFactor;
      velocity.current.z *= dragFactor;

      // integrate
      ref.current.position.addScaledVector(velocity.current, delta);

      // Emit skid particles when drifting or handbrake
      try {
        const emitApi = (emitterRef as any)?.current;
        if (emitApi) {
          // emit a burst when drift starts
          if (!prevDrift.current && isDrifting) {
            const worldPos = new THREE.Vector3();
            ref.current.getWorldPosition(worldPos);
            const dir = rightVec.clone().multiplyScalar(Math.sign(newLateral || 1) * 0.9);
            emitApi.emit(worldPos, dir, Math.min(1, Math.abs(forwardSpeed) / maxSpeed));
          }

          // continuous emission while drifting (small puffs)
          driftEmitTimer.current += delta;
          if (isDrifting && driftEmitTimer.current > 0.06) {
            driftEmitTimer.current = 0;
            const worldPos = new THREE.Vector3();
            ref.current.getWorldPosition(worldPos);
            const dir = rightVec.clone().multiplyScalar(Math.sign(newLateral || 1) * 0.5);
            emitApi.emit(worldPos, dir, Math.min(1, Math.abs(forwardSpeed) / maxSpeed));
          }
          if (!isDrifting) driftEmitTimer.current = 0;
          prevDrift.current = isDrifting;
        }
      } catch (e) {
        // ignore emitter errors
      }
    });

    return (
      <group ref={ref as any} position={[2, 0, -3]}>
        {carObject ? (
          <primitive object={carObject} />
        ) : modelScene ? (
          // if carObject hasn't been created yet, render raw (less ideal)
          <primitive object={modelScene} scale={[0.5, 0.5, 0.5]} />
        ) : (
          // fallback placeholder car
          <mesh>
            <boxGeometry args={[1.6, 0.5, 3]} />
            <meshStandardMaterial color={0xff0000} />
          </mesh>
        )}
      </group>
    );
  }

  // Procedural road to drive on when a car model is present
  function Road({
    length = 200,
    width = 6,
  }: {
    length?: number;
    width?: number;
  }) {
    // long plane centered at -length/2 so it extends from z=0 -> -length
    const planePosZ = -length / 2;
    const laneCount = 1; // single center dashed lane
    const dashLength = 3;
    const gap = 4;
    const segments = Math.floor(length / (dashLength + gap));

    return (
      <group>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, planePosZ]}
          receiveShadow
        >
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial color={0x2b2b2b} roughness={1} metalness={0} />
        </mesh>

        {/* center dashed lane */}
        {Array.from({ length: segments }).map((_, i) => {
          const z = -(i * (dashLength + gap) + dashLength / 2);
          return (
            <mesh key={i} position={[0, 0.02, z]} castShadow>
              <boxGeometry args={[0.12, 0.02, dashLength]} />
              <meshStandardMaterial
                color={0xffffff}
                metalness={0.2}
                roughness={0.8}
              />
            </mesh>
          );
        })}

        {/* simple road edges */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[width / 2 + 0.02, 0.01, planePosZ]}
        >
          <planeGeometry args={[0.08, length]} />
          <meshStandardMaterial color={0xaaaaaa} />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-(width / 2 + 0.02), 0.01, planePosZ]}
        >
          <planeGeometry args={[0.08, length]} />
          <meshStandardMaterial color={0xaaaaaa} />
        </mesh>
      </group>
    );
  }

  // Simple skid particle system: pooled points. Exposes emit(pos, dir, intensity) via ref.
  const SkidParticles = React.forwardRef(function SkidParticles(_props, ref) {
    const MAX = 256;
    const positions = useRef(new Float32Array(MAX * 3));
    const velocities = useRef(new Float32Array(MAX * 3));
    const ages = useRef(new Float32Array(MAX));
    const lives = useRef(new Float32Array(MAX));
    const poolIndex = useRef(0);
    const pointsRef = useRef<THREE.Points | null>(null);

    // initialize positions to off-screen to avoid undefined geometry positions
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

    // create geometry synchronously so it's available on first render
    const geom = React.useMemo(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions.current, 3));
      return g;
    }, []);

    // expose emit via imperative handle
    React.useImperativeHandle(ref, () => ({
      emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity = 1) => {
        const idx = poolIndex.current % MAX;
        poolIndex.current += 1;
        const i3 = idx * 3;
        positions.current[i3] = pos.x + (Math.random() - 0.5) * 0.1;
        positions.current[i3 + 1] = pos.y + 0.05 + (Math.random() - 0.5) * 0.05;
        positions.current[i3 + 2] = pos.z + (Math.random() - 0.5) * 0.1;

        // velocity: lateral dir + some backward kick
        const speed = 2 + 6 * intensity;
        const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
        const v = dir.clone().multiplyScalar(speed).add(jitter);
        velocities.current[i3] = v.x;
        velocities.current[i3 + 1] = v.y;
        velocities.current[i3 + 2] = v.z;

        const life = 0.45 + 0.4 * intensity;
        ages.current[idx] = life;
        lives.current[idx] = life;

        // ensure geometry attribute flagged for update
        (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      },
    } as any));

    useFrame((_, delta) => {
      const posArr = positions.current;
      const velArr = velocities.current;
      const aArr = ages.current;
      const lArr = lives.current;

      for (let i = 0; i < MAX; i++) {
        if (aArr[i] > 0) {
          // integrate
          const i3 = i * 3;
          velArr[i3 + 1] -= 9.8 * 0.18 * delta; // mild gravity
          posArr[i3] += velArr[i3] * delta;
          posArr[i3 + 1] += velArr[i3 + 1] * delta;
          posArr[i3 + 2] += velArr[i3 + 2] * delta;

          aArr[i] -= delta;
          if (aArr[i] <= 0) {
            // move off-screen
            posArr[i3] = 9999;
            posArr[i3 + 1] = 9999;
            posArr[i3 + 2] = 9999;
          }
        }
      }

      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      if (pointsRef.current) {
        // fade global material opacity slightly when many particles active (cosmetic)
        const active = aArr.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
        const mat = pointsRef.current.material as THREE.PointsMaterial;
        mat.opacity = Math.min(1, 0.6 + active / 300);
      }
    });

    return (
      <points ref={pointsRef as any} geometry={geom} frustumCulled={false}>
        <pointsMaterial
          attach="material"
          color={0xcccccc}
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </points>
    );
  });

  function ThirdPersonCamera({
    targetRef,
  }: {
    targetRef: React.RefObject<THREE.Group | null>;
  }) {
    const { camera } = useThree();
    const desiredOffset = new THREE.Vector3(0, 2.5, 6);
    useFrame(() => {
      const t = targetRef.current;
      if (!t) return;
      // compute target position in world space
      const worldPos = new THREE.Vector3();
      t.getWorldPosition(worldPos);

      // compute behind position based on car orientation
      const behind = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(t.quaternion)
        .multiplyScalar(desiredOffset.z);
      const up = new THREE.Vector3(0, desiredOffset.y, 0);
      const camPos = worldPos.clone().add(behind).add(up);

      // smooth camera movement
      camera.position.lerp(camPos, 0.12);
      camera.lookAt(worldPos);
    });
    return null;
  }

  const carRef = useRef<THREE.Group>(null);
  const skidEmitterRef = useRef<null | { emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity?: number) => void }>(null);
  const isDriving = !!rx7Scene;
  React.useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      const h = hudRef?.current;
      const el = document.getElementById("car-hud");
      if (el && h) {
        el.innerHTML = `<div>Speed: ${h.speed} u/s</div><div>Steer: ${h.steer}</div><div>Drifting: ${h.drifting ? 'YES' : 'no'}</div>`;
      }
    }, 100);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      {/* Blue sky and clouds */}
      <Sky distance={450} sunPosition={[100, 20, 100]} inclination={0.49} azimuth={0.25} turbidity={6} />
      <Clouds count={10} />
      {/* Floor - color shifts slightly when driving */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={isDriving ? 0x333333 : 0x7a7a7a}
          roughness={1}
        />
      </mesh>

      {/* When driving, show the procedural road; otherwise show the gym model and holds */}
      {isDriving ? (
        <>
          <Road length={300} width={8} />
          {/* Floating welcome text positioned above the road slightly ahead of the camera start */}
          <FloatingText position={[0, 2.5, -6]} text={"Welcome To My World"} color="#ffffff" />
        </>
      ) : (
        <>
          {/* Imported gym model (if available) */}
          {gltfScene && <ModelWrapper object={gltfScene} />}

          {/* Holds (placeholder interactive points) */}
          {holds.map((pos, i) => (
            <Hold key={i} position={pos} color={Math.random() * 0xffffff} />
          ))}

          {/* Mats */}
          <Mat position={[0, 0.1, -2]} />
          {/* Floating welcome text for the gym scene as well */}
          <FloatingText position={[0, 2.2, -4]} text={"Welcome To My World"} color="#ffffff" />
        </>
      )}

      {/* RX7 car model (render driveable car and follow camera only when car model is present) */}
  {rx7Scene && <DriveableCar modelScene={rx7Scene} targetRef={carRef} hudRef={hudRef} emitterRef={skidEmitterRef} />}
    {rx7Scene && <ThirdPersonCamera targetRef={carRef} />}

    {/* Skid particle system (renders points and exposes emit API via skidEmitterRef) */}
    <SkidParticles ref={skidEmitterRef as any} />

      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

      {/* HUD is rendered in the DOM root (moved to CarScene) */}
    </>
  );
}

function CarHUD({ hudRef }: { hudRef: React.RefObject<{ speed: number; steer: number; drifting: boolean }> }) {
  const [state, setState] = React.useState({ speed: 0, steer: 0, drifting: false });

  React.useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      const h = hudRef.current;
      if (h) setState({ speed: h.speed || 0, steer: h.steer || 0, drifting: !!h.drifting });
    }, 100);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [hudRef]);

  return (
    <div
      id="car-hud"
      style={{
        position: "fixed",
        right: 12,
        top: 12,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: 6,
        fontFamily: "monospace",
        fontSize: 13,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <div>Speed: {state.speed} u/s</div>
      <div>Steer: {state.steer}</div>
      <div>Drifting: {state.drifting ? "YES" : "no"}</div>
    </div>
  );
}

function Player({
  speed = 5,
  height = 1.6,
}: {
  speed?: number;
  height?: number;
}) {
  const { camera } = useThree();
  const velocity = React.useRef(new THREE.Vector3());
  const direction = React.useRef(new THREE.Vector3());
  const move = React.useRef(new THREE.Vector3());
  const keys = React.useRef<Record<string, boolean>>({});
  const [isLocked, setIsLocked] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  React.useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      setIsLocked(locked);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () =>
      document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, []);

  // ensure camera starts at player height
  React.useEffect(() => {
    camera.position.y = height;
  }, [camera, height]);

  // movement & jump physics parameters
  const accel = 50; // units/s^2, how fast we reach target speed
  const drag = 8; // per-second drag applied when no input
  const sprintMultiplier = 1.8; // sprint speed multiplier
  const gravity = 30; // units/s^2 downward
  const jumpHeight = 1.6; // approximate jump height in units
  const jumpSpeed = Math.sqrt(2 * gravity * jumpHeight);
  const camDirRef = React.useRef(new THREE.Vector3());
  const rightRef = React.useRef(new THREE.Vector3());
  const tempVec = React.useRef(new THREE.Vector3());
  const targetVel = React.useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // only move when pointer is locked to give desktop FPS feel
    // but still allow gravity to act when unlocked (gentle)
    // read inputs
    const forward = keys.current["KeyW"] ? 1 : keys.current["KeyS"] ? -1 : 0;
    const strafe = keys.current["KeyD"] ? 1 : keys.current["KeyA"] ? -1 : 0;
    const sprint = keys.current["ShiftLeft"] || keys.current["ShiftRight"];
    const wantJump = keys.current["Space"];

    // compute forward and right vectors on XZ plane
    camera.getWorldDirection(camDirRef.current);
    camDirRef.current.y = 0;
    camDirRef.current.normalize();
    rightRef.current.crossVectors(camDirRef.current, camera.up).normalize();

    // desired movement direction
    move.current.set(0, 0, 0);
    move.current.addScaledVector(camDirRef.current, forward);
    move.current.addScaledVector(rightRef.current, strafe);

    const maxSpeed = speed * (sprint ? sprintMultiplier : 1);

    if (isLocked) {
      if (move.current.lengthSq() > 0.0001) {
        move.current.normalize();
        // target velocity in world units (XZ only)
        targetVel.current.copy(move.current).multiplyScalar(maxSpeed);

        const t = Math.min(1, accel * delta);
        tempVec.current
          .copy(targetVel.current)
          .sub(velocity.current)
          .multiplyScalar(t);
        // only change XZ components of velocity
        velocity.current.x += tempVec.current.x;
        velocity.current.z += tempVec.current.z;
      } else {
        // apply drag when no input to slow down (XZ)
        const dragFactor = Math.max(0, 1 - drag * delta);
        velocity.current.x *= dragFactor;
        velocity.current.z *= dragFactor;
        if (Math.abs(velocity.current.x) < 1e-4) velocity.current.x = 0;
        if (Math.abs(velocity.current.z) < 1e-4) velocity.current.z = 0;
      }

      // Jumping: if grounded and jump pressed, set vertical velocity
      const grounded =
        camera.position.y <= height + 0.001 ||
        (velocity.current.y <= 0 && camera.position.y <= height + 0.01);
      if (wantJump && grounded) {
        velocity.current.y = jumpSpeed;
      }
    } else {
      // when unlocked, slowly damp horizontal motion
      const dragFactor = Math.max(0, 1 - drag * delta * 0.5);
      velocity.current.x *= dragFactor;
      velocity.current.z *= dragFactor;
    }

    // apply gravity
    velocity.current.y -= gravity * delta;

    // integrate position
    tempVec.current.copy(velocity.current).multiplyScalar(delta);
    camera.position.add(tempVec.current);

    // ground collision simple: clamp to height
    if (camera.position.y <= height) {
      camera.position.y = height;
      velocity.current.y = Math.max(0, velocity.current.y);
    }
  });

  // Render the PointerLockControls which will attach to the canvas automatically
  return <PointerLockControls makeDefault />;
}

const CarScene: React.FC = () => {
  const [showOverlay, setShowOverlay] = React.useState(false);
  const hudRef = React.useRef({ speed: 0, steer: 0, drifting: false });

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <CarHUD hudRef={hudRef} />
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "12px 20px",
              borderRadius: 8,
              pointerEvents: "auto",
              cursor: "pointer",
            }}
            onClick={() => {
              // lock pointer by simulating a click on the canvas control (PointerLockControls)
              const canvas = document.querySelector("canvas");
              if (canvas) {
                // request pointer lock on the canvas
                // clicking here will instruct the user to click the canvas to lock
                (canvas as HTMLCanvasElement).requestPointerLock?.();
              }
              setShowOverlay(false);
            }}
          >
            Click to start driving (WASD to drive)
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 3, 8], fov: 60 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={[0xf0f0f0]} />
        <SceneContent hudRef={hudRef} />
      </Canvas>
    </div>
  );
};

export default CarScene;
