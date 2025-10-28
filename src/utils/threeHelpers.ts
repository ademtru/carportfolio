import * as THREE from 'three';

export function createBoulderGeometry(width: number, height: number, depth: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return geometry;
}

export function createMaterial(color: number) {
    const material = new THREE.MeshStandardMaterial({ color });
    return material;
}

export function createLight(color: number, intensity: number, position: THREE.Vector3) {
    const light = new THREE.PointLight(color, intensity);
    light.position.copy(position);
    return light;
}

export function createTextureLoader() {
    return new THREE.TextureLoader();
}

export function createAmbientLight(intensity: number) {
    return new THREE.AmbientLight(0xffffff, intensity);
}