import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseCourse, gradedItems, isEligible } from "./content";
import { emptyState, ensureModule } from "./progress";
import {
  buildPath,
  dueItems,
  missedItems,
  recordAttempt,
  reconcileContent,
  startSession,
  grade,
} from "./reviewEngine";
import { statistics } from "./statistics";
import {
  exportProgress,
  importProgress,
  STORAGE_KEY,
} from "../storage/progressStore";
const course = parseCourse(
  JSON.parse(readFileSync("public/content/010-air-law.json", "utf8")),
  true,
);
const excludedIds = ["010-fcl-04", "010-ifr-01", "010-ifr-02", "010-ifr-03"];
function legacyMastery() {
  const state = emptyState();
  for (const item of course.items) {
    const st = recordAttempt(state, "010", item.id, true, 1000, "path");
    st.mastered = true;
    st.consecutiveCorrect = 4;
    st.reviewStep = 3;
    st.nextReviewAt = 2000;
  }
  ensureModule(state, "050").activeMs = 1234;
  return state;
}
describe("approved English package integration", () => {
  it("matches owner revision, counts, stable excluded IDs and exercise distribution", () => {
    expect(course.contentRevision).toBe("010-en-2026-11-07-r2");
    expect(course.language).toBe("en");
    expect(course.items).toHaveLength(40);
    expect(
      course.items
        .filter((i) => i.auditDecision === "excluded")
        .map((i) => i.id)
        .sort(),
    ).toEqual([...excludedIds].sort());
    const active = gradedItems(course);
    expect(active).toHaveLength(36);
    expect(
      active.every(
        (i) => i.verificationStatus === "verified" && i.citations.length > 0,
      ),
    ).toBe(true);
    expect(
      Object.fromEntries(
        ["mcq", "scenario", "order", "match"].map((type) => [
          type,
          active.filter((i) => i.type === type).length,
        ]),
      ),
    ).toEqual({ mcq: 26, scenario: 7, order: 2, match: 1 });
    expect(course.items.filter((i) => i.reviewResetNeeded)).toHaveLength(17);
  });
  it("excludes all four quarantined IDs from every study denominator and queue", () => {
    const state = legacyMastery(),
      mod = ensureModule(state, "010");
    for (const id of excludedIds) {
      mod.itemState[id].incorrectCount = 2;
      mod.itemState[id].mastered = false;
    }
    expect(statistics(mod, course.items, 3000).items).toBe(36);
    for (const queue of [
      buildPath(mod, course.items, 100, 3000),
      dueItems(mod, course.items, 3000),
      missedItems(mod, course.items),
    ])
      expect(queue.every(isEligible)).toBe(true);
    expect(
      startSession(state, "010", "practice", course.items, 3000).itemIds,
    ).toHaveLength(36);
    for (const item of course.items.filter((i) => excludedIds.includes(i.id)))
      expect(
        grade(
          item,
          item.type === "match"
            ? {
                mapping: Object.fromEntries(
                  item.pairs.map((p) => [p.left, p.right]),
                ),
              }
            : item.type === "order"
              ? { orderedIds: item.correct }
              : { selectedIds: item.correct },
        ),
      ).toBe(false);
  });
  it("resets exactly 17 meaningful revisions once without erasing mastery elsewhere, histories or other modules", () => {
    const state = legacyMastery();
    const baseline = structuredClone(state);
    reconcileContent(state, "010", course.items, 3000);
    for (const item of course.items) {
      const st = state.modules["010"].itemState[item.id];
      const previous = baseline.modules["010"].itemState[item.id];
      expect(st.attempts).toBe(previous.attempts);
      expect(st.history).toEqual(previous.history);
      expect(st.correctCount).toBe(previous.correctCount);
      expect(st.appliedContentRevision).toBe(item.contentRevision);
      expect(st.mastered).toBe(!item.reviewResetNeeded);
      expect(st.nextReviewAt).toBe(item.reviewResetNeeded ? 3000 : 2000);
      if (item.reviewResetNeeded) {
        st.mastered = true;
        st.consecutiveCorrect = 4;
        st.nextReviewAt = 9000;
      }
    }
    const once = structuredClone(state);
    reconcileContent(state, "010", course.items, 4000);
    expect(state).toEqual(once);
    expect(state.modules["050"]).toEqual(baseline.modules["050"]);
  });
  it("imports old v1 progress, reconciles revisions, exports v1 and preserves all stable IDs", () => {
    const legacy = legacyMastery();
    const state = importProgress(exportProgress(legacy));
    reconcileContent(state, "010", course.items, 3000);
    const roundtrip = importProgress(exportProgress(state));
    expect(roundtrip).toEqual(state);
    expect(roundtrip.appId).toBe("atpl-study");
    expect(roundtrip.schemaVersion).toBe(1);
    expect(STORAGE_KEY).toBe("atpl-study:v1");
    expect(Object.keys(roundtrip.modules["010"].itemState).sort()).toEqual(
      course.items.map((i) => i.id).sort(),
    );
    expect(
      Object.values(roundtrip.modules["010"].itemState).filter(
        (st) => !st.mastered,
      ),
    ).toHaveLength(17);
    expect(
      statistics(roundtrip.modules["010"], course.items, 3000).retained,
    ).toBe(19);
  });
  it.each(["flagged", "unverified"] as const)(
    "does not admit %s future items to grading or queues",
    (verificationStatus) => {
      const item = { ...course.items[0], verificationStatus };
      const mod = ensureModule(emptyState(), "010");
      expect(buildPath(mod, [item])).toEqual([]);
      expect(statistics(mod, [item]).items).toBe(0);
    },
  );
});
