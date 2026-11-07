import { describe, it, expect } from "vitest";
import {
  readProgress,
  writeProgress,
  importProgress,
  exportProgress,
  STORAGE_KEY,
} from "./progressStore";
import { emptyState, ensureModule } from "../domain/progress";
import { recordAttempt } from "../domain/reviewEngine";
describe("v1 progress compatibility", () => {
  it("uses unchanged key and reads missing data as empty", () => {
    expect(STORAGE_KEY).toBe("atpl-study-preview:v1");
    expect(
      readProgress({ getItem: () => null, setItem: () => {} }).state,
    ).toEqual(emptyState());
  });
  it("roundtrips a legacy shaped export including other modules", () => {
    const state = emptyState();
    recordAttempt(state, "010", "010-icao-01", true, 1000, "path");
    ensureModule(state, "050");
    expect(importProgress(exportProgress(state))).toEqual(state);
  });
  it("preserves additive fields for forward-compatible exports", () => {
    const state = { ...emptyState(), future: "keep" };
    expect(importProgress(JSON.stringify(state)).future).toBe("keep");
  });
  it.each([
    { ...emptyState(), appId: "other" },
    { ...emptyState(), schemaVersion: 2 },
    { ...emptyState(), modules: { "010": { itemState: [] } } },
    null,
  ])("rejects malformed import", (bad) =>
    expect(() => importProgress(JSON.stringify(bad))).toThrow(),
  );
  it("rejects malformed nested values", () => {
    const state = emptyState();
    recordAttempt(state, "010", "x", true, 1000, "path");
    state.modules["010"].itemState.x.attempts = -1;
    expect(() => importProgress(JSON.stringify(state))).toThrow();
  });
  it("reports failed writes instead of hiding them", () => {
    expect(
      writeProgress(
        {
          getItem: () => null,
          setItem: () => {
            throw Error("quota");
          },
        },
        emptyState(),
      ),
    ).toMatch(/could not be saved/);
  });
  it("does not overwrite corrupted stored data", () => {
    let writes = 0;
    const result = readProgress({
      getItem: () => "{broken",
      setItem: () => {
        writes++;
      },
    });
    expect(result.warning).toBeTruthy();
    expect(writes).toBe(0);
  });
});
