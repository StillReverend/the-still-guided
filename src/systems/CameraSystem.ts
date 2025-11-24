import * as THREE from "three";
import type { EventBus } from "../core/EventBus";
import type { Config, DistanceMode } from "../core/Config";
import type { SaveManager } from "../core/SaveManager";

export interface CameraSystemDeps {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  bus: EventBus;
  config: Config;
  save: SaveManager;
}

type PointerRec = {
  id: number;
  pos: THREE.Vector2;
  prev: THREE.Vector2;
  type: PointerEvent["pointerType"];
};

export class CameraSystem {
  public enabled = true;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly bus: EventBus;
  private readonly config: Config;
  private readonly save: SaveManager;

  private target = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical(0, 0, 0);

  private distanceMode: DistanceMode;

  // Mouse state
  private isDragging = false;
  private activePointerId: number | null = null;
  private lastPointer = new THREE.Vector2();

  // Touch / multi-pointer state
  private pointers: Map<number, PointerRec> = new Map();
  private lastPinchDist = 0;
  private lastTwoFingerCenter = new THREE.Vector2();

  // Pinch radius override while pinching / touch zooming
  private radiusOverride: number | null = null;

  // Dynamic FAR clamp (expands as constellations restore)
  private farLimit: number;

  // Auto-rotate
  private idleMs = 0;
  private readonly autoRotateDelayMs: number;
  private readonly autoRotateSpeed = 0.13; // rad/sec

  // Tuning (your current locked-in values)
  private readonly mouseRotateSpeed = 0.0010;
  private readonly touchRotateSpeed = 0.00031;
  private readonly damping = 0.031;
  private readonly panSpeed = 0.0031; // world units per pixel baseline

  // Stronger pinch for real phones
  private readonly pinchZoomSpeed = 0.079; // radius per pinch pixel

  // Dampen pan while pinch active so zoom is visible
  private readonly pinchActiveThreshold = 0.25; // dd pixels
  private readonly pinchPanDamping = 0.25; // 25% pan while pinching

  // Wheel/trackpad debounce
  private lastWheelAt = 0;
  private readonly wheelCooldownMs = 250;
  private readonly wheelThreshold = 4;

  constructor({ camera, domElement, bus, config, save }: CameraSystemDeps) {
    this.camera = camera;
    this.domElement = domElement;
    this.bus = bus;
    this.config = config;
    this.save = save;

    this.autoRotateDelayMs = this.config.camera.autoRotateDelayMs;

    // Initialize from save
    const s = this.save.get();
    this.distanceMode = s.camera.distanceMode;
    const pos = s.camera.position;
    this.camera.position.set(pos.x, pos.y, pos.z);

    this.spherical.setFromVector3(
      this.camera.position.clone().sub(this.target)
    );

    // Start FAR clamp from config FAR distance
    this.farLimit = this.config.camera.distanceModes.FAR;

    this.bindEvents();
  }

  public init(): void {
    // no-op
  }

  public update(dt: number): void {
    if (!this.enabled) return;

    // Apply deltas
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Clamp phi away from poles
    const EPS = 1e-4;
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      EPS,
      Math.PI - EPS
    );

    // Dampen deltas
    this.sphericalDelta.theta *= 1 - this.damping;
    this.sphericalDelta.phi *= 1 - this.damping;

    // Auto-rotate only if idle AND no pointers active
    const hasPointers = this.pointers.size > 0;
    if (!this.isDragging && !hasPointers) {
      this.idleMs += dt * 1000;
      if (this.idleMs > this.autoRotateDelayMs) {
        this.spherical.theta += this.autoRotateSpeed * dt;
      }
    }

    // Radius from override if present, else from discrete mode
    const baseRadius = this.config.camera.distanceModes[this.distanceMode];
    const desiredRadius = this.radiusOverride ?? baseRadius;
    this.spherical.radius = this.clampRadius(desiredRadius);

    // Apply to camera
    const newPos = new THREE.Vector3()
      .setFromSpherical(this.spherical)
      .add(this.target);

    this.camera.position.copy(newPos);
    this.camera.lookAt(this.target);

