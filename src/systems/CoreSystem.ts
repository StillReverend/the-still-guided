// ============================================================
// THE STILL — Phase 6: Core System v1 (Black Hole)
// ------------------------------------------------------------
// Responsibilities:
//  - Create and manage the central "core" of THE STILL
//    * Black hole sphere
//    * Legacy accretion ring disk
//    * Aura/glow shell
//  - Host the ClockWorks (H/M/S rings) around the core
//  - Slow rotation for constant motion
//  - API: setShrinkLevel(0..12)
//    * Drives visual scale to reflect constellation progress
//  - (Hum audio will be wired in Phase 7 Audio System; stub only here.)
// ============================================================

import * as THREE from "three";
import type { Config } from "../core/Config";
import { ClockWorks } from "../core/ClockWorks";

export interface CoreSystemDeps {
  scene: THREE.Scene;
  config: Config;
  camera: THREE.Camera; // kept for future use if needed
}

export class CoreSystem {
  private readonly scene: THREE.Scene;
  private readonly config: Config;
  private readonly camera: THREE.Camera;

  private group: THREE.Group | null = null;
  private coreMesh: THREE.Mesh | null = null;
  private ringMesh: THREE.Mesh | null = null;
  private auraMesh: THREE.Mesh | null = null;

  private clockWorks: ClockWorks | null = null;

  private shrinkLevel = 0; // 0..12
  private readonly maxLevel = 12;

  constructor({ scene, config, camera }: CoreSystemDeps) {
    this.scene = scene;
    this.config = config;
    this.camera = camera;
  }

  // ----------------------------------------------------------
  // Init / Dispose
  // ----------------------------------------------------------

  public init(): void {
    const c = this.config.core;

    // Parent group so we can rotate + scale as a unit
    this.group = new THREE.Group();
    this.group.name = "CoreSystem";

    // Initial tilt so it's not perfectly axis-aligned
    this.group.rotation.x = c.tiltX;
    this.group.rotation.z = c.tiltZ;

    // ------------------------
    // Core sphere (black hole)
    // ------------------------
    const coreGeom = new THREE.SphereGeometry(c.baseRadius, 64, 64);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x000000,
      metalness: 1.0,
      roughness: 0.31,
      wireframe: false,
    });

    this.coreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.coreMesh.name = "CoreSphere";

    // ------------------------
    // Accretion ring (legacy disk)
    // ------------------------
    const ringGeom = new THREE.RingGeometry(
      c.ringInnerRadius,
      c.ringOuterRadius,
      128
    );

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfeffed,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ringMesh = new THREE.Mesh(ringGeom, ringMat);
    this.ringMesh.name = "CoreRing";
    this.ringMesh.rotation.x = Math.PI / 2; // lay flat in XZ plane

    // ------------------------
    // Aura shell (soft glow)
    // ------------------------
    const auraGeom = new THREE.SphereGeometry(c.auraRadius, 48, 48);

    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x171717,
      transparent: true,
      opacity: 0.31,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.auraMesh = new THREE.Mesh(auraGeom, auraMat);
    this.auraMesh.name = "CoreAura";

    // Assemble group
    this.group.add(this.coreMesh);
    this.group.add(this.ringMesh);
    this.group.add(this.auraMesh);

    this.scene.add(this.group);

    // Apply initial shrink level
    this.applyShrinkLevel();

    // --------------------------------------------------------
    // ClockWorks (H/M/S rings) — always present around the core
    // --------------------------------------------------------
    // Use c.baseRadius as the coreRadius so the clock cluster "hugs" the black hole.
    // ClockWorks creates its own group at the origin; we then parent it to the core
    // so it shares the same tilt + rotation.
    this.clockWorks = new ClockWorks(this.scene, {
      coreRadius: c.baseRadius,
      baseGap: 3.0,
      hourRingThickness: 4.0,
      minuteRingThickness: 2.0,
      secondRingThickness: 1.0,
      gapHM: 1.5,
      gapMS: 3.0,
      ringSegments: 128,
      // Colors + opacities fall back to ClockWorks defaults unless overridden here
    });

    if (this.group && this.clockWorks.group) {
      this.group.add(this.clockWorks.group);
    }
  }

  public dispose(): void {
    // Remove core group
    if (this.group) {
      this.scene.remove(this.group);
    }

    // Dispose ClockWorks
    if (this.clockWorks) {
      this.clockWorks.dispose(this.scene);
      this.clockWorks = null;
    }

    // Dispose geometries/materials
    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      (this.coreMesh.material as THREE.Material).dispose();
      this.coreMesh = null;
    }

    if (this.ringMesh) {
      this.ringMesh.geometry.dispose();
      (this.ringMesh.material as THREE.Material).dispose();
      this.ringMesh = null;
    }

    if (this.auraMesh) {
      this.auraMesh.geometry.dispose();
      (this.auraMesh.material as THREE.Material).dispose();
      this.auraMesh = null;
    }

    this.group = null;
  }

  // ----------------------------------------------------------
  // Per-frame update
  // ----------------------------------------------------------

  public update(dt: number): void {
    if (!this.group) return;
    const c = this.config.core;

    // Simple slow rotation around Y (plus any static tilt)
    this.group.rotation.y += c.rotationSpeed * dt;

    // Update clock rings (time-based fill)
    if (this.clockWorks) {
      this.clockWorks.update(dt);
    }
  }

  // ----------------------------------------------------------
  // Shrink API (0..12)
  // ----------------------------------------------------------

  public setShrinkLevel(level: number): void {
    // Clamp to 0..maxLevel
    const clamped = Math.max(0, Math.min(this.maxLevel, Math.round(level)));
    if (clamped === this.shrinkLevel) return;

    this.shrinkLevel = clamped;
    this.applyShrinkLevel();
  }

  public getShrinkLevel(): number {
    return this.shrinkLevel;
  }

  private applyShrinkLevel(): void {
    if (!this.group) return;
    const c = this.config.core;

    // Map 0..maxLevel → scale range [1.0 .. minScale]
    const t = this.shrinkLevel / this.maxLevel; // 0..1
    const scale = THREE.MathUtils.lerp(1.0, c.minScale, t);

    this.group.scale.setScalar(scale);

    // Optional: subtly adjust aura opacity based on shrink progress
    if (this.auraMesh) {
      const mat = this.auraMesh.material as THREE.MeshBasicMaterial;
      const base = 0.31;
      mat.opacity = THREE.MathUtils.clamp(base + t * 0.31, 0.05, 0.9);
    }
  }

  // ----------------------------------------------------------
  // (Phase 7 hook) Hum control API stub
  // ----------------------------------------------------------

  // In Phase 7, this can be wired to an AudioSystem to control
  // pre-rendered hum intensity or filter.
  public setHumEnabled(_enabled: boolean): void {
    // Stub for now — real audio hookup in Phase 7.
  }
}
