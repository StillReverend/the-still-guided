import * as THREE from "three";
import type { Config } from "../core/Config";
import { Time } from "../core/Time";
import { StillnessScene } from "../scenes/StillnessScene";


export interface SceneManagerDeps {
renderer: THREE.WebGLRenderer;
bus: EventBus;
config: Config;
time: Time;
}


export class SceneManager {
private readonly renderer: THREE.WebGLRenderer;
private readonly bus: EventBus;
private readonly config: Config;
private readonly time: Time;


private activeScene: StillnessScene | null = null;


constructor({ renderer, bus, config, time }: SceneManagerDeps) {
this.renderer = renderer;
this.bus = bus;
this.config = config;
this.time = time;
}


public init(): void {
// For Phase 1 we load a single scene. Later we’ll generalize.
this.activeScene = new StillnessScene({
renderer: this.renderer,
bus: this.bus,
config: this.config,
time: this.time,
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