    this.persistCamera();
  }

  public onResize(): void {
    // no-op; projection handled in scene
  }

  public setTarget(v: THREE.Vector3): void {
    this.target.copy(v);
    this.spherical.setFromVector3(
      this.camera.position.clone().sub(this.target)
    );
    this.idleMs = 0;
  }

  /**
   * Desktop discrete cycling.
   * Touch devices should prefer fluid pinch instead.
   */
  public cycleDistance(next?: DistanceMode): void {
    const modes: DistanceMode[] = ["AT", "NEAR", "FAR"];

    if (next) {
      this.distanceMode = next;
    } else {
      const i = modes.indexOf(this.distanceMode);
      this.distanceMode = modes[(i + 1) % modes.length];
    }

    // Clear any fluid override when cycling
    this.radiusOverride = null;
    this.idleMs = 0;

    this.save.update((s) => {
      s.camera.distanceMode = this.distanceMode;
    });
    this.save.save();

    this.bus.emit("camera:distanceMode", this.distanceMode);
  }

  /**
   * Expands or contracts FAR clamp dynamically.
   * Call this when constellations restore and The Void expands.
   */
  public setFarLimit(newFar: number): void {
    this.farLimit = Math.max(newFar, this.config.camera.distanceModes.NEAR);

    // If we are currently beyond new far, pull in.
    const current = this.spherical.radius;
    if (current > this.farLimit) {
      this.radiusOverride = this.farLimit;
      this.distanceMode = "FAR";
      this.save.update((s) => (s.camera.distanceMode = "FAR"));
      this.save.save();
      this.bus.emit("camera:distanceMode", "FAR");
    }
  }

  public dispose(): void {
    this.unbindEvents();
  }

  // --------------------------------------------------------
  // Input binding
  // --------------------------------------------------------

  private bindEvents(): void {
    this.domElement.style.touchAction = "none";

    this.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
    window.addEventListener("blur", this.onWindowBlur);
    this.domElement.addEventListener("contextmenu", this.onContextMenu);
    this.domElement.addEventListener("wheel", this.onWheel, { passive: false });
    this.domElement.addEventListener("dblclick", this.onDoubleClick);
  }

  private unbindEvents(): void {
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    window.removeEventListener("blur", this.onWindowBlur);
    this.domElement.removeEventListener("contextmenu", this.onContextMenu);
    this.domElement.removeEventListener("wheel", this.onWheel);
    this.domElement.removeEventListener("dblclick", this.onDoubleClick);
  }

  // --------------------------------------------------------
  // Pointer handlers
  // --------------------------------------------------------

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;

    const pr: PointerRec = {
      id: e.pointerId,
      pos: new THREE.Vector2(e.clientX, e.clientY),
      prev: new THREE.Vector2(e.clientX, e.clientY),
      type: e.pointerType,
    };
    this.pointers.set(e.pointerId, pr);

    // Mouse orbit
    if (e.pointerType === "mouse") {
      if (!e.isPrimary || e.button !== 0) return;
      this.isDragging = true;
      this.activePointerId = e.pointerId;
      this.lastPointer.set(e.clientX, e.clientY);
    }

    this.idleMs = 0;

    try {
      this.domElement.setPointerCapture(e.pointerId);
    } catch {}

    // Initialize pinch/pan state when second touch arrives
    if (this.pointers.size === 2) {
      const [a, b] = this.getTwoPointers();
      this.lastPinchDist = a.pos.distanceTo(b.pos);
      this.lastTwoFingerCenter
        .copy(a.pos)
        .add(b.pos)
        .multiplyScalar(0.5);
      this.radiusOverride ??= this.spherical.radius;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled) return;

    const pr = this.pointers.get(e.pointerId);
    if (!pr) return;

    pr.prev.copy(pr.pos);
    pr.pos.set(e.clientX, e.clientY);

    // Mouse orbit
    if (
      e.pointerType === "mouse" &&
      this.isDragging &&
      this.activePointerId === e.pointerId
    ) {
      const dx = pr.pos.x - this.lastPointer.x;
      const dy = pr.pos.y - this.lastPointer.y;
      this.lastPointer.copy(pr.pos);

      this.sphericalDelta.theta -= dx * this.mouseRotateSpeed;
      this.sphericalDelta.phi -= dy * this.mouseRotateSpeed;
      this.idleMs = 0;
      return;
    }

    // Touch only from here
    if (e.pointerType !== "touch") return;

    // One-finger orbit
    if (this.pointers.size === 1) {
      const dx = pr.pos.x - pr.prev.x;
      const dy = pr.pos.y - pr.prev.y;

      this.sphericalDelta.theta -= dx * this.touchRotateSpeed;
      this.sphericalDelta.phi -= dy * this.touchRotateSpeed;
      this.idleMs = 0;
      return;
    }

    // Two-finger pan + pinch (fluid)
    if (this.pointers.size === 2) {
      const [a, b] = this.getTwoPointers();

      // Center movement for pan
      const center = new THREE.Vector2()
        .copy(a.pos)
        .add(b.pos)
        .multiplyScalar(0.5);

      const dCenter = new THREE.Vector2().subVectors(
        center,
        this.lastTwoFingerCenter
      );
      this.lastTwoFingerCenter.copy(center);

      // Pinch distance delta for zoom
      const dist = a.pos.distanceTo(b.pos);
      const dd = dist - this.lastPinchDist;
      this.lastPinchDist = dist;

      // Apply pan, damped if pinch is active
      const panScale = Math.abs(dd) > this.pinchActiveThreshold
        ? this.pinchPanDamping
        : 1.0;
      this.applyPan(dCenter.multiplyScalar(panScale));

      // Continuous radius override
      this.radiusOverride ??= this.spherical.radius;
      this.radiusOverride = this.clampRadius(
        this.radiusOverride - dd * this.pinchZoomSpeed
      );

      this.idleMs = 0;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);

    if (this.activePointerId === e.pointerId) {
      this.isDragging = false;
      this.activePointerId = null;
    }

    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch {}

    // When all touches end, keep radius, only update mode label
    if (this.pointers.size === 0 && this.radiusOverride != null) {
      this.updateDistanceModeFromRadius(this.radiusOverride);
      // keep radiusOverride so the camera stays at exact zoom level
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);

    if (this.activePointerId === e.pointerId) {
      this.isDragging = false;
      this.activePointerId = null;
    }

    if (this.pointers.size === 0 && this.radiusOverride != null) {
      this.updateDistanceModeFromRadius(this.radiusOverride);
    }
  };

  private onWindowBlur = (): void => {
    this.isDragging = false;
    this.activePointerId = null;
    this.pointers.clear();

    if (this.radiusOverride != null) {
      this.updateDistanceModeFromRadius(this.radiusOverride);
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.isDragging = false;
    this.activePointerId = null;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();

    // desktop-only discrete cycling
    const now = performance.now();
    const delta = Math.abs(e.deltaY);
    if (delta < this.wheelThreshold) return;
    if (now - this.lastWheelAt < this.wheelCooldownMs) return;

    this.lastWheelAt = now;
    this.cycleDistance();
  };

  private onDoubleClick = (): void => {
    if (!this.enabled) return;
    this.cycleDistance();
  };

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------

  private getTwoPointers(): [PointerRec, PointerRec] {
    const it = this.pointers.values();
    const a = it.next().value as PointerRec;
    const b = it.next().value as PointerRec;
    return [a, b];
  }

  private applyPan(pixelDelta: THREE.Vector2): void {
    if (pixelDelta.lengthSq() === 0) return;

    const upWorld = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    const right = new THREE.Vector3()
      .copy(forward)
      .cross(upWorld)
      .normalize();

    const camUp = new THREE.Vector3()
      .copy(right)
      .cross(forward)
      .normalize();

    const nearR = this.config.camera.distanceModes.NEAR;
    const scale = this.panSpeed * (this.spherical.radius / nearR);

    this.target
      .add(right.multiplyScalar(-pixelDelta.x * scale))
      .add(camUp.multiplyScalar(pixelDelta.y * scale));

    this.bus.emit("camera:pan", {
      x: this.target.x,
      y: this.target.y,
      z: this.target.z,
    });
  }

  private updateDistanceModeFromRadius(radius: number): void {
    const modes: DistanceMode[] = ["AT", "NEAR", "FAR"];
    let best: DistanceMode = modes[0];
    let bestD = Infinity;

    for (const m of modes) {
      const r = this.config.camera.distanceModes[m];
      const d = Math.abs(r - radius);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }

    this.distanceMode = best;

    this.save.update((s) => {
      s.camera.distanceMode = best;
    });
    this.save.save();

    this.bus.emit("camera:distanceMode", best);
  }

  private clampRadius(r: number): number {
    const minR = this.config.camera.distanceModes.AT;
    const maxR = this.farLimit;
    return THREE.MathUtils.clamp(r, minR, maxR);
  }

  // --------------------------------------------------------
  // Persistence
  // --------------------------------------------------------

  private persistCamera(): void {
    const p = this.camera.position;
    this.save.update((s) => {
      s.camera.position.x = p.x;
      s.camera.position.y = p.y;
      s.camera.position.z = p.z;
      s.camera.distanceMode = this.distanceMode;
    });
  }
}