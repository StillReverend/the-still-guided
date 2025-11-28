// src/dev/DebugTools.ts
// Simple dev HUD: FPS + camera position

import * as THREE from "three";
// If this import path fails, you may need to adjust it or install `stats.js`.
import Stats from "three/examples/jsm/libs/stats.module.js";

export class DebugTools {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly stats: any;
  private readonly hudEl: HTMLDivElement;

  constructor(camera: THREE.PerspectiveCamera, _container: HTMLElement) {
    this.camera = camera;

    // ----------------------------------------------------
    // FPS panel (Stats.js) — top-left
    // ----------------------------------------------------
    this.stats = new (Stats as any)();
    this.stats.showPanel(0); // 0: FPS

    this.stats.dom.style.position = "fixed";
    this.stats.dom.style.left = "0px";
    this.stats.dom.style.top = "0px";
    this.stats.dom.style.zIndex = "9998";
    this.stats.dom.style.opacity = "0.9";

    document.body.appendChild(this.stats.dom);

    // ----------------------------------------------------
    // Camera HUD — just below FPS, also top-left
    // ----------------------------------------------------
    this.hudEl = document.createElement("div");
    this.hudEl.style.position = "fixed";
    this.hudEl.style.left = "0px";
    this.hudEl.style.top = "48px"; // below stats panel
    this.hudEl.style.padding = "6px 8px";
    this.hudEl.style.background = "rgba(0, 0, 0, 0.6)";
    this.hudEl.style.color = "#ffffff";
    this.hudEl.style.fontFamily = "monospace";
    this.hudEl.style.fontSize = "10px";
    this.hudEl.style.whiteSpace = "pre";
    this.hudEl.style.pointerEvents = "none";
    this.hudEl.style.zIndex = "9999";

    document.body.appendChild(this.hudEl);

    this.updateHud();
  }

  // Call this once per frame from your main loop
  public update(): void {
    this.stats.update();
    this.updateHud();
  }

  private updateHud(): void {
    const p = this.camera.position;

    this.hudEl.textContent =
      `cam pos:\n` +
      `x: ${p.x.toFixed(2)}\n` +
      `y: ${p.y.toFixed(2)}\n` +
      `z: ${p.z.toFixed(2)}`;
  }

  public dispose(): void {
    if (this.stats && this.stats.dom && this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }

    if (this.hudEl && this.hudEl.parentElement) {
      this.hudEl.parentElement.removeChild(this.hudEl);
    }
  }
}
