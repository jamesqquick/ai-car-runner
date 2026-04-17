import * as THREE from "three";
import type { RemixConfig, GameConstants } from "../config";

export function createRoadSegment(
  config: RemixConfig,
  constants: GameConstants,
  zOffset: number,
): THREE.Group {
  const {
    ROAD_WIDTH,
    ROAD_SEGMENT_LENGTH,
    LANE_COUNT,
    LANE_POSITIONS,
    LANE_WIDTH,
  } = constants;

  const group = new THREE.Group();

  // Road surface
  const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 2, ROAD_SEGMENT_LENGTH);
  const roadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.roadColor).getHex(),
    roughness: 0.7,
    metalness: 0.15,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.receiveShadow = true;
  group.add(road);

  // Lane dividers — dashed white lines
  const dividerGeo = new THREE.PlaneGeometry(0.12, 2.5);
  const dividerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
  });
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = LANE_POSITIONS[i] - LANE_WIDTH / 2;
    for (
      let d = -ROAD_SEGMENT_LENGTH / 2;
      d < ROAD_SEGMENT_LENGTH / 2;
      d += 5
    ) {
      const divider = new THREE.Mesh(dividerGeo, dividerMat);
      divider.rotation.x = -Math.PI / 2;
      divider.position.set(x, 0.02, d);
      group.add(divider);
    }
  }

  // Road edge lines (solid white)
  const edgeLineGeo = new THREE.PlaneGeometry(0.15, ROAD_SEGMENT_LENGTH);
  const edgeLineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2,
  });
  [-1, 1].forEach((side) => {
    const line = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(side * (ROAD_WIDTH / 2 + 0.5), 0.02, 0);
    group.add(line);
  });

  // Curbs
  const curbColorHex = new THREE.Color(config.curbColor).getHex();
  const curbGeo = new THREE.BoxGeometry(0.3, 0.15, ROAD_SEGMENT_LENGTH);
  const curbMat = new THREE.MeshStandardMaterial({
    color: curbColorHex,
    emissive: curbColorHex,
    emissiveIntensity: 0.15,
  });
  [-1, 1].forEach((side) => {
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(side * (ROAD_WIDTH / 2 + 1.15), 0.075, 0);
    group.add(curb);
  });

  // Ground plane on sides — darker
  const groundGeo = new THREE.PlaneGeometry(40, ROAD_SEGMENT_LENGTH);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a120a,
    roughness: 1,
  });
  [-1, 1].forEach((side) => {
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(side * (ROAD_WIDTH / 2 + 21), -0.01, 0);
    ground.receiveShadow = true;
    group.add(ground);
  });

  // Streetlights every ~20 units
  const lightPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 6);
  const lightPoleMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.7,
    roughness: 0.3,
  });
  const lightHeadGeo = new THREE.BoxGeometry(0.3, 0.1, 0.5);
  const lightHeadMat = new THREE.MeshStandardMaterial({
    color: 0xffcc88,
    emissive: 0xffcc88,
    emissiveIntensity: 1.5,
  });

  for (let d = -ROAD_SEGMENT_LENGTH / 2 + 5; d < ROAD_SEGMENT_LENGTH / 2; d += 20) {
    [-1, 1].forEach((side) => {
      const pole = new THREE.Mesh(lightPoleGeo, lightPoleMat);
      pole.position.set(side * (ROAD_WIDTH / 2 + 2), 2.5, d);
      group.add(pole);

      const head = new THREE.Mesh(lightHeadGeo, lightHeadMat);
      head.position.set(side * (ROAD_WIDTH / 2 + 1.5), 5, d);
      group.add(head);

      // Actual point light (dim, warm)
      const streetLight = new THREE.PointLight(0xffcc88, 0.6, 12);
      streetLight.position.set(side * (ROAD_WIDTH / 2 + 1.5), 4.8, d);
      group.add(streetLight);
    });
  }

  group.position.z = zOffset;
  return group;
}
