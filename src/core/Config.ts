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
  stars: {
    bandCount: number;
    nearCount: number;
    farCount: number;
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
        AT: 1,
        NEAR: 8,
        FAR: 50,
      },
      autoRotateDelayMs: 12000,
    },
    stars: {
      bandCount: 3000,
      nearCount: 10000,
      farCount: 20000,
    },
    debug: {
      enabled: true,
    },
  };
}