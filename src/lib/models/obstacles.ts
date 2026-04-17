import * as THREE from "three";
import type { RemixConfig, GameConstants } from "../config";

function pickColor(colors: number[]): number {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function createObstacleColors(config: RemixConfig): number[] {
  return config.obstacleColors.map((c) => new THREE.Color(c).getHex());
}

export function createObstacle(
  lane: number,
  z: number,
  lanePositions: number[],
  obstacleColors: number[],
): THREE.Object3D {
  const type = Math.random();
  let mesh: THREE.Object3D;

  if (type < 0.5) {
    // Other car — with taillights
    const group = new THREE.Group();
    const color = pickColor(obstacleColors);
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 3);
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111122, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.8,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.3;
    cabin.position.z = 0.2;
    cabin.castShadow = true;
    group.add(cabin);

    const tlGeo = new THREE.BoxGeometry(0.25, 0.08, 0.04);
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
    [-0.5, 0.5].forEach((x) => {
      const tl = new THREE.Mesh(tlGeo, tlMat);
      tl.position.set(x, 0.6, 1.52);
      group.add(tl);
    });

    mesh = group;
    mesh.userData = { type: "car", width: 1.6, length: 3, height: 1.5 };
  } else if (type < 0.8) {
    // Barrier with warning stripes
    const group = new THREE.Group();
    const barrierColor = pickColor(obstacleColors);
    const geo = new THREE.BoxGeometry(2.2, 0.8, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: barrierColor, emissive: barrierColor, emissiveIntensity: 0.3 });
    const barrier = new THREE.Mesh(geo, mat);
    barrier.position.y = 0.4;
    barrier.castShadow = true;
    group.add(barrier);

    const stripColor = new THREE.Color(barrierColor).lerp(new THREE.Color(0xffffff), 0.5);
    const stripGeo = new THREE.BoxGeometry(2.22, 0.08, 0.62);
    const stripMat = new THREE.MeshStandardMaterial({ color: stripColor, emissive: stripColor, emissiveIntensity: 0.5 });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.y = 0.6;
    group.add(strip);

    mesh = group;
    mesh.userData = { type: "barrier", width: 2.2, length: 0.6, height: 0.8 };
  } else {
    // Traffic cone with reflective band
    const group = new THREE.Group();
    const coneColor = pickColor(obstacleColors);
    const coneGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: coneColor, emissive: coneColor, emissiveIntensity: 0.15 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.4;
    cone.castShadow = true;
    group.add(cone);

    const bandColor = new THREE.Color(coneColor).lerp(new THREE.Color(0xffffff), 0.6);
    const bandGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.08, 8);
    const bandMat = new THREE.MeshStandardMaterial({ color: bandColor, emissive: bandColor, emissiveIntensity: 0.4 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.45;
    group.add(band);

    mesh = group;
    mesh.userData = { type: "cone", width: 0.5, length: 0.5, height: 0.8 };
  }

  mesh.position.x = lanePositions[lane];
  mesh.position.z = z;
  return mesh;
}

export function spawnObstacles(params: {
  car: THREE.Object3D;
  obstacles: THREE.Object3D[];
  scene: THREE.Scene;
  lastObstacleZ: number;
  distanceTraveled: number;
  speed: number;
  config: RemixConfig;
  constants: GameConstants;
  obstacleColors: number[];
}): number {
  const {
    car,
    obstacles,
    scene,
    config,
    constants,
    obstacleColors,
    distanceTraveled,
    speed,
  } = params;
  let { lastObstacleZ } = params;

  const spawnLimit = car.position.z - constants.OBSTACLE_SPAWN_DISTANCE;

  while (lastObstacleZ > spawnLimit) {
    const difficulty = Math.min(distanceTraveled / 500, 1);
    const multiLaneChance = config.multiLaneChance + difficulty * config.multiLaneChance;
    const triLaneChance = difficulty * config.triLaneRampMax;

    let blockedCount = 1;
    if (Math.random() < triLaneChance && constants.LANE_COUNT > 3) {
      blockedCount = 3;
    } else if (Math.random() < multiLaneChance) {
      blockedCount = 2;
    }
    blockedCount = Math.min(blockedCount, constants.LANE_COUNT - 1);

    const blockedLanes = new Set<number>();
    while (blockedLanes.size < blockedCount) {
      blockedLanes.add(Math.floor(Math.random() * constants.LANE_COUNT));
    }

    blockedLanes.forEach((lane) => {
      const obs = createObstacle(lane, lastObstacleZ, constants.LANE_POSITIONS, obstacleColors);
      obstacles.push(obs);
      scene.add(obs);
    });

    const gap = Math.max(constants.MIN_OBSTACLE_GAP, 20 - speed * 0.2);
    lastObstacleZ -= gap;
  }

  return lastObstacleZ;
}

export function despawnObstacles(
  car: THREE.Object3D,
  obstacles: THREE.Object3D[],
  scene: THREE.Scene,
): THREE.Object3D[] {
  const despawnZ = car.position.z + 30;
  return obstacles.filter((obs) => {
    if (obs.position.z < despawnZ) return true;
    scene.remove(obs);
    return false;
  });
}
