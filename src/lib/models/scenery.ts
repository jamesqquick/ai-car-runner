import * as THREE from "three";
import type { RemixConfig, GameConstants } from "../config";

export function createBuilding(
  side: number,
  z: number,
  config: RemixConfig,
  constants: GameConstants,
): THREE.Group {
  const { ROAD_WIDTH } = constants;
  const group = new THREE.Group();
  const height = 4 + Math.random() * 12;
  const width = 2 + Math.random() * 4;
  const depth = 2 + Math.random() * 4;

  // Main structure
  const geo = new THREE.BoxGeometry(width, height, depth);
  const hue = config.buildingHue + Math.random() * 0.15;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.12, 0.08 + Math.random() * 0.06),
    roughness: 0.85,
    metalness: 0.2,
  });
  const building = new THREE.Mesh(geo, mat);
  building.position.y = height / 2;
  building.castShadow = true;
  group.add(building);

  // Glowing windows
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    emissive: 0xffcc66,
    emissiveIntensity: 0.6,
  });
  const windowSize = 0.3;
  const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.3);
  const facingX = side > 0 ? -1 : 1; // face toward road

  for (let wy = 1.5; wy < height - 0.5; wy += 1.8) {
    for (let wz = -depth / 2 + 0.5; wz < depth / 2 - 0.3; wz += 1.2) {
      if (Math.random() < 0.6) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(facingX * (width / 2 + 0.01), wy, wz);
        win.rotation.y = facingX > 0 ? 0 : Math.PI;
        group.add(win);
      }
    }
  }

  group.position.set(
    side * (ROAD_WIDTH / 2 + 3.5 + Math.random() * 6),
    0,
    z + (Math.random() - 0.5) * 8,
  );
  return group;
}

export function spawnScenery(params: {
  car: THREE.Object3D;
  sceneryItems: THREE.Object3D[];
  scene: THREE.Scene;
  lastSceneryZ: number;
  config: RemixConfig;
  constants: GameConstants;
}): { items: THREE.Object3D[]; lastZ: number } {
  const { car, scene, config, constants } = params;
  let { sceneryItems, lastSceneryZ } = params;

  const spawnZ = car.position.z - 140;

  while (lastSceneryZ > spawnZ) {
    ([-1, 1] as const).forEach((side) => {
      if (Math.random() < 0.5) {
        const building = createBuilding(side, lastSceneryZ, config, constants);
        sceneryItems.push(building);
        scene.add(building);
      }
    });
    lastSceneryZ -= 12;
  }

  sceneryItems = sceneryItems.filter((item) => {
    if (item.position.z < car.position.z + 40) return true;
    scene.remove(item);
    return false;
  });

  return { items: sceneryItems, lastZ: lastSceneryZ };
}
