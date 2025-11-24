// /src/scenes/TestScene01.ts
import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Config } from "../core/Config";
import type { Time } from "../core/Time";
import type { SaveManager } from "../core/SaveManager";

export interface TestScene01Deps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
  save: SaveManager;
}

export class TestScene01 {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bus: EventBus;
  private readonly config: Config;

  private testMesh: THREE.Mesh | null = null;

  constructor({ renderer, bus, config }: TestScene01Deps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a18); // deep space navy

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 6);
  }

  public init(): void {
    const geo = new THREE.IcosahedronGeometry(1.4, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
    this.testMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.testMesh);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 4, 5);
    this.scene.add(light);

    this.bus.emit("scene:ready", { id: "test01" });
  }

  public update(dt: number): void {
    if (this.testMesh) {
      this.testMesh.rotation.y += dt * 0.8;
      this.testMesh.rotation.x += dt * 0.4;
    }
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    if (this.testMesh) {
      this.testMesh.geometry.dispose();
      (this.testMesh.material as THREE.Material).dispose();
      this.scene.remove(this.testMesh);
      this.testMesh = null;
    }
    this.bus.emit("scene:dispose", { id: "test01" });
  }
}
