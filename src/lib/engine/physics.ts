import * as THREE from "three";

interface HitboxData {
  width: number;
  length: number;
  height: number;
}

export function checkCollision(
  carPosition: THREE.Vector3,
  carWidth: number,
  carLength: number,
  hitboxShrink: number,
  obstacles: THREE.Object3D[]
): boolean {
  const carMinX = carPosition.x - carWidth / 2 + hitboxShrink;
  const carMaxX = carPosition.x + carWidth / 2 - hitboxShrink;
  const carMinZ = carPosition.z - carLength / 2 + hitboxShrink;
  const carMaxZ = carPosition.z + carLength / 2 - hitboxShrink;

  for (const obs of obstacles) {
    const data = obs.userData as HitboxData;
    const obsMinX = obs.position.x - data.width / 2;
    const obsMaxX = obs.position.x + data.width / 2;
    const obsMinZ = obs.position.z - data.length / 2;
    const obsMaxZ = obs.position.z + data.length / 2;

    if (
      carMinX < obsMaxX &&
      carMaxX > obsMinX &&
      carMinZ < obsMaxZ &&
      carMaxZ > obsMinZ
    ) {
      return true;
    }
  }
  return false;
}

export function checkNearMiss(
  carPosition: THREE.Vector3,
  carWidth: number,
  hitboxShrink: number,
  nearMissThreshold: number,
  obstacles: THREE.Object3D[],
  lastNearMissZ: number
): { hit: boolean; newLastZ: number } {
  const carMinX = carPosition.x - carWidth / 2 - nearMissThreshold;
  const carMaxX = carPosition.x + carWidth / 2 + nearMissThreshold;

  for (const obs of obstacles) {
    const data = obs.userData as HitboxData;
    if (Math.abs(obs.position.z - carPosition.z) > data.length) continue;
    if (obs.position.z === lastNearMissZ) continue;

    const obsMinX = obs.position.x - data.width / 2;
    const obsMaxX = obs.position.x + data.width / 2;

    if (carMinX < obsMaxX && carMaxX > obsMinX) {
      const actualCarMinX = carPosition.x - carWidth / 2 + hitboxShrink;
      const actualCarMaxX = carPosition.x + carWidth / 2 - hitboxShrink;
      if (!(actualCarMinX < obsMaxX && actualCarMaxX > obsMinX)) {
        return { hit: true, newLastZ: obs.position.z };
      }
    }
  }
  return { hit: false, newLastZ: lastNearMissZ };
}
