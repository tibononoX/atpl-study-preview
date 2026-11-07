import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useProgress } from "./useProgress";
import { course } from "../test/fixtures";
import { STORAGE_KEY } from "../storage/progressStore";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("safe local progress hook", () => {
  it("does not overwrite corrupted storage while allowing in-memory use", () => {
    localStorage.setItem(STORAGE_KEY, "broken");
    const { result } = renderHook(() => useProgress(course));
    act(() =>
      result.current.update((s) => {
        s.meta.updatedAt = 100;
      }),
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe("broken");
    expect(result.current.warning).toBeTruthy();
    expect(result.current.state.meta.updatedAt).toBe(100);
  });
  it("rejects bad imports without replacing state", () => {
    const { result } = renderHook(() => useProgress(course));
    act(() =>
      result.current.update((s) => {
        s.meta.updatedAt = 100;
      }),
    );
    expect(() => result.current.restore("{broken")).toThrow();
    expect(result.current.state.meta.updatedAt).toBe(100);
  });
});
