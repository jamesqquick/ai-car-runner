import * as THREE from "three";
import type { RemixConfig } from "../config";

export function createCar(
  config: RemixConfig,
  carWidth: number,
  carHeight: number,
  carLength: number,
): THREE.Group {
  const group = new THREE.Group();

  const carColorHex = new THREE.Color(config.carColor).getHex();

  // Main body — lower section
  const bodyGeo = new THREE.BoxGeometry(carWidth, carHeight * 0.6, carLength);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: carColorHex,
    metalness: 0.7,
    roughness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = carHeight * 0.3 + 0.35;
  body.castShadow = true;
  group.add(body);

  // Hood (front slopes down slightly)
  const hoodGeo = new THREE.BoxGeometry(carWidth * 0.95, carHeight * 0.3, carLength * 0.35);
  const hoodMat = new THREE.MeshStandardMaterial({
    color: carColorHex,
    metalness: 0.7,
    roughness: 0.2,
  });
  const hood = new THREE.Mesh(hoodGeo, hoodMat);
  hood.position.y = carHeight * 0.6 + 0.35;
  hood.position.z = -carLength * 0.25;
  hood.castShadow = true;
  group.add(hood);

  // Cabin (windshield area)
  const cabinGeo = new THREE.BoxGeometry(
    carWidth * 0.8,
    carHeight * 0.55,
    carLength * 0.35,
  );
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = carHeight * 0.6 + carHeight * 0.275 + 0.35;
  cabin.position.z = carLength * 0.05;
  cabin.castShadow = true;
  group.add(cabin);

  // Spoiler
  const spoilerWingGeo = new THREE.BoxGeometry(carWidth * 0.9, 0.06, 0.4);
  const spoilerMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.8,
    roughness: 0.3,
  });
  const spoilerWing = new THREE.Mesh(spoilerWingGeo, spoilerMat);
  spoilerWing.position.y = carHeight + 0.7;
  spoilerWing.position.z = carLength * 0.42;
  spoilerWing.castShadow = true;
  group.add(spoilerWing);

  // Spoiler supports
  [-0.5, 0.5].forEach((x) => {
    const supportGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    const support = new THREE.Mesh(supportGeo, spoilerMat);
    support.position.set(x, carHeight + 0.5, carLength * 0.42);
    group.add(support);
  });

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.5,
    roughness: 0.6,
  });
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 8);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.9,
    roughness: 0.1,
  });
  const wheelPositions: [number, number, number][] = [
    [-carWidth / 2 - 0.12, 0.32, carLength * 0.3],
    [carWidth / 2 + 0.12, 0.32, carLength * 0.3],
    [-carWidth / 2 - 0.12, 0.32, -carLength * 0.3],
    [carWidth / 2 + 0.12, 0.32, -carLength * 0.3],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  });

  // Headlights (bright)
  const headlightGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffee,
    emissive: 0xffffcc,
    emissiveIntensity: 3,
  });
  [-0.55, 0.55].forEach((x) => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.position.set(x, carHeight * 0.4 + 0.35, -carLength / 2 - 0.02);
    group.add(hl);
  });

  // Headlight glow
  const headlightGlow = new THREE.PointLight(0xffffcc, 2, 20);
  headlightGlow.position.set(0, 0.7, -carLength / 2 - 1);
  group.add(headlightGlow);

  // Taillights (red glow)
  const taillightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2,
  });
  [-0.55, 0.55].forEach((x) => {
    const tl = new THREE.Mesh(taillightGeo, taillightMat);
    tl.position.set(x, carHeight * 0.4 + 0.35, carLength / 2 + 0.02);
    group.add(tl);
  });

  return group;
}
