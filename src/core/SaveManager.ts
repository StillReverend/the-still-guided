import type { SaveSchema } from "./SaveSchema";
import { createDefaultSave } from "./SaveSchema";

export class SaveManager {
  private static STORAGE_KEY = "the_still_save_v1";

  private data: SaveSchema;
  private autosaveInterval: number | null = null;

  constructor() {
    this.data = this.safeLoad();
  }

  // --------------------------------------------------------
  // Load + corruption fallback
  // --------------------------------------------------------
  private safeLoad(): SaveSchema {
    try {
      const raw = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (!raw) return createDefaultSave();

      const parsed = JSON.parse(raw);

      // Future versioning checks would go here.
      if (!parsed.version) throw new Error("Invalid save schema");

      return parsed as SaveSchema;
    } catch (err) {
      console.warn("[SaveManager] Corrupt save detected. Resetting.");
      return createDefaultSave();
    }
  }

  // --------------------------------------------------------
  // Public API
  // --------------------------------------------------------

  public get(): SaveSchema {
    return this.data;
  }

  public update(mutator: (draft: SaveSchema) => void): void {
    mutator(this.data);
  }

  public save(): void {
    try {
      localStorage.setItem(
        SaveManager.STORAGE_KEY,
        JSON.stringify(this.data)
      );
    } catch (err) {
      console.error("[SaveManager] Failed to save:", err);
    }
  }

  // --------------------------------------------------------
  // Autosave
  // --------------------------------------------------------

  public enableAutosave(intervalMs = 20000): void {
    if (this.autosaveInterval) return;
    this.autosaveInterval = window.setInterval(() => this.save(), intervalMs);
  }

  public disableAutosave(): void {
    if (!this.autosaveInterval) return;
    clearInterval(this.autosaveInterval);
    this.autosaveInterval = null;
  }

  // --------------------------------------------------------
  // Dev Helpers
  // --------------------------------------------------------

  public export(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public import(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.version) throw new Error("Invalid save file");
      this.data = parsed;
      this.save();
    } catch (err) {
      console.error("[SaveManager] Import failed:", err);
    }
  }
}