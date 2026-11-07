import { describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  exportProgress,
  importProgress,
  readProgress,
  writeProgress,
} from "./progressStore";
import { emptyState } from "../domain/progress";
import { CACHE_PREFIX, loadCourse } from "../features/content/contentLoader";

const PROD = "atpl-study:v1";
const PROD_SENTINEL = '{"production":"untouched"}';

describe("preview storage isolation", () => {
  it("uses preview-only namespaces", () => {
    expect(STORAGE_KEY).toBe("atpl-study-preview:v1");
    expect(CACHE_PREFIX.startsWith("atpl-study-preview:")).toBe(true);
  });

  it("never reads or mutates production progress", () => {
    localStorage.clear();
    localStorage.setItem(PROD, PROD_SENTINEL);
    localStorage.setItem("atpl-study:content:v1:x", "prod-cache");
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    const rm = vi.spyOn(Storage.prototype, "removeItem");
    const { state } = readProgress(localStorage);
    expect(state).toEqual(emptyState());
    writeProgress(localStorage, state);
    const touched = [
      ...get.mock.calls,
      ...set.mock.calls,
      ...rm.mock.calls,
    ].map((c) => String(c[0]));
    expect(touched.every((k) => k.startsWith("atpl-study-preview:"))).toBe(
      true,
    );
    expect(localStorage.getItem(PROD)).toBe(PROD_SENTINEL);
    expect(localStorage.getItem("atpl-study:content:v1:x")).toBe("prod-cache");
  });

  it("content cache fallback ignores production cache", async () => {
    localStorage.clear();
    localStorage.setItem("atpl-study:content:v1:/c.json", "prod-cache");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      loadCourse("/c.json", new AbortController().signal),
    ).rejects.toThrow();
    expect(localStorage.getItem("atpl-study:content:v1:/c.json")).toBe(
      "prod-cache",
    );
    vi.unstubAllGlobals();
  });

  it("explicit JSON export/import round-trips", () => {
    const raw = exportProgress(emptyState());
    expect(importProgress(raw)).toEqual(emptyState());
    expect(JSON.parse(raw).appId).toBe("atpl-study");
  });
});
