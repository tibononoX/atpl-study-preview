import { emptyState, progressSchema, type Progress } from "../domain/progress";
export const STORAGE_KEY = "atpl-study-preview:v1";
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function importProgress(raw: string): Progress {
  const parsed: unknown = JSON.parse(raw);
  return progressSchema.parse(parsed);
}
export function readProgress(storage: KeyValueStore): {
  state: Progress;
  warning: string | null;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? importProgress(raw) : emptyState(), warning: null };
  } catch {
    return {
      state: emptyState(),
      warning:
        "Saved progress could not be read. The original data has not been overwritten. Export or repair it before saving new progress.",
    };
  }
}
export function writeProgress(
  storage: KeyValueStore,
  state: Progress,
): string | null {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "Progress could not be saved. Your in-memory progress may be lost; export a backup.";
  }
}
export const exportProgress = (state: Progress) =>
  JSON.stringify(state, null, 2);
