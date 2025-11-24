// ============================================================
// THE STILL — Phase 5: Starfield System v1
// ------------------------------------------------------------
// Creates three layered starfields:
//  - FAR sphere (background shell)
//  - BAND disk (mid-space belt; future audio-reactive layer)
//  - NEAR volume (foreground depth/parallax)
// With:
//  - slow drift + subtle flicker
//  - occlusion zone around core
// ------------------------------------------------------------
// FILE: /src/systems/StarfieldSystem.ts
// ============================================================

import * as THREE from "three";
import type { Config } from "../core/Config";

export interface StarfieldSystemDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  config: Config;
}

type LayerName = "far" | "band" | "near";

type Layer = {
  name: LayerName;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  baseOpacity: number;
  phase: number;
};

export class StarfieldSystem {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly config: Config;

  private farLayer: Layer | null = null;
  private bandLayer: Layer | null = null;
  private nearLayer: Layer | null = null;

  // drift accumulators
  private driftFar = new THREE.Euler(0, 0, 0);
  private driftBand = new THREE.Euler(0, 0, 0);
  private driftNear = new THREE.Euler(0, 0, 0);

  // cached occlusion
  private occlusionRadius: number;

  constructor({ scene, camera, config }: StarfieldSystemDeps) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.occlusionRadius = this.config.starfield.occlusionRadius;
  }

  public init(): void {
    const sf = this.config.starfield;

    this.farLayer = this.createFarLayer(sf.farCount, sf.farRadius);
    this.bandLayer = this.createBandLayer(
      sf.bandCount,
      sf.bandInnerRadius,
      sf.bandOuterRadius,
      sf.bandThickness
    );
    this.nearLayer = this.createNearLayer(sf.nearCount, sf.nearRadius);

    this.scene.add(this.farLayer.points);
    this.scene.add(this.bandLayer.points);
    this.scene.add(this.nearLayer.points);
  }

  public update(dt: number): void {
    const sf = this.config.starfield;
    const t = performance.now() * 0.001;

    // ------------------------------
    // Drift (very subtle)
    // ------------------------------

    if (this.farLayer) {
      this.driftFar.y += sf.driftSpeedFar * dt;
      this.driftFar.x += sf.driftSpeedFar * 0.25 * dt;
      this.farLayer.points.rotation.set(this.driftFar.x, this.driftFar.y, 0);
    }

    if (this.bandLayer) {
      this.driftBand.y += sf.driftSpeedBand * dt;
      this.bandLayer.points.rotation.set(0, this.driftBand.y, 0);
    }

    if (this.nearLayer) {
      this.driftNear.y += sf.driftSpeedNear * dt;
      this.nearLayer.points.rotation.set(0, this.driftNear.y, 0);
    }

    // ------------------------------
    // Flicker (layer-level opacity pulse)
    // ------------------------------

    const flicker = (phase: number, baseOpacity: number): number => {
      const pulse = Math.sin(t * sf.flickerSpeed + phase) * sf.flickerAmount;
      return THREE.MathUtils.clamp(baseOpacity + pulse, 0.02, 1);
    };

    if (this.farLayer) {
      this.farLayer.material.opacity = flicker(
        this.farLayer.phase,
        this.farLayer.baseOpacity
      );
    }

    if (this.bandLayer) {
      this.bandLayer.material.opacity = flicker(
        this.bandLayer.phase,
        this.bandLayer.baseOpacity
      );
    }

    if (this.nearLayer) {
      this.nearLayer.material.opacity = flicker(
        this.nearLayer.phase,
        this.nearLayer.baseOpacity
      );
    }
  }

  public dispose(): void {
    const layers = [this.farLayer, this.bandLayer, this.nearLayer];
    for (const l of layers) {
      if (!l) continue;
      this.scene.remove(l.points);
      l.geometry.dispose();
      l.material.dispose();
    }
    this.farLayer = null;
    this.bandLayer = null;
    this.nearLayer = null;
  }

  // Future hook: audio-reactive BAND layer access
  public getBandPoints(): THREE.Points | null {
    return this.bandLayer?.points ?? null;
  }

  // ============================================================
  // Layer factories
  // ============================================================

  private createFarLayer(count: number, radius: number): Layer {
    // Far layer is a shell near the outer radius
    const minR = radius * 0.85;
    const maxR = radius;

    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const p = this.randomPointInSphereShell(minR, maxR);
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.30,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);

    return {
      name: "far",
      points,
      geometry,
      material,
      baseOpacity: 0.75,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private createNearLayer(count: number, radius: number): Layer {
    const positions = new Float32Array(count * 3);

    let placed = 0;
    while (placed < count) {
      const p = this.randomPointInSphere(radius);
      if (p.length() < this.occlusionRadius) continue;

      positions[placed * 3 + 0] = p.x;
      positions[placed * 3 + 1] = p.y;
      positions[placed * 3 + 2] = p.z;
      placed++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffed,
      size: 0.40,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);

    return {
      name: "near",
      points,
      geometry,
      material,
      baseOpacity: 0.9,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private createBandLayer(
    count: number,
    innerR: number,
    outerR: number,
    thickness: number
  ): Layer {
    const positions = new Float32Array(count * 3);

    let placed = 0;
    while (placed < count) {
      const p = this.randomPointInBand(innerR, outerR, thickness);
      if (p.length() < this.occlusionRadius) continue;

      positions[placed * 3 + 0] = p.x;
      positions[placed * 3 + 1] = p.y;
      positions[placed * 3 + 2] = p.z;
      placed++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffed,
      size: 0.50,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);

    return {
      name: "band",
      points,
      geometry,
      material,
      baseOpacity: 0.9,
      phase: Math.random() * Math.PI * 2,
    };
  }

  // ============================================================
  // Random point helpers
  // ============================================================

  private randomPointInSphere(maxRadius: number): THREE.Vector3 {
    // Uniform random in volume
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = maxRadius * Math.cbrt(w);

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private randomPointInSphereShell(minRadius: number, maxRadius: number): THREE.Vector3 {
    // Uniform between two radii; cube-root for volume distribution
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const r3 = minRadius ** 3 + (maxRadius ** 3 - minRadius ** 3) * w;
    const r = Math.cbrt(r3);

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private randomPointInBand(innerR: number, outerR: number, thickness: number): THREE.Vector3 {
    // Random point in thick annulus / disk
    const angle = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.lerp(innerR, outerR, Math.random());
    const y = (Math.random() - 0.5) * thickness;

    return new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    );
  }
}