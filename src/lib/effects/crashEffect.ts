import * as THREE from "three";

export class CrashEffect {
  private points: THREE.Points;
  private velocities: Float32Array;
  private particleCount = 80;
  private active = false;
  private elapsed = 0;
  private duration = 1.5;

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      // Orange-to-red gradient
      const t = Math.random();
      colors[i * 3] = 1.0; // R
      colors[i * 3 + 1] = 0.3 + t * 0.4; // G (orange to red)
      colors[i * 3 + 2] = 0.05; // B
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    scene.add(this.points);
  }

  trigger(carPosition: THREE.Vector3): void {
    this.active = true;
    this.elapsed = 0;

    const positions = this.points.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = carPosition.x;
      positions[i * 3 + 1] = carPosition.y + 0.5;
      positions[i * 3 + 2] = carPosition.z;

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const force = 3 + Math.random() * 8;

      this.velocities[i * 3] =
        Math.cos(angle) * Math.cos(elevation) * force;
      this.velocities[i * 3 + 1] =
        Math.abs(Math.sin(elevation)) * force * 1.2;
      this.velocities[i * 3 + 2] =
        Math.sin(angle) * Math.cos(elevation) * force;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).opacity = 1;
  }

  update(dt: number): boolean {
    if (!this.active) return false;

    this.elapsed += dt;
    if (this.elapsed > this.duration) {
      this.active = false;
      (this.points.material as THREE.PointsMaterial).opacity = 0;
      return false;
    }

    const positions = this.points.geometry.attributes.position
      .array as Float32Array;
    const gravity = -15;

    for (let i = 0; i < this.particleCount; i++) {
      this.velocities[i * 3 + 1] += gravity * dt;

      positions[i * 3] += this.velocities[i * 3] * dt;
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

      // Floor bounce
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 0;
        this.velocities[i * 3 + 1] *= -0.3;
      }
    }

    const progress = this.elapsed / this.duration;
    (this.points.material as THREE.PointsMaterial).opacity =
      1 - progress * progress;

    this.points.geometry.attributes.position.needsUpdate = true;
    return true;
  }
}
