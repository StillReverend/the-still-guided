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

  private isDragging = false;
  private activePointerId: number | null = null;
  private lastPointer = new THREE.Vector2();

  private idleMs = 0;
  private readonly autoRotateDelayMs: number;
  private readonly autoRotateSpeed = 0.12; // rad/sec

  private readonly rotateSpeed = 0.005; // per pixel
  private readonly damping = 0.08;

  // Trackpad / wheel debounce so two-finger scroll doesn't spam distance changes
  private lastWheelAt = 0;
  private readonly wheelCooldownMs = 250;
  private readonly wheelThreshold = 4; // ignore tiny deltas

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

    this.bindEvents();
  }

  public init(): void {
    // no-op for now
  }

  public update(dt: number): void {
    if (!this.enabled) return;

    // Apply deltas
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Clamp phi to avoid flipping at poles
    const EPS = 1e-4;
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      EPS,
      Math.PI - EPS
    );

    // Smoothly damp deltas to zero
    this.sphericalDelta.theta *= 1 - this.damping;
    this.sphericalDelta.phi *= 1 - this.damping;

    // Idle auto-rotate
    if (!this.isDragging) {
      this.idleMs += dt * 1000;
      if (this.idleMs > this.autoRotateDelayMs) {
        this.spherical.theta += this.autoRotateSpeed * dt;
      }
    }

    // Enforce distance mode radius each frame
    this.spherical.radius = this.config.camera.distanceModes[this.distanceMode];

    // Convert to cartesian and apply
    const newPos = new THREE.Vector3()
      .setFromSpherical(this.spherical)
      .add(this.target);
    this.camera.position.copy(newPos);
    this.camera.lookAt(this.target);

    this.persistCamera();
  }

  public onResize(): void {
    // no-op; StillnessScene updates projection
  }

  public setTarget(v: THREE.Vector3): void {
    this.target.copy(v);
    this.spherical.setFromVector3(
      this.camera.position.clone().sub(this.target)
    );
    this.idleMs = 0;
  }

  public cycleDistance(next?: DistanceMode): void {
    const modes: DistanceMode[] = ["AT", "NEAR", "FAR"];
    if (next) {
      this.distanceMode = next;
    } else {
      const i = modes.indexOf(this.distanceMode);
      this.distanceMode = modes[(i + 1) % modes.length];
    }

    this.idleMs = 0;
    this.save.update((s) => {
      s.camera.distanceMode = this.distanceMode;
    });
    this.save.save();
    this.bus.emit("camera:distanceMode", this.distanceMode);
  }

  public dispose(): void {
    this.unbindEvents();
  }

  // --------------------------------------------------------
  // Input Binding (mouse only for Phase 3)
  // Touch will come in Phase 4.
  // --------------------------------------------------------

  private bindEvents(): void {
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

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;

    // Only react to primary left-button drags
    if (!e.isPrimary || e.button !== 0) return;

    this.isDragging = true;
    this.activePointerId = e.pointerId;
    this.lastPointer.set(e.clientX, e.clientY);
    this.idleMs = 0;

    try {
      this.domElement.setPointerCapture(e.pointerId);
    } catch {
      // ignore capture failures
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.isDragging) return;
    if (this.activePointerId !== e.pointerId) return;

    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer.set(e.clientX, e.clientY);

    this.sphericalDelta.theta -= dx * this.rotateSpeed;
    this.sphericalDelta.phi -= dy * this.rotateSpeed;
    this.idleMs = 0;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    this.isDragging = false;
    this.activePointerId = null;

    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch {}
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    this.isDragging = false;
    this.activePointerId = null;
  };

  private onWindowBlur = (): void => {
    this.isDragging = false;
    this.activePointerId = null;
  };

  private onContextMenu = (e: MouseEvent): void => {
    // prevent right-click from leaving us stuck in dragging
    e.preventDefault();
    this.isDragging = false;
    this.activePointerId = null;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();

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
    // Autosave flushes on interval.
  }
}