import { isEligible, type Item } from "./content";
import { emptyItem, type ModuleProgress } from "./progress";
export function statistics(mod: ModuleProgress, all: Item[], now = Date.now()) {
  const items = all.filter(isEligible);
  const perChapter: Record<
    string,
    {
      items: number;
      attempted: number;
      mastered: number;
      attempts: number;
      correct: number;
    }
  > = {};
  let attempted = 0,
    retained = 0,
    attempts = 0,
    correct = 0,
    firstCorrect = 0,
    delayedN = 0,
    delayedCorrect = 0,
    due = 0;
  const recurringErrors: { id: string; incorrectCount: number }[] = [];
  for (const item of items) {
    const st = mod.itemState[item.id] ?? emptyItem(),
      ch =
        perChapter[item.chapterId] ??
        (perChapter[item.chapterId] = {
          items: 0,
          attempted: 0,
          mastered: 0,
          attempts: 0,
          correct: 0,
        });
    ch.items++;
    if (st.attempts) {
      attempted++;
      ch.attempted++;
      if (st.history[0]?.correct) firstCorrect++;
    }
    if (st.mastered) {
      retained++;
      ch.mastered++;
    }
    attempts += st.attempts;
    correct += st.correctCount;
    ch.attempts += st.attempts;
    ch.correct += st.correctCount;
    if (st.nextReviewAt !== null && st.nextReviewAt <= now) due++;
    for (const h of st.history)
      if (h.mode === "review") {
        delayedN++;
        if (h.correct) delayedCorrect++;
      }
    if (st.incorrectCount)
      recurringErrors.push({ id: item.id, incorrectCount: st.incorrectCount });
  }
  return {
    items: items.length,
    attempted,
    retained,
    attempts,
    correct,
    due,
    accuracy: attempts ? correct / attempts : null,
    firstAccuracy: attempted ? firstCorrect / attempted : null,
    delayedAccuracy: delayedN ? delayedCorrect / delayedN : null,
    delayedN,
    perChapter,
    recurringErrors: recurringErrors
      .sort((a, b) => b.incorrectCount - a.incorrectCount)
      .slice(0, 10),
    recentSessions: mod.sessions
      .filter((s) => s.endedAt !== null)
      .slice(-10)
      .reverse(),
    activeMs: mod.activeMs,
  };
}
