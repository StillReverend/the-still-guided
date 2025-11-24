import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Config } from "../core/Config";
import type { Time } from "../core/Time";
import type { SaveManager } from "../core/SaveManager";
import { CameraSystem } from "../systems/CameraSystem";
import { StarfieldSystem } from "../systems/StarfieldSystem";

export interface StillnessSceneDeps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
  save: SaveManager;
}

export class StillnessScene {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bus: EventBus;
  private readonly config: Config;
  private readonly save: SaveManager;

  private cameraSystem: CameraSystem | null = null;
  private starfield: StarfieldSystem | null = null;

  constructor({ renderer, bus, config, save }: StillnessSceneDeps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;
    this.save = save;

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

    // Note: position will be overridden by CameraSystem from save.
    this.camera.position.set(0, 0, 5);
  }

  public init(): void {

    // Simple ambient light placeholder
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    // Camera system mounts here
    this.cameraSystem = new CameraSystem({
      camera: this.camera,
      domElement: this.renderer.domElement,
      bus: this.bus,
      config: this.config,
      save: this.save,
    });
    this.cameraSystem.init();

    this.bus.emit("scene:ready", { id: "stillness" });

    this.starfield = new StarfieldSystem({
      scene: this.scene,
      camera: this.camera,
      config: this.config,
    });
    this.starfield.init();

  }

  public update(dt: number): void {
    this.cameraSystem?.update(dt);
    this.starfield?.update(dt);
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.cameraSystem?.onResize();
  }

  public dispose(): void {
    this.cameraSystem?.dispose();
    this.cameraSystem = null;
    this.starfield?.dispose();
    this.starfield = null;

    this.bus.emit("scene:dispose", { id: "stillness" });
  }
}