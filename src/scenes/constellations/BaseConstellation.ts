import * as THREE from "three";
import type { EventBus } from "../../core/EventBus";
import type { Config } from "../../core/Config";
import type { Time } from "../../core/Time";
import type { SaveManager } from "../../core/SaveManager";
import { ResonantPulseChain, type PulseId } from "../../core/ResonantPulseChain";
import type { ConstellationId } from "../../core/ConstellationRegistry";

export interface BaseConstellationDeps {
  renderer: THREE.WebGLRenderer;
  bus: EventBus;
  config: Config;
  time: Time;
  save: SaveManager;
}

export interface MemoryStarSpec {
  id: PulseId;
  position: THREE.Vector3;
  size?: number;
  color?: number;
}

/**
 * Base class for all zodiac constellations.
 * Handles shared camera, drift, star creation, pulse-chain wiring, saving.
 */
export abstract class BaseConstellation {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly bus: EventBus;
  protected readonly config: Config;
  protected readonly time: Time;
  protected readonly save: SaveManager;

  protected abstract readonly id: ConstellationId;
  protected abstract readonly label: string;

  protected memoryStars: Map<PulseId, THREE.Mesh> = new Map();
  protected pulseChain!: ResonantPulseChain;

  // drift
  protected drift = new THREE.Vector3(0.001, 0, 0.0006); // slow, subtle

  // raycasting
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  // state
  protected completed = false;

  constructor({ renderer, bus, config, time, save }: BaseConstellationDeps) {
    this.renderer = renderer;
    this.bus = bus;
    this.config = config;
    this.time = time;
    this.save = save;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000010);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      4000
    );
    this.camera.position.set(0, 0, 10);

    this.bindInput();
  }

  /** Subclass provides star layout + sequence. */
  protected abstract buildMemoryStars(): MemoryStarSpec[];
  protected abstract buildSequence(stars: MemoryStarSpec[]): PulseId[];

  /** Optional hook for subclass on completion. */
  protected onRestored(): void {
    // no-op (override in subclasses later)
  }

  public init(): void {
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(amb);

    const s = this.save.get();
    this.completed = s.progress.constellationsCompleted.includes(this.id);

    const stars = this.buildMemoryStars();
    for (const st of stars) {
      const mesh = this.createStarMesh(st);
      this.memoryStars.set(st.id, mesh);
      this.scene.add(mesh);
    }

    const sequence = this.buildSequence(stars);
    this.pulseChain = new ResonantPulseChain({
      sequence,
      playbackGapMs: 650,
      onPulsePlayback: (id) => this.playbackPulse(id),
      onProgress: (i, total) =>
        this.bus.emit("constellation:progress", { id: this.id, i, total }),
      onFail: (failIndex) =>
        this.bus.emit("constellation:fail", { id: this.id, failIndex }),
      onComplete: () => this.handleComplete(),
    });

    if (!this.completed) {
      void this.pulseChain.playTeach();
    }

    this.bus.emit("scene:ready", { id: this.id, label: this.label });
  }

  public update(dt: number): void {
    this.scene.position.addScaledVector(this.drift, dt * 60);

    for (const mesh of this.memoryStars.values()) {
      mesh.rotation.z += dt * 0.2;
    }
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    for (const mesh of this.memoryStars.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.scene.remove(mesh);
    }
    this.memoryStars.clear();
    this.unbindInput();
    this.bus.emit("scene:dispose", { id: this.id });
  }

  // ----------------------------------------------------------
  // Star mesh helpers
  // ----------------------------------------------------------

  protected createStarMesh(spec: MemoryStarSpec): THREE.Mesh {
    const size = spec.size ?? 0.45;
    const color = spec.color ?? 0xffffff;

    const geom = new THREE.SphereGeometry(size, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(spec.position);
    mesh.userData.__pulseId = spec.id;
    return mesh;
  }

  // ----------------------------------------------------------
  // Pulse playback (size pulse)
  // ----------------------------------------------------------

  protected playbackPulse(id: PulseId): void {
    const star = this.memoryStars.get(id);
    if (!star) return;

    const base = star.scale.clone();
    star.scale.setScalar(1.45);

    setTimeout(() => {
      star.scale.copy(base);
    }, 220);
  }

  // ----------------------------------------------------------
  // Completion
  // ----------------------------------------------------------

  protected handleComplete(): void {
    if (this.completed) return;
    this.completed = true;

    this.save.update((sv) => {
      if (!sv.progress.constellationsCompleted.includes(this.id)) {
        sv.progress.constellationsCompleted.push(this.id);
      }
    });
    this.save.save();

    this.bus.emit("constellation:complete", { id: this.id });
    this.onRestored();
  }

  // ----------------------------------------------------------
  // Input (click/tap on stars)
  // ----------------------------------------------------------

  private bindInput(): void {
    this.renderer.domElement.addEventListener(
      "pointerdown",
      this.onPointerDown
    );
  }

  private unbindInput(): void {
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.onPointerDown
    );
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.completed) return;
    if (this.pulseChain?.playbackActive) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(
      [...this.memoryStars.values()],
      false
    );
    if (!hits.length) return;

    const hit = hits[0].object as THREE.Mesh;
    const pid = hit.userData.__pulseId as PulseId | undefined;
    if (!pid) return;

    this.playbackPulse(pid);
    this.pulseChain.acceptInput(pid);
  };
}
