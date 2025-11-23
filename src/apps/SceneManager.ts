import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Config } from "../core/Config";
import type { Time } from "../core/Time";
import type { SaveManager } from "../core/SaveManager";
import { StillnessScene } from "../scenes/StillnessScene";

export interface SceneManagerDeps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
  save: SaveManager;
}

export class SceneManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly bus: EventBus;
  private readonly config: Config;
  private readonly time: Time;
  private readonly save: SaveManager;

  private activeScene: StillnessScene | null = null;

  constructor({ renderer, bus, config, time, save }: SceneManagerDeps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;
    this.time = time;
    this.save = save;
  }

  public init(): void {
    this.activeScene = new StillnessScene({
      renderer: this.renderer,
      bus: this.bus,
      config: this.config,
      time: this.time,
      save: this.save,
    });
    this.activeScene.init();
  }

  public update(dt: number): void {
    if (!this.activeScene) return;
    this.activeScene.update(dt);
    this.renderer.render(this.activeScene.scene, this.activeScene.camera);
  }

  public onResize(width: number, height: number): void {
    this.activeScene?.onResize(width, height);
  }

  public dispose(): void {
    this.activeScene?.dispose();
    this.activeScene = null;
  }
}