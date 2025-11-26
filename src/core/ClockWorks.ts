// ============================================================
// THE STILL — ClockWorks (H/M/S Clock Rings, Marker Style)
// ------------------------------------------------------------
// Responsibilities:
//  - Create and manage the 3 CLOCK RINGS (Hours, Minutes, Seconds)
//  - Each ring has:
//      * A dim full ring as background
//      * A small bright "marker" arc at the current time position
//  - 12 o'clock at the top, markers move CLOCKWISE
//  - Rings are oriented like the legacy accretion ring:
//      * group.rotation.x = Math.PI / 2
//  - No billboarding; orientation is driven by the parent (CoreSystem)
// ============================================================

import * as THREE from "three";

export interface ClockWorksConfig {
  coreRadius: number;              // Radius of the black hole / core

  // Spacing + thickness for CLOCK rings
  baseGap: number;                 // Gap between core edge and H ring
  hourRingThickness: number;       // Thickness of H ring
  minuteRingThickness: number;     // Thickness of M ring
  secondRingThickness: number;     // Thickness of S ring
  gapHM: number;                   // Gap between H and M rings
  gapMS: number;                   // Gap between M and S rings

  ringSegments: number;            // Segments around the circle

  // Colors
  colorHour: THREE.ColorRepresentation;
  colorMinute: THREE.ColorRepresentation;
  colorSecond: THREE.ColorRepresentation;

  // Opacity
  baseOpacity: number;             // Opacity for the base outline rings
  fillOpacity: number;             // Opacity for the marker arcs

  // Marker appearance
  markerArcAngle: number;          // Angular size of marker in radians
}

interface ClockRingMeshes {
  baseMesh: THREE.Mesh;            // Full ring, dim outline
  fillMesh: THREE.Mesh;            // Short arc marker showing the current time
}

export class ClockWorks {
  public group: THREE.Group;

  private config: ClockWorksConfig;

  private hourRing: ClockRingMeshes;
  private minuteRing: ClockRingMeshes;
  private secondRing: ClockRingMeshes;

  // Track last time values so we only rebuild geometry when needed
  private lastHourFraction = -1;
  private lastMinuteFraction = -1;
  private lastSecondFraction = -1;

