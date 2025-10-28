import * as THREE from 'three';

export type BoulderingSceneObjects = {
  walls: THREE.Mesh[];
  holdsGroup: THREE.Group;
  mats: THREE.Mesh[];
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
};

function createWall(width: number, height: number, depth: number, color = 0x8b4513) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function createHold(size = 0.08, color = 0xffa500) {
  const geometry = new THREE.SphereGeometry(size, 12, 12);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isHold = true;
  return mesh;
}

function createMat(width: number, depth: number, height = 0.1, color = 0x333333) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Populates the provided scene with a simple bouldering gym: two angled walls,
 * holds distributed on the walls, crash mats, and lighting.
 */
export function BoulderingScene(scene: THREE.Scene, config?: { walls?: number }) {
  const walls: THREE.Mesh[] = [];
  const mats: THREE.Mesh[] = [];

  // Floor
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls configuration
  const wallCount = config?.walls ?? 2;
  const holdsGroup = new THREE.Group();
  for (let i = 0; i < wallCount; i++) {
    const w = createWall(8, 4, 0.2);
    // position walls side-by-side with slight angle
    const x = (i - (wallCount - 1) / 2) * 9;
    w.position.set(x, 2, -5);
    w.rotation.y = (i % 2 === 0) ? -0.12 : 0.12;
    scene.add(w);
    walls.push(w);

    // create an array of holds on this wall
    const rows = 5;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c / (cols - 1) - 0.5) * 6.5; // horizontal span
        const v = (r / (rows - 1)) * 3.2 + 0.5; // vertical span
        const hold = createHold(0.12, Math.random() * 0xffffff);
        // project the hold slightly out from the wall
        const offset = 0.12 + Math.random() * 0.08;
        // transform local wall coordinates to world coordinates
        const localPos = new THREE.Vector3(u, v, depthForWallOffset(offset));
        // apply wall transform
        hold.position.copy(localPos);
        // rotate/translate according to wall
        hold.applyMatrix4(w.matrix);
        holdsGroup.add(hold);
      }
    }
  }

  scene.add(holdsGroup);

  // Crash mats in front of walls
  const mat1 = createMat(16, 4, 0.2, 0x222222);
  mat1.position.set(0, 0.1, -2);
  mats.push(mat1);
  scene.add(mat1);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  return { walls, holdsGroup, mats, ambientLight, directionalLight } as BoulderingSceneObjects;
}

function depthForWallOffset(outward: number) {
  // holds are placed a small distance out from the wall's local z (negative)
  // since the walls are thin boxes centered on z=0 in local space, move
  // slightly along -Z so they sit in front of the wall surface.
  return -0.1 - outward;
}

export default BoulderingScene;