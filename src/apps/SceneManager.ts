// /src/apps/SceneManager.ts
import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Config } from "../core/Config";
import type { Time } from "../core/Time";
import type { SaveManager } from "../core/SaveManager";

import { StillnessScene } from "../scenes/StillnessScene";
import { TestScene01 } from "../scenes/TestScene01";
import { Constellation_Test } from "../scenes/constellations/Constellation_Test";

import { FadeTransition } from "../transitions/FadeTransition";
import type { Transition } from "../core/Transition";

export type SceneId = "stillness" | "test01" | "constellation_test";

export interface SceneManagerDeps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
  save: SaveManager;
}

type AnyScene = StillnessScene | TestScene01 | Constellation_Test;

export class SceneManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly bus: EventBus;
  private readonly config: Config;
  private readonly time: Time;
  private readonly save: SaveManager;

  private activeScene: AnyScene | null = null;
  private activeSceneId: SceneId = "stillness";

  private transition: Transition;
  private transitionInProgress = false;
  private pendingSceneId: SceneId | null = null;

  constructor({ renderer, bus, config, time, save }: SceneManagerDeps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;
    this.time = time;
    this.save = save;

    this.transition = new FadeTransition();
    this.transition.init(this.renderer);
  }

  public getActiveCamera(): THREE.PerspectiveCamera | null {
    return this.activeScene ? this.activeScene.camera : null;
  }

  public init(): void {
    this.activeScene = this.createScene("stillness");
    this.activeSceneId = "stillness";
    this.activeScene.init();
  }

  public async transitionTo(sceneId: SceneId): Promise<void> {
    if (this.transitionInProgress) return;
    if (sceneId === this.activeSceneId) return;

    this.transitionInProgress = true;
    this.pendingSceneId = sceneId;

    this.transition.startOut();
  }

  public update(dt: number): void {
    if (!this.activeScene) return;

    this.activeScene.update(dt);
    this.renderer.render(this.activeScene.scene, this.activeScene.camera);

    if (this.transitionInProgress) {
      this.transition.update(dt);

      if (this.transition.isOutComplete() && this.pendingSceneId) {
        this.swapTo(this.pendingSceneId);
        this.pendingSceneId = null;

        this.transition.startIn();
      }

      if (this.transition.isInComplete()) {
        this.transitionInProgress = false;
      }
    }
  }

  public onResize(width: number, height: number): void {
    this.activeScene?.onResize(width, height);
  }

  public dispose(): void {
    this.activeScene?.dispose();
    this.activeScene = null;
    this.transition.dispose();
  }

  private swapTo(sceneId: SceneId): void {
    this.activeScene?.dispose();

    this.activeScene = this.createScene(sceneId);
    this.activeSceneId = sceneId;
    this.activeScene.init();
  }

  private createScene(sceneId: SceneId): AnyScene {
    if (sceneId === "stillness") {
      return new StillnessScene({
        renderer: this.renderer,
        bus: this.bus,
        config: this.config,
        time: this.time,
        save: this.save,
      });
    }

    if (sceneId === "constellation_test") {
        return new Constellation_Test({
        renderer: this.renderer,
        bus: this.bus,
        config: this.config,
        time: this.time,
        save: this.save,
      });
    }

    return new TestScene01({
      renderer: this.renderer,
      bus: this.bus,
      config: this.config,
      time: this.time,
      save: this.save,
    });
  }
}
