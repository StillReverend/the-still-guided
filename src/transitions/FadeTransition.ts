// /src/transitions/FadeTransition.ts
import * as THREE from "three";
import type { Transition, TransitionPhase } from "../core/Transition";

export class FadeTransition implements Transition {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private quad!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private phase: TransitionPhase = "idle";
  private alpha = 0;

  // fade speeds in seconds (tweak later if desired)
  private speedOut = 1.5;
  private speedIn = 1.2;

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geom = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uAlpha: { value: this.alpha },
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uAlpha;
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
      `,
    });

    this.quad = new THREE.Mesh(geom, mat);
    this.scene.add(this.quad);
  }

  startOut(): void {
    this.phase = "out";
    this.alpha = 0;
    this.setAlpha(this.alpha);
  }

  startIn(): void {
    this.phase = "in";
    this.alpha = 1;
    this.setAlpha(this.alpha);
  }

  update(dt: number): void {
    if (this.phase === "out") {
      this.alpha += dt / this.speedOut;
      if (this.alpha >= 1) {
        this.alpha = 1;
        this.phase = "idle";
      }
      this.setAlpha(this.alpha);
      this.renderOverlay();
      return;
    }

    if (this.phase === "in") {
      this.alpha -= dt / this.speedIn;
      if (this.alpha <= 0) {
        this.alpha = 0;
        this.phase = "idle";
      }
      this.setAlpha(this.alpha);
      this.renderOverlay();
      return;
    }
  }

  isIdle(): boolean {
    return this.phase === "idle";
  }

  isOutComplete(): boolean {
    return this.phase === "idle" && this.alpha >= 1;
  }

  isInComplete(): boolean {
    return this.phase === "idle" && this.alpha <= 0;
  }

  dispose(): void {
    this.quad.geometry.dispose();
    this.quad.material.dispose();
    // allow GC
    (this.scene as any) = null;
  }

  private setAlpha(a: number): void {
    this.quad.material.uniforms.uAlpha.value = a;
  }

  private renderOverlay(): void {
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = prevAutoClear;
  }
}
