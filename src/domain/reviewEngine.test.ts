import { describe, it, expect } from "vitest";
import { emptyState, emptyModule, ensureModule } from "./progress";
import {
  recordAttempt,
  DAY,
  MAINTENANCE,
  grade,
  reconcileContent,
  buildPath,
  dueItems,
  missedItems,
  startSession,
  endSession,
} from "./reviewEngine";
import { statistics } from "./statistics";
import { mcq, scenario, match, order } from "../test/fixtures";
describe("spaced review compatibility", () => {
  it("schedules 1/3/7 days, fourth due success retains, then 14-day maintenance", () => {
    const state = emptyState();
    let now = 1000;
    const gaps = [DAY, 3 * DAY, 7 * DAY, MAINTENANCE, MAINTENANCE];
    for (let i = 0; i < gaps.length; i++) {
      const st = recordAttempt(state, "010", mcq.id, true, now, "review");
      expect(st.nextReviewAt).toBe(now + gaps[i]);
      expect(st.mastered).toBe(i >= 3);
      now = st.nextReviewAt!;
    }
  });
  it("does not advance early correct answers", () => {
    const state = emptyState();
    recordAttempt(state, "010", mcq.id, true, 1000, "path");
    const st = recordAttempt(state, "010", mcq.id, true, 2000, "path");
    expect(st.consecutiveCorrect).toBe(1);
    expect(st.nextReviewAt).toBe(1000 + DAY);
    expect(st.attempts).toBe(2);
  });
  it.each([true, false])(
    "practice %s does not change scheduling or retention",
    (correct) => {
      const state = emptyState();
      const st = recordAttempt(state, "010", mcq.id, true, 1000, "learn");
      const before = {
        step: st.reviewStep,
        due: st.nextReviewAt,
        retained: st.mastered,
        streak: st.consecutiveCorrect,
      };
      recordAttempt(state, "010", mcq.id, correct, 2000, "practice");
      expect({
        step: st.reviewStep,
        due: st.nextReviewAt,
        retained: st.mastered,
        streak: st.consecutiveCorrect,
      }).toEqual(before);
      expect(st.attempts).toBe(2);
    },
  );
  it("wrong scheduled answer resets immediately due", () => {
    const state = emptyState();
    recordAttempt(state, "010", mcq.id, true, 1000, "learn");
    const st = recordAttempt(state, "010", mcq.id, false, 2000, "retry");
    expect(st.mastered).toBe(false);
    expect(st.consecutiveCorrect).toBe(0);
    expect(st.nextReviewAt).toBe(2000);
  });
  it("caps item history at 50", () => {
    const state = emptyState();
    for (let i = 0; i < 70; i++)
      recordAttempt(state, "010", mcq.id, true, i + 1, "practice");
    expect(state.modules["010"].itemState[mcq.id].history).toHaveLength(50);
  });
  it("resets mastery once per meaningful revision while preserving totals", () => {
    const state = emptyState();
    const st = recordAttempt(state, "010", mcq.id, true, 1000, "learn");
    st.mastered = true;
    st.consecutiveCorrect = 4;
    const revised = { ...mcq, contentRevision: "r2", reviewResetNeeded: true };
    reconcileContent(state, "010", [revised], 2000);
    expect(st.mastered).toBe(false);
    expect(st.attempts).toBe(1);
    expect(st.nextReviewAt).toBe(2000);
    st.mastered = true;
    reconcileContent(state, "010", [revised], 3000);
    expect(st.mastered).toBe(true);
    expect(st.nextReviewAt).toBe(2000);
  });
  it("does not reset revision-only edits", () => {
    const state = emptyState();
    const st = recordAttempt(state, "010", mcq.id, true, 1000, "learn");
    st.mastered = true;
    reconcileContent(state, "010", [{ ...mcq, contentRevision: "r2" }]);
    expect(st.mastered).toBe(true);
  });
  it("excludes excluded IDs from queue, counts, due, mistakes, grading and session IDs", () => {
    const state = emptyState();
    const excluded = { ...mcq, auditDecision: "excluded" as const };
    recordAttempt(state, "010", mcq.id, false, 1000, "learn");
    const mod = ensureModule(state, "010");
    expect(dueItems(mod, [excluded], 2000)).toEqual([]);
    expect(missedItems(mod, [excluded])).toEqual([]);
    expect(buildPath(mod, [excluded])).toEqual([]);
    expect(statistics(mod, [excluded]).items).toBe(0);
    expect(grade(excluded, { selectedIds: ["b"] })).toBe(false);
    expect(startSession(state, "010", "path", [excluded]).itemIds).toEqual([]);
  });
  it("path picks due first, deduplicates and respects count", () => {
    const state = emptyState();
    recordAttempt(state, "010", mcq.id, false, 1000, "learn");
    const result = buildPath(
      ensureModule(state, "010"),
      [mcq, scenario, match, order],
      3,
      2000,
      () => 0.5,
    );
    expect(result[0]).toBe(mcq);
    expect(result).toHaveLength(3);
    expect(new Set(result.map((i) => i.id)).size).toBe(3);
  });
  it("end is idempotent and retains legacy 5-minute total cap", () => {
    const state = emptyState(),
      s = startSession(state, "010", "path", [mcq], 1000);
    endSession(state, "010", s.id, 400000, 2000);
    endSession(state, "010", s.id, 100, 3000);
    expect(state.modules["010"].activeMs).toBe(300000);
    expect(s.activeMs).toBe(400000);
    expect(s.endedAt).toBe(2000);
  });
  it("counts attempts, first answers and review history consistently", () => {
    const state = emptyState();
    recordAttempt(state, "010", mcq.id, false, 1000, "path");
    recordAttempt(state, "010", mcq.id, true, 2000, "review");
    recordAttempt(state, "010", scenario.id, true, 2000, "practice");
    const st = statistics(ensureModule(state, "010"), [mcq, scenario]);
    expect(st.attempted).toBe(2);
    expect(st.attempts).toBe(3);
    expect(st.accuracy).toBe(2 / 3);
    expect(st.firstAccuracy).toBe(0.5);
    expect(st.delayedAccuracy).toBe(1);
    expect(st.delayedN).toBe(1);
  });
  it("empty pool returns no items", () =>
    expect(buildPath(emptyModule(), [])).toEqual([]));
});
describe("four exercise graders", () => {
  it.each([mcq, scenario])("grades $type exactly", (item) => {
    expect(grade(item, { selectedIds: ["b"] })).toBe(true);
    expect(grade(item, { selectedIds: ["b", "b"] })).toBe(false);
    expect(grade(item, { selectedIds: ["a"] })).toBe(false);
  });
  it("grades ordered permutation, not membership", () => {
    expect(grade(order, { orderedIds: ["a", "b"] })).toBe(true);
    expect(grade(order, { orderedIds: ["b", "a"] })).toBe(false);
  });
  it("requires all matches", () => {
    expect(grade(match, { mapping: { One: "First", Two: "Second" } })).toBe(
      true,
    );
    expect(grade(match, { mapping: { One: "First" } })).toBe(false);
  });
});
