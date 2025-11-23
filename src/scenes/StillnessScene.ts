import * as THREE from "three";
import { EventBus } from "../core/EventBus";
import type { Config } from "../core/Config";
import { Time } from "../core/Time";

export interface StillnessSceneDeps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
}

export class StillnessScene {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bus: EventBus;
  private readonly config: Config;

  private testStars: THREE.Points | null = null;

  constructor({ renderer, bus, config }: StillnessSceneDeps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.app.bgColor);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 5);
  }

  public init(): void {
    // Minimal placeholder starfield for Phase 1
    this.testStars = this.createTestStars(1500);
    this.scene.add(this.testStars);

    // Simple ambient light placeholder
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    this.bus.emit("scene:ready", { id: "stillness" });
  }

  public update(dt: number): void {
    if (this.testStars) {
      this.testStars.rotation.y += dt * 0.02;
    }
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    if (this.testStars) {
      this.testStars.geometry.dispose();
      (this.testStars.material as THREE.Material).dispose();
      this.scene.remove(this.testStars);
      this.testStars = null;
    }
    this.bus.emit("scene:dispose", { id: "stillness" });
  }

  private createTestStars(count: number): THREE.Points {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = (Math.random() - 0.5) * 200;
      positions[i3 + 2] = (Math.random() - 0.5) * 200;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    return new THREE.Points(geom, mat);
  }
}