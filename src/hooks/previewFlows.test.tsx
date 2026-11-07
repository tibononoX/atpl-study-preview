import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useProgress } from "./useProgress";
import { course, mcq } from "../test/fixtures";
import { recordAttempt } from "../domain/reviewEngine";
import { emptyModule } from "../domain/progress";
import { STORAGE_KEY, exportProgress } from "../storage/progressStore";

const PROD = {
  "atpl-study:v1": '{"production":"progress"}',
  "atpl-study:content:v1:/atpl-study/content/010-air-law.json": "prod-cache",
};
let spies: ReturnType<typeof vi.spyOn>[] = [];
const touchedKeys = () =>
  spies.flatMap((s) => s.mock.calls.map((c: unknown[]) => String(c[0])));
const assertProdUntouched = () => {
  const keys = touchedKeys();
  spies.forEach((s) => s.mockRestore());
  expect(keys.every((k) => k.startsWith("atpl-study-preview:"))).toBe(true);
  for (const [k, v] of Object.entries(PROD))
    expect(localStorage.getItem(k)).toBe(v);
};

beforeEach(() => {
  localStorage.clear();
  for (const [k, v] of Object.entries(PROD)) localStorage.setItem(k, v);
  spies = [
    vi.spyOn(Storage.prototype, "getItem"),
    vi.spyOn(Storage.prototype, "setItem"),
    vi.spyOn(Storage.prototype, "removeItem"),
    vi.spyOn(Storage.prototype, "clear"),
  ];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("preview app flows never touch production storage", () => {
  it("load + answer writes only the preview key", () => {
    const { result } = renderHook(() => useProgress(course));
    act(() =>
      result.current.update((d) =>
        recordAttempt(d, course.moduleId, mcq.id, true, 1000, "review"),
      ),
    );
    assertProdUntouched();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.modules[course.moduleId].itemState[mcq.id].attempts).toBe(1);
  });

  it("explicit import persists to preview key only", () => {
    const { result } = renderHook(() => useProgress(course));
    act(() =>
      result.current.update((d) =>
        recordAttempt(d, course.moduleId, mcq.id, false, 2000, "review"),
      ),
    );
    const file = exportProgress(result.current.state);
    localStorage.removeItem(STORAGE_KEY);
    spies.forEach((s) => s.mockClear());
    act(() => result.current.restore(file));
    assertProdUntouched();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).modules[course.moduleId]
        .itemState[mcq.id].attempts,
    ).toBe(1);
  });

  it("module reset (as wired in App) affects preview key only", () => {
    const { result } = renderHook(() => useProgress(course));
    act(() =>
      result.current.update((d) =>
        recordAttempt(d, course.moduleId, mcq.id, true, 3000, "review"),
      ),
    );
    act(() =>
      result.current.update((d) => {
        d.modules[course.moduleId] = emptyModule();
      }),
    );
    assertProdUntouched();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).modules[course.moduleId]
        .itemState[mcq.id],
    ).toBeUndefined();
  });
});
