import * as THREE from "three";
import { BaseConstellation, type MemoryStarSpec } from "./BaseConstellation";
import type { PulseId } from "../../core/ResonantPulseChain";
import type { ConstellationId } from "../../core/ConstellationRegistry";

export class Constellation_Test extends BaseConstellation {
protected readonly id: ConstellationId = "aries"; // arbitrary for test
protected readonly label = "Constellation Test (Aries)";

protected buildMemoryStars(): MemoryStarSpec[] {
return [
{ id: "s1", position: new THREE.Vector3(-2, 1, 0), size: 0.45 },
{ id: "s2", position: new THREE.Vector3(-0.8, 0.2, 0), size: 0.50 },
{ id: "s3", position: new THREE.Vector3(0.4, -0.6, 0), size: 0.42 },
{ id: "s4", position: new THREE.Vector3(1.7, 0.4, 0), size: 0.55 },
{ id: "s5", position: new THREE.Vector3(2.6, -1.2, 0), size: 0.48 },
{ id: "s6", position: new THREE.Vector3(0.9, 1.4, 0), size: 0.40 },
];
}

protected buildSequence(stars: MemoryStarSpec[]): PulseId[] {
// simple 3-step test sequence
return ["s1", "s4", "s2"];
}

protected onRestored(): void {
// placeholder: brighten all stars on completion
for (const mesh of this.memoryStars.values()) {
const mat = mesh.material as THREE.MeshStandardMaterial;
mat.emissive.setHex(0x3344ff);
mat.emissiveIntensity = 0.6;
mat.needsUpdate = true;
}
}
}