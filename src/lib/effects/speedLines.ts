import * as THREE from "three";
import type { RemixConfig } from "../config";

export class SpeedLines {
  private points: THREE.Points;
  private velocities: Float32Array;
  private particleCount = 200;

  constructor(config: RemixConfig, scene: THREE.Scene) {
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 5 + 0.5;
      positions[i * 3 + 2] = Math.random() * -80;
      this.velocities[i] = 20 + Math.random() * 40;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(config.speedLineColor),
      size: 0.15,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    scene.add(this.points);
  }

  update(
    dt: number,
    carPosition: THREE.Vector3,
    speed: number,
    initialSpeed: number,
    maxSpeed: number
  ): void {
    const positions = this.points.geometry.attributes.position
      .array as Float32Array;
    const material = this.points.material as THREE.PointsMaterial;

    const speedRatio = Math.max(
      0,
      (speed - initialSpeed) / (maxSpeed - initialSpeed)
    );
    material.opacity = speedRatio * 0.6;

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3 + 2] += this.velocities[i] * dt;

      if (positions[i * 3 + 2] > carPosition.z + 10) {
        positions[i * 3] = carPosition.x + (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = Math.random() * 5 + 0.5;
        positions[i * 3 + 2] = carPosition.z - 40 - Math.random() * 40;
        this.velocities[i] = 20 + Math.random() * 40;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
