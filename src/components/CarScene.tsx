import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text3D, Center, Sky, Edges } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
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
  const [mcdScene, setMcdScene] = React.useState<any>(null);
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

      // try loading McDonald's building model (placed in public/models)
      const mcdPath = "/models/engadine_mcdonalds_restaurant_low_poly.glb";
      try {
        const resp2 = await fetch(mcdPath, { method: "HEAD" });
        if (resp2.ok) {
          const loader3 = new GLTFLoader();
          loader3.load(mcdPath, (g) => setMcdScene(g.scene));
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


  function ModelWrapper({ object, desiredHeight = 4 }: { object: THREE.Object3D; desiredHeight?: number; }) {
    const ref = React.useRef<THREE.Group>(null!);
    const [node, setNode] = React.useState<THREE.Object3D | null>(null);

    React.useEffect(() => {
      if (!object) {
        setNode(null);
        return;
      }

      // clone the incoming object so we don't mutate the original GLTF scene
      const cloned = object.clone(true) as THREE.Object3D;

      // compute bbox on the clone
      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // compute scale to match desired height
      const scale = desiredHeight / Math.max(size.y, 0.0001);

      // apply scale and reposition so bottom sits on y=0
      cloned.scale.setScalar(scale);
      cloned.updateMatrixWorld(true);

      // recompute bbox after scaling
      const box2 = new THREE.Box3().setFromObject(cloned);
      const size2 = new THREE.Vector3();
      box2.getSize(size2);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);

      const bottomY = box2.min.y;
      cloned.position.x = -center2.x;
      cloned.position.z = -center2.z;
      cloned.position.y = -bottomY;
      cloned.updateMatrixWorld(true);

      setNode(cloned);
    }, [object, desiredHeight]);

    return (
      <group ref={ref}>{node ? <primitive object={node} /> : null}</group>
    );
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
  function DriveableCar({ modelScene, cameraRef, hudRef, emitterRef, }: {
    modelScene?: THREE.Object3D | null;
    cameraRef?: React.RefObject<THREE.Group | null>;
    hudRef?: React.RefObject<{ speed: number; steer: number; drifting: boolean }>;
    emitterRef?: React.RefObject<{ emit: (pos: THREE.Vector3, dir: THREE.Vector3, intensity?: number) => void } | null>;
  }) {
    const ownRef = useRef<THREE.Group | null>(null);
    const rigidRef = useRef<any | null>(null);
    // ownRef is used for the car visual. cameraRef (if provided) is an anchor
    // updated each frame so the camera can follow the car rotation/position.
    const camAnchorRef = cameraRef ?? ownRef;
    const [carObject, setCarObject] = useState<THREE.Object3D | null>(null);
  const visualRef = useRef<THREE.Group | null>(null);

  // simulated velocity direction (unit vector) used to produce lateral slip
  const velocityDir = useRef(new THREE.Vector3(0, 0, -1));

    // Movement state
    const position = useRef(new THREE.Vector3(2, 0, -3));
  // start rotated anticlockwise 90 degrees so the car faces north
  const heading = useRef(0); // radians
    const speed = useRef(0); // scalar forward speed (m/s)

    // Inputs
    const keys = useRef<Record<string, boolean>>({});

    // Tunables (feel free to tweak)
    const MAX_FORWARD = 60; // m/s
    const MAX_REVERSE = -6; // m/s
    const ACCELERATION = 12; // m/s^2
    const BRAKE_DECEL = 60; // m/s^2 (when holding S)
    const COAST_DRAG = 8; // m/s^2
  // lower base turn rate and scale turn by actual speed (no minimum)
  const TURN_RATE = Math.PI * 1.8; // rad/s at full steer (scaled by speed)
    const HANDBRAKE_DRAG = 20; // extra drag when handbrake

    // Setup input listeners
    useEffect(() => {
      const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
      const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
      return () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
      };
    }, []);

    // Prepare/normalize model
    useEffect(() => {
      if (!modelScene) { setCarObject(null); return; }
      const clone = modelScene.clone(true) as THREE.Object3D;
      clone.position.set(0, 0, 0);
      clone.scale.set(1, 1, 1);
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
  // rotate the mesh so its local 'front' matches the world's forward direction
  // (clockwise 90 degrees). This adjusts the visual orientation without
  // affecting the physics kinematic body which we control via heading.
  clone.rotateY(-Math.PI / 2);
  clone.updateMatrixWorld(true);

      const box2 = new THREE.Box3().setFromObject(clone);
      const c = new THREE.Vector3();
      box2.getCenter(c);
      const bottomY = box2.min.y;
      clone.position.x = -c.x;
      clone.position.z = -c.z;
      clone.position.y = -bottomY;
      clone.updateMatrixWorld(true);

      setCarObject(clone);
    }, [modelScene]);

    useFrame((_, delta) => {
      // read inputs
      const forwardInput = keys.current['KeyW'] ? 1 : keys.current['KeyS'] ? -1 : 0;
      const steerInput = keys.current['KeyA'] ? 1 : keys.current['KeyD'] ? -1 : 0;
      const handbrake = Boolean(keys.current['Space']);

      // Acceleration / braking
      if (forwardInput > 0) {
        speed.current += ACCELERATION * delta * forwardInput;
      } else if (forwardInput < 0) {
        // braking/reverse
        speed.current -= ACCELERATION * delta * -forwardInput;
      } else {
        // coast drag
        const drag = COAST_DRAG * delta;
        if (speed.current > 0) speed.current = Math.max(0, speed.current - drag);
        else speed.current = Math.min(0, speed.current + drag);
      }

      // handbrake adds strong drag
      if (handbrake) {
        if (speed.current > 0) speed.current = Math.max(0, speed.current - HANDBRAKE_DRAG * delta);
        else speed.current = Math.min(0, speed.current + HANDBRAKE_DRAG * delta);
      }

      // clamp speeds
      speed.current = Math.max(MAX_REVERSE, Math.min(MAX_FORWARD, speed.current));

    // Turning: use a non-linear steering curve to give a more RWD-like feel.
    // - exponent < 1 makes low speeds more responsive (less 'stiff')
    // - small low-speed assist so you can still steer when almost stopped
    // - throttle (rear-wheel drive) slightly increases steer responsiveness
    // - handbrake increases steer for drifting
    // - small reduction at very high speed for stability
    const speedNorm = Math.min(1, Math.abs(speed.current) / MAX_FORWARD);
    const steerCurve = Math.pow(speedNorm, 0.6); // non-linear mapping
    const lowSpeedAssist = 0.18; // minimum steer scale when nearly stopped
    let turnScale = Math.max(steerCurve, lowSpeedAssist);

    const throttleFactor = forwardInput > 0 ? 1 + 0.2 * forwardInput : 1;
    const handbrakeFactor = handbrake ? 1.6 : 1;
    turnScale *= throttleFactor * handbrakeFactor;

    // reduce steering a bit at high speed for stability
    turnScale *= 1 - 0.5 * speedNorm;

    const directionSign = speed.current >= 0 ? 1 : -1;
    const turn = steerInput * TURN_RATE * turnScale * delta * directionSign;
    heading.current += turn;

  // integrate position along simulated velocity direction (allows slip)
  const forwardVec = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, heading.current, 0)).setY(0).normalize();

  // desired direction is the car's heading; velocityDir will lerp toward it based on grip
  const desiredDir = forwardVec.clone();

  // compute grip: lower grip when handbraking (drifting), slightly lower at high speeds
  const baseGrip = 0.88; // how strongly velocity aligns to heading per second
  const speedFactor = Math.min(1, Math.abs(speed.current) / MAX_FORWARD);
  const gripWhileDriving = baseGrip * (1 - 0.35 * speedFactor);
  const grip = handbrake ? 0.18 : gripWhileDriving;

  // lerp velocity direction toward desired heading (smaller lerp => more slide)
  velocityDir.current.lerp(desiredDir, Math.max(0, grip) * Math.min(1, delta * 8));
  velocityDir.current.normalize();

  const nextPos = position.current.clone().addScaledVector(velocityDir.current, speed.current * delta);
  position.current.copy(nextPos);

  // build quaternion for car body (heading)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading.current, 0));

      // determine whether to apply rotation updates: only rotate the body when
      // drifting or at higher speeds / large steer inputs. This avoids the car
      // visibly yawing during light/slow turns.
  const ROTATE_SPEED_THRESHOLD = 2.2; // m/s
  // Only allow yaw rotation when handbraking (drift) or when moving above a
  // minimum speed. Steering input alone at low speed will not rotate the body.
  const rotateEnabled = handbrake || Math.abs(speed.current) > ROTATE_SPEED_THRESHOLD;

      // update rapier kinematic body
      try {
          if (rigidRef.current) {
            rigidRef.current.setNextKinematicTranslation({ x: nextPos.x, y: nextPos.y, z: nextPos.z });
            if (rotateEnabled) {
              rigidRef.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
            }
          }
      } catch (e) {
        /* ignore */
      }
        // Update camera anchor (separate from the car visual group) so the camera
        // follows the car's position and rotation. This avoids touching the visual
        // group's transform which Rapier controls via the RigidBody.
        if (camAnchorRef && (camAnchorRef as any).current) {
          try {
            (camAnchorRef as any).current.position.copy(nextPos);
            if (rotateEnabled) {
              (camAnchorRef as any).current.quaternion.copy(q);
            }
          } catch (err) {
            // ignore
          }
        }

        // compute lateral velocity (signed) relative to heading for skid logic
        const rightVec = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, heading.current, 0)).normalize();
        const lateralSpeed = rightVec.dot(velocityDir.current) * speed.current; // positive => sliding right

        // determine drifting state
        const isDrifting = handbrake && Math.abs(lateralSpeed) > 0.8;

        // emit skid particles from rear wheels when drifting or heavy lateral slip
        try {
          const emitter = emitterRef && (emitterRef as any).current;
          if (emitter && Math.abs(lateralSpeed) > 0.6) {
            // rear world position approx (a bit behind car)
            const rearOffset = forwardVec.clone().multiplyScalar(-1.4).setY(0.15);
            const rearPos = nextPos.clone().add(rearOffset);
            const intensity = Math.min(1, Math.abs(lateralSpeed) / 6);
            // emit with direction roughly opposite lateral component
            const emitDir = rightVec.clone().multiplyScalar(Math.sign(lateralSpeed) * -1).setY(0);
            emitter.emit(rearPos, emitDir, intensity);
          }
        } catch (err) {
          /* ignore */
        }

        // apply a small visual roll to the car model only when drifting
        if (visualRef.current) {
          const targetRoll = isDrifting ? -Math.sign(lateralSpeed) * Math.min(0.45, Math.abs(lateralSpeed) / 8) : 0;
          visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z || 0, targetRoll, Math.min(1, delta * 6));
        }

      // update HUD
      if (hudRef && hudRef.current) {
        hudRef.current.speed = Math.round(speed.current * 10) / 10;
        hudRef.current.steer = steerInput;
        hudRef.current.drifting = !!(handbrake && Math.abs(velocityDir.current.dot(rightVec)) > 0.25);
      }
    });

    return (
      <RigidBody ref={(r: any | null) => { rigidRef.current = r; }} type={"kinematicPosition"} position={[position.current.x, position.current.y, position.current.z]} rotation={[0, heading.current, 0]}>
        <group ref={ownRef as any}>
          <group ref={visualRef as any}>
          {carObject ? <primitive object={carObject} /> : modelScene ? <primitive object={modelScene} scale={[0.5, 0.5, 0.5]} /> : (
            <mesh>
              <boxGeometry args={[1.6, 0.5, 3]} />
              <meshStandardMaterial color={0xff0000} />
            </mesh>
          )}
          </group>
        </group>
      </RigidBody>
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

  // separate ref used by the third-person camera to follow the car
  const carCameraRef = useRef<THREE.Group>(null);
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
          {/* McDonald's building on the right side of the street if available */}
          {mcdScene && (
            <RigidBody type="fixed" colliders={"trimesh"} position={[-22.5, 0, -50]} rotation={[0, Math.PI / 2, 0]}>
              {/* wrap and scale to ~12 units tall so it sits at human scale relative to the road */}
              <group>
                <ModelWrapper object={mcdScene} desiredHeight={12} />
              </group>
            </RigidBody>
          )}
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
  {/* Driveable car (visuals + kinematic rigidbody); camera follows a separate anchor */}
  {rx7Scene && <DriveableCar modelScene={rx7Scene} cameraRef={carCameraRef} hudRef={hudRef} emitterRef={skidEmitterRef} />}
    {rx7Scene && <ThirdPersonCamera targetRef={carCameraRef} />}

    {/* Camera anchor used by ThirdPersonCamera; DriveableCar will update this group's world transform */}
    <group ref={carCameraRef as any} />

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
        <Physics gravity={[0, -9.81, 0]}>
          <SceneContent hudRef={hudRef} />
        </Physics>
      </Canvas>
    </div>
  );
};

export default CarScene;