  constructor(
    scene: THREE.Scene,
    configOverrides: Partial<ClockWorksConfig> = {}
  ) {
    // Default configuration (thicker rings + marker style)
    const defaultConfig: ClockWorksConfig = {
      coreRadius: 3.0,

      baseGap: 3.0,
      hourRingThickness: 4.0,
      minuteRingThickness: 2.0,
      secondRingThickness: 1.0,
      gapHM: 1.5,
      gapMS: 3.0,

      ringSegments: 128,

      colorHour: 0xd4af37,      // warm gold
      colorMinute: 0xd4af37,    // gold
      colorSecond: 0xd4af37,    // gold

      baseOpacity: 0.03,
      fillOpacity: 1.0,

      // Marker arc size: ~6 degrees
      markerArcAngle: (Math.PI / 180) * 2,
    };

    this.config = { ...defaultConfig, ...configOverrides };

    this.group = new THREE.Group();
    this.group.name = "ClockWorks";

    // Match the legacy accretion ring orientation:
    // RingGeometry is XY-plane by default; rotate X by PI/2 to put in XZ.
    this.group.rotation.x = Math.PI / 2;

    scene.add(this.group);

    this.hourRing = this.createClockRingMeshes("H");
    this.minuteRing = this.createClockRingMeshes("M");
    this.secondRing = this.createClockRingMeshes("S");

    this.updateTime(true); // Initialize to current time
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  /**
   * Call every frame from your main update loop.
   * (deltaSeconds is currently unused, but included for future effects.)
   */
  public update(_deltaSeconds: number): void {
    this.updateTime(false);
  }

  /**
   * Optional disposal if the host ever wants to remove the clock.
   */
  public dispose(scene: THREE.Scene): void {
    scene.remove(this.group);

    const disposeMesh = (mesh: THREE.Mesh | undefined) => {
      if (!mesh) return;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    };

    disposeMesh(this.hourRing?.baseMesh);
    disposeMesh(this.hourRing?.fillMesh);
    disposeMesh(this.minuteRing?.baseMesh);
    disposeMesh(this.minuteRing?.fillMesh);
    disposeMesh(this.secondRing?.baseMesh);
    disposeMesh(this.secondRing?.fillMesh);
  }

  // ----------------------------------------------------------
  // CLOCK RINGS CREATION
  // ----------------------------------------------------------

  private createClockRingMeshes(which: "H" | "M" | "S"): ClockRingMeshes {
    const {
      coreRadius,
      baseGap,
      hourRingThickness,
      minuteRingThickness,
      secondRingThickness,
      gapHM,
      gapMS,
      ringSegments,
      colorHour,
      colorMinute,
      colorSecond,
      baseOpacity,
      fillOpacity,
      markerArcAngle,
    } = this.config;

    let innerRadius: number;
    let outerRadius: number;
    let color: THREE.ColorRepresentation;

    if (which === "H") {
      innerRadius = coreRadius + baseGap;
      outerRadius = innerRadius + hourRingThickness;
      color = colorHour;
    } else if (which === "M") {
      const hourOuter = coreRadius + baseGap + hourRingThickness;
      innerRadius = hourOuter + gapHM;
      outerRadius = innerRadius + minuteRingThickness;
      color = colorMinute;
    } else {
      const hourOuter = coreRadius + baseGap + hourRingThickness;
      const minuteOuter = hourOuter + gapHM + minuteRingThickness;
      innerRadius = minuteOuter + gapMS;
      outerRadius = innerRadius + secondRingThickness;
      color = colorSecond;
    }

    // Base full ring (dim, always visible)
    const baseGeom = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      ringSegments,
      1,
      0,
      Math.PI * 2
    );

    const baseMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
    });

    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    this.group.add(baseMesh);

    // Initial marker arc (will be rebuilt each time updateTime runs)
    // Start at 12 o'clock for initialization.
    const thetaCenter = Math.PI / 2;
    const thetaStart = thetaCenter - markerArcAngle * 0.5;

    const fillGeom = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      ringSegments,
      1,
      thetaStart,
      markerArcAngle
    );

    const fillMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: fillOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const fillMesh = new THREE.Mesh(fillGeom, fillMat);
    this.group.add(fillMesh);

    return { baseMesh, fillMesh };
  }

  // ----------------------------------------------------------
  // TIME UPDATES
  // ----------------------------------------------------------

  private updateTime(forceUpdate: boolean): void {
    const now = new Date();

    const seconds =
      now.getSeconds() + now.getMilliseconds() / 1000.0; // 0..60
    const minutes = now.getMinutes() + seconds / 60.0;   // 0..60
    const hours =
      (now.getHours() % 12) + minutes / 60.0;            // 0..12

    const secondFraction = seconds / 60.0;               // 0..1
    const minuteFraction = minutes / 60.0;               // 0..1
    const hourFraction = hours / 12.0;                   // 0..1

    const epsilon = 0.0001;

    if (forceUpdate || Math.abs(hourFraction - this.lastHourFraction) > epsilon) {
      this.lastHourFraction = hourFraction;
      this.updateClockRingMarker(this.hourRing, hourFraction);
    }

    if (forceUpdate || Math.abs(minuteFraction - this.lastMinuteFraction) > epsilon) {
      this.lastMinuteFraction = minuteFraction;
      this.updateClockRingMarker(this.minuteRing, minuteFraction);
    }

    if (forceUpdate || Math.abs(secondFraction - this.lastSecondFraction) > epsilon) {
      this.lastSecondFraction = secondFraction;
      this.updateClockRingMarker(this.secondRing, secondFraction);
    }
  }

  /**
   * Rebuild the marker arc geometry to represent the time position.
   *
   *  - fraction: 0..1 (0 = 12 o'clock, 0.25 = 3, 0.5 = 6, 0.75 = 9)
   *  - We compute a center angle that moves CLOCKWISE from 12 o'clock:
   *        thetaCenter = 12o'clock - fraction * 2π
   *  - Then we build a short arc (markerArcAngle) centered on that angle.
   */
  private updateClockRingMarker(
    ring: ClockRingMeshes,
    fraction: number
  ): void {
    const { ringSegments, markerArcAngle } = this.config;

    const oldGeom = ring.fillMesh.geometry as THREE.RingGeometry;
    const parameters = oldGeom.parameters;

    // Keep same radii as the base ring
    const innerRadius = parameters.innerRadius;
    const outerRadius = parameters.outerRadius;

    // 12 o'clock is at the top (Math.PI / 2).
    // CLOCKWISE sweep → subtract fraction * 2π.
    const thetaCenter = Math.PI / 2 - fraction * Math.PI * 2;

    const thetaStart = thetaCenter - markerArcAngle * 0.5;
    const thetaLength = markerArcAngle; // small positive arc

    const newGeom = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      ringSegments,
      1,
      thetaStart,
      thetaLength
    );

    ring.fillMesh.geometry.dispose();
    ring.fillMesh.geometry = newGeom;
  }
}
