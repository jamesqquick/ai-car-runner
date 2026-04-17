import * as THREE from "three";
import type { RemixConfig } from "../config";

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ambientLight: THREE.AmbientLight;
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  underGlow: THREE.PointLight;
  starfield: THREE.Points;

  constructor(canvas: HTMLCanvasElement, config: RemixConfig) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(
      new THREE.Color(config.fogColor).getHex(),
      0.015
    );
    this.scene.background = new THREE.Color(config.skyColor);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 6, 8);
    this.camera.lookAt(0, 0, -15);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x303050, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light with shadows
    this.dirLight = new THREE.DirectionalLight(
      new THREE.Color(config.lightingColor),
      0.8
    );
    this.dirLight.position.set(5, 15, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    // Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0x4466aa, 0x332211, 0.3);
    this.scene.add(this.hemiLight);

    // Under-glow point light
    this.underGlow = new THREE.PointLight(0xf97316, 1.5, 15);
    this.scene.add(this.underGlow);

    // Starfield
    this.starfield = this.createStarfield();
    this.scene.add(this.starfield);
  }

  private createStarfield(): THREE.Points {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // upper hemisphere
      const r = 100 + Math.random() * 150;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
