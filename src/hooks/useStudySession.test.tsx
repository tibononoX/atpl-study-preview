import { afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useStudySession } from "./useStudySession";
import { emptyState, type Progress } from "../domain/progress";
import { mcq, scenario } from "../test/fixtures";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("session lifecycle and active timing", () => {
  it("records each answer once, then finishes only once", () => {
    const state = emptyState();
    const update = (fn: (s: Progress) => void) => fn(state);
    const { result } = renderHook(() => useStudySession("010", update));
    act(() => result.current.begin("path", [mcq]));
    act(() => {
      result.current.answer(true);
      result.current.answer(true);
    });
    expect(state.modules["010"].itemState[mcq.id].attempts).toBe(1);
    expect(state.modules["010"].sessions[0].results).toHaveLength(1);
    act(() => result.current.next());
    expect(result.current.session).toBeNull();
    expect(state.modules["010"].sessions[0].endedAt).not.toBeNull();
  });
  it("tracks visible-tab seconds, pauses hidden tab, persists interruption", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const state = emptyState();
    const update = (fn: (s: Progress) => void) => fn(state);
    const { result } = renderHook(() => useStudySession("010", update));
    act(() => result.current.begin("path", [mcq, scenario]));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.elapsed).toBe(5000);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.elapsed).toBe(5000);
    act(() => result.current.finish());
    expect(state.modules["010"].activeMs).toBe(5000);
    act(() => result.current.finish());
    expect(state.modules["010"].activeMs).toBe(5000);
  });
  it("next question does not restart session time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const state = emptyState();
    const update = (fn: (s: Progress) => void) => fn(state);
    const { result } = renderHook(() => useStudySession("010", update));
    act(() => result.current.begin("path", [mcq, scenario]));
    act(() => vi.advanceTimersByTime(2000));
    act(() => {
      result.current.answer(true);
      result.current.next();
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.elapsed).toBe(5000);
    act(() => result.current.finish());
    expect(state.modules["010"].activeMs).toBe(5000);
  });
});
