export type DistanceMode = "AT" | "NEAR" | "FAR";

export interface Config {
  app: {
    bgColor: number;
    pixelRatioMax: number;
  };
  camera: {
    distanceModes: Record<DistanceMode, number>;
    autoRotateDelayMs: number;
  };

  // Legacy/simple counts (kept so earlier phases don’t break)
  stars: {
    bandCount: number;
    nearCount: number;
    farCount: number;
  };

  // Phase 5+ starfield tuning (new)
  starfield: {
    // Counts (tunable)
    farCount: number;
    bandCount: number;
    nearCount: number;

    // Radii / volumes
    farRadius: number;      // outer shell radius for far sphere
    nearRadius: number;     // max radius for near volume

    // Band = thick disk / annulus
    bandInnerRadius: number;
    bandOuterRadius: number;
    bandThickness: number;

    // Occlusion zone (no stars close to core)
    occlusionRadius: number;

    // Motion / polish tuning
    driftSpeedFar: number;
    driftSpeedBand: number;
    driftSpeedNear: number;
    flickerSpeed: number;
    flickerAmount: number;
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
        AT: 10,
        NEAR: 31,
        FAR: 79,
      },
      autoRotateDelayMs: 12000,
    },

    // Phase 5 starfield defaults
    starfield: {
      farCount: 666,
      bandCount: 1994,
      nearCount: 420,

      farRadius: 900,
      nearRadius: 220,

      bandInnerRadius: 140,
      bandOuterRadius: 380,
      bandThickness: 120,

      occlusionRadius: 60,

      // signature-friendly tuning (safe to tweak later)
      driftSpeedFar: 0.0031,
      driftSpeedBand: 0.0010,
      driftSpeedNear: 0.0031,
      flickerSpeed: 0.079,
      flickerAmount: 0.10,
    },

    debug: {
      enabled: true,
    },
  };
}
