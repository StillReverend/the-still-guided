import * as THREE from "three";

export type TransitionPhase = "idle" | "out" | "in";

export interface Transition {
  /** Called once after construction */
  init(renderer: THREE.WebGLRenderer): void;

  /** Begin fading out current scene */
  startOut(): void;

  /** Begin fading in next scene */
  startIn(): void;

  /** Update fade each frame */
  update(dt: number): void;

  /** True when phase is idle and no transition active */
  isIdle(): boolean;

  /** True when fade-out is complete */
  isOutComplete(): boolean;

  /** True when fade-in is complete */
  isInComplete(): boolean;

  /** Clean GPU resources */
  dispose(): void;
}
