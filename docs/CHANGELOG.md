# THE STILL — Development Changelog

This changelog tracks phase-level progress for THE STILL Guided Experience.
Dates are optional; phases are canonical.

---

## Phase 0 — Project Setup (Complete)
- Fresh Vite project created (TypeScript).
- Installed core deps: three, supabase-js, zustand, vite-plugin-pwa.
- Git initialized, GitHub remote connected via SSH, main branch synced.

Deliverable: working repo + dev server booting cleanly.

---

## Phase 1 — Engine Spine / Scene Manager (Complete)
- Entry.ts bootstraps renderer, camera, resize, clock, and update loop.
- SceneManager.ts supports modular scene loading/unloading.
- EventBus.ts added for global decoupled events.
- Config.ts established as central tuning hub.
- StillnessScene added as initial environment.

Deliverable: app boots into StillnessScene with stable runtime loop.

---

## Phase 2 — Save System v0 (Local Only) (Complete)
- SaveSchema.ts created with versioning.
- SaveManager.ts created with autosave + localStorage.
- Dev export access verified.
- Arrival date auto-stored (MM-DD).
- Camera + vibe fields included in schema for future phases.

Deliverable: persistence survives refresh and exports cleanly.

---

## Phase 3 — Camera System v1 (Complete, with one intentional deferral)
- Orbit camera around a target with spherical coordinates.
- Standardized AT / NEAR / FAR distance modes.
- Auto-rotate after idle delay.
- Camera state persisted to save.

Deferred by design:
- Fly-to easing/acceleration will be implemented later when real POIs exist.

Deliverable: stable orbit navigation feel with saved distances.

---

## Phase 4A — Control System v1 (Touch + Mouse) (Complete)
- Touch:
  - 1-finger orbit
  - 2-finger pan
  - Pinch zoom (fluid + clamped AT↔FAR)
- Mouse:
  - click-drag orbit
  - wheel distance cycling
- Separate tuning for touch vs mouse speed confirmed.
- Double-tap distance cycling removed to reserve taps for interaction.
- Android pinch strength tuned for real devices.
- Camera polish committed in Phase 6.1/6.2 micro-tags.

Deliverable: full mobile-first navigation ready for gameplay.

Deferred by design:
- Phase 4B (keyboard + snap-to) postponed until POIs exist.

---

## Phase 5 — Starfield System v1 (Next)
Pending implementation:
- FAR sphere (~20k stars)
- BAND stars (~3k stars)
- NEAR stars (~10k stars)
- slow drift + flicker
- occlusion zone

Deliverable: galaxy backdrop.

---
