import React from "react";
import * as THREE from "three";

export default function ModelWrapper({ object, desiredHeight = 4 }: { object: THREE.Object3D; desiredHeight?: number; }) {
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
