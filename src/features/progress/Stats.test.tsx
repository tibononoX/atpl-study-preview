import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { Stats } from "./Stats";
import { emptyState, ensureModule, type Mode } from "../../domain/progress";
import {
  endSession,
  recordAttempt,
  startSession,
} from "../../domain/reviewEngine";
import { exportProgress, importProgress } from "../../storage/progressStore";
import { course, mcq } from "../../test/fixtures";

afterEach(cleanup);

function completedSession(mode: Mode, planned: number, answers: boolean[]) {
  const state = emptyState();
  const items = Array.from({ length: planned }, (_, index) => ({
    ...mcq,
    id: `synthetic-${index}`,
  }));
  const session = startSession(state, "010", mode, items, 1000);
  for (const [index, correct] of answers.entries()) {
    recordAttempt(state, "010", items[index].id, correct, 2000 + index, mode);
    session.results.push({ id: items[index].id, correct });
  }
  endSession(state, "010", session.id, 12000, 3000);
  return { state, session };
}

function recentRow() {
  const section = screen.getByRole("heading", {
    name: "Recent sessions",
  }).parentElement!;
  return within(section).getByRole("listitem").textContent;
}

describe("recent-session answered versus correct counts", () => {
  it.each([
    { mode: "path" as const, planned: 8 },
    { mode: "practice" as const, planned: 3 },
  ])(
    "counts all incorrect $mode submissions as answered",
    ({ mode, planned }) => {
      const { state, session } = completedSession(
        mode,
        planned,
        Array(planned).fill(false),
      );
      render(<Stats course={course} mod={ensureModule(state, "010")} />);
      expect(recentRow()).toContain(
        `${planned}/${planned} answered · 0 correct`,
      );
      expect(session.results).toHaveLength(planned);
    },
  );

  it.each(["path", "practice"] as const)(
    "separates mixed %s accuracy from attempts",
    (mode) => {
      const { state } = completedSession(mode, 8, [
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        false,
      ]);
      render(<Stats course={course} mod={ensureModule(state, "010")} />);
      expect(recentRow()).toContain("8/8 answered · 3 correct");
    },
  );

  it.each(["path", "practice"] as const)(
    "preserves partial %s session counts",
    (mode) => {
      const { state } = completedSession(mode, 8, [false, true, false]);
      render(<Stats course={course} mod={ensureModule(state, "010")} />);
      expect(recentRow()).toContain("3/8 answered · 1 correct");
    },
  );

  it("does not infer historical answers from a planned queue or aggregate attempts", () => {
    const { state } = completedSession("path", 8, []);
    recordAttempt(state, "010", "synthetic-0", true, 4000, "path");
    const before = exportProgress(state);
    const restored = importProgress(before);
    render(<Stats course={course} mod={ensureModule(restored, "010")} />);
    expect(recentRow()).toContain("0/8 answered · 0 correct");
    expect(exportProgress(restored)).toBe(before);
  });
});
