import * as THREE from "three";
import { SceneManager } from "./SceneManager";
import { EventBus } from "../core/EventBus";
import { createDefaultConfig } from "../core/Config";
import type { Config } from "../core/Config";
import { Time } from "../core/Time";
import { SaveManager } from "../core/SaveManager";

export class Entry {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly bus: EventBus;
  public readonly config: Config;
  public readonly time: Time;
  public readonly sceneManager: SceneManager;
  public readonly save: SaveManager;

  private rafId: number | null = null;
  private isRunning = false;

  constructor(canvas?: HTMLCanvasElement) {
    // Canvas
    const targetCanvas = canvas ?? this.ensureCanvas();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: targetCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Core services
    this.bus = new EventBus();
    this.config = createDefaultConfig();
    this.time = new Time();
    this.save = new SaveManager();
    this.save.enableAutosave();

    // Scene manager orchestrates scenes + systems
    this.sceneManager = new SceneManager({
      renderer: this.renderer,
      bus: this.bus,
      config: this.config,
      time: this.time,
      save: this.save,
    });

    // Resize handling
    window.addEventListener("resize", this.handleResize);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sceneManager.init();
    // Dev hotkeys for testing transitions
    window.addEventListener("keydown", (e) => {
      if (e.key === "1") this.sceneManager.transitionTo("stillness");
      if (e.key === "2") this.sceneManager.transitionTo("test01");
    });
    this.loop();
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener("resize", this.handleResize);
    this.sceneManager.dispose();
    this.renderer.dispose();
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.loop);

    const dt = this.time.tick();
    this.sceneManager.update(dt);
  };

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.sceneManager.onResize(w, h);
    this.bus.emit("resize", { width: w, height: h });
  };

  private ensureCanvas(): HTMLCanvasElement {
    let canvas = document.querySelector<HTMLCanvasElement>("#the-still-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "the-still-canvas";
      canvas.style.position = "fixed";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      document.body.style.margin = "0";
      document.body.appendChild(canvas);
    }
    return canvas;
  }
}