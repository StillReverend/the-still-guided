export type DistanceMode = "AT" | "NEAR" | "FAR";

export interface Config {
  app: {
    bgColor: number;
    pixelRatioMax: number;
  };
  camera: {
    distanceModes: Record<DistanceMode, number>;
    autoRotateDelayMs: number;// New: canonical poses
    startPosition: { x: number; y: number; z: number };
    startTarget: { x: number; y: number; z: number };
    clockFacePosition: { x: number; y: number; z: number };
    clockFaceTarget: { x: number; y: number; z: number };
  };
  stars: {
    bandCount: number;
    nearCount: number;
    farCount: number;
  };
  starfield: {
    farCount: number;
    bandCount: number;
    nearCount: number;

    farRadius: number;
    nearRadius: number;

    bandInnerRadius: number;
    bandOuterRadius: number;
    bandThickness: number;

    occlusionRadius: number;

    driftSpeedFar: number;
    driftSpeedBand: number;
    driftSpeedNear: number;
    flickerSpeed: number;
    flickerAmount: number;
  };

  // Core (black hole) tuning
  core: {
    baseRadius: number;      // black hole sphere radius
    minRadius: number;       // reserved for future if we tweak geom

    ringInnerRadius: number;
    ringOuterRadius: number;
    auraRadius: number;

    rotationSpeed: number;   // rad/sec
    tiltX: number;
    tiltZ: number;

    minScale: number;        // lowest scale when shrinkLevel = 12
  };

  debug: {
    enabled: boolean;
  };
}

export function createDefaultConfig(): Config {
  return {
    app: {
      bgColor: 0x000000,
      pixelRatioMax: 2,
    },
    camera: {
      distanceModes: {
        AT: 100,
        NEAR: 200,
        FAR: 300,
      },
      autoRotateDelayMs: 120000,
      // New: canonical poses

      // Where you eventually want to start the experience.
      // For now, let's keep your original Z-based start:
      startPosition: { x: 0, y: 0, z: 200 },
      startTarget:   { x: 0, y: 0, z: 0 },

      // Where the clock reads CLEAN and “front-facing”.
      // This is your canonical Clock Face / Mosaic axis.
      clockFacePosition: { x: 0, y: -200, z: 0 },
      clockFaceTarget:   { x: 0, y: 0, z: 0 },
    },
    starfield: {
      farCount: 777,
      bandCount: 3000,
      nearCount: 1000,

      farRadius: 900,
      nearRadius: 220,

      bandInnerRadius: 140,
      bandOuterRadius: 380,
      bandThickness: 120,

      occlusionRadius: 60,

      driftSpeedFar: 0.0031,
      driftSpeedBand: 0.0010,
      driftSpeedNear: 0.0031,
      flickerSpeed: 0.079,
      flickerAmount: 0.10,
    },

    // Core defaults (with your 10 / 31 / 79 signature sprinkled in)
    core: {
      baseRadius: 31,
      minRadius: 10,

      ringInnerRadius: 35,
      ringOuterRadius: 79,
      auraRadius: 90,

      rotationSpeed: 0.031,  // rad/sec
      tiltX: 0.31,
      tiltZ: 0.10,

      minScale: 0.31,
    },

    debug: {
      enabled: true,
    },
  };
}
