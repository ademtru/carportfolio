import { DirectionalLight, AmbientLight } from 'three';

const createLighting = () => {
    const ambientLight = new AmbientLight(0xffffff, 0.5); // Soft white light
    const directionalLight = new DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight.position.set(5, 10, 7.5); // Position the light

    return { ambientLight, directionalLight };
};

export default createLighting;