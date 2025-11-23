export interface SaveSchemaV1 {
  version: 1;

  user: {
    arrivalDate: string | null;         // MM-DD
    alignment: "peace" | "purpose" | null;
  };

  progress: {
    guidedComplete: boolean;
    constellationsCompleted: string[];  // e.g. ["aries", "leo"]
    tracksUnlocked: string[];
  };

  camera: {
    position: { x: number; y: number; z: number };
    distanceMode: "AT" | "NEAR" | "FAR";
  };

  vibe: {
    enabled: boolean;
    preset: string | null;
    starTint: string | null;
    ambientLight: number;
    fogTone: string | null;
    particlePreset: string | null;
    density: number;
    allowConstellationOverride: boolean;
  };
}

// Active schema type
export type SaveSchema = SaveSchemaV1;

// ------------------------------------------------------------
// Default save factory
// ------------------------------------------------------------
export function createDefaultSave(): SaveSchemaV1 {
  return {
    version: 1,

    user: {
      arrivalDate: null,
      alignment: null,
    },

    progress: {
      guidedComplete: false,
      constellationsCompleted: [],
      tracksUnlocked: [],
    },

    camera: {
      position: { x: 0, y: 0, z: 5 },
      distanceMode: "NEAR",
    },

    vibe: {
      enabled: false,
      preset: null,
      starTint: null,
      ambientLight: 1.0,
      fogTone: null,
      particlePreset: null,
      density: 1.0,
      allowConstellationOverride: false,
    },
  };
}