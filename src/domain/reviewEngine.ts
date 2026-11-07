import { isEligible, type Item } from "./content";
import {
  emptyItem,
  ensureModule,
  type Progress,
  type Mode,
  type ModuleProgress,
} from "./progress";
export const DAY = 86400000;
export const INTERVALS = [DAY, 3 * DAY, 7 * DAY];
export const MAINTENANCE = 14 * DAY;
export type Answer = {
  selectedIds?: string[];
  orderedIds?: string[];
  mapping?: Record<string, string>;
};
export function shuffle<T>(
  values: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function grade(item: Item, answer: Answer): boolean {
  if (!isEligible(item)) return false;
  if (item.type === "match")
    return item.pairs.every((p) => answer.mapping?.[p.left] === p.right);
  const ids = item.type === "order" ? answer.orderedIds : answer.selectedIds;
  if (
    !ids ||
    new Set(ids).size !== ids.length ||
    ids.length !== item.correct.length
  )
    return false;
  return item.type === "order"
    ? ids.every((id, i) => id === item.correct[i])
    : ids.every((id) => item.correct.includes(id));
}
export function recordAttempt(
  state: Progress,
  moduleId: string,
  id: string,
  correct: boolean,
  now: number,
  mode: Mode,
) {
  const mod = ensureModule(state, moduleId),
    st = mod.itemState[id] ?? (mod.itemState[id] = emptyItem());
  mod.firstStartedAt ??= now;
  st.attempts++;
  st.lastAttemptAt = now;
  st.history.push({ t: now, correct, mode });
  st.history = st.history.slice(-50);
  if (correct) {
    st.correctCount++;
    st.lastCorrectAt = now;
    if (
      mode !== "practice" &&
      (st.nextReviewAt === null || now >= st.nextReviewAt)
    ) {
      if (st.mastered) {
        st.consecutiveCorrect = Math.max(st.consecutiveCorrect, 4);
        st.reviewStep = 4;
        st.nextReviewAt = now + MAINTENANCE;
      } else {
        st.consecutiveCorrect++;
        st.mastered = st.consecutiveCorrect >= 4;
        st.reviewStep = Math.min(st.consecutiveCorrect, 3);
        st.nextReviewAt =
          now +
          (st.mastered ? MAINTENANCE : INTERVALS[st.consecutiveCorrect - 1]);
      }
    }
  } else {
    st.incorrectCount++;
    if (mode !== "practice") {
      st.consecutiveCorrect = 0;
      st.mastered = false;
      st.reviewStep = 0;
      st.nextReviewAt = now;
    }
  }
  state.meta.createdAt ??= now;
  state.meta.updatedAt = now;
  return st;
}
export function reconcileContent(
  state: Progress,
  moduleId: string,
  items: Item[],
  now = Date.now(),
) {
  const mod = ensureModule(state, moduleId);
  for (const item of items) {
    const st = mod.itemState[item.id];
    if (!st || st.appliedContentRevision === item.contentRevision) continue;
    if (item.reviewResetNeeded) {
      st.consecutiveCorrect = 0;
      st.mastered = false;
      st.reviewStep = 0;
      st.nextReviewAt = now;
    }
    st.appliedContentRevision = item.contentRevision;
  }
  return state;
}
const allowed = (items: Item[]) => items.filter(isEligible);
export const dueItems = (
  mod: ModuleProgress,
  items: Item[],
  now = Date.now(),
) =>
  allowed(items).filter(
    (i) =>
      mod.itemState[i.id]?.nextReviewAt != null &&
      mod.itemState[i.id].nextReviewAt! <= now,
  );
export const missedItems = (mod: ModuleProgress, items: Item[]) =>
  allowed(items).filter(
    (i) =>
      mod.itemState[i.id]?.incorrectCount > 0 && !mod.itemState[i.id].mastered,
  );
export const unseenItems = (mod: ModuleProgress, items: Item[]) =>
  allowed(items).filter((i) => !mod.itemState[i.id]?.attempts);
export function buildPath(
  mod: ModuleProgress,
  items: Item[],
  n = 8,
  now = Date.now(),
  rng = Math.random,
) {
  const pool = allowed(items),
    due = dueItems(mod, pool, now),
    missed = missedItems(mod, pool).filter((i) => !due.includes(i)),
    unseen = unseenItems(mod, pool);
  const rest = pool.filter(
    (i) =>
      !due.includes(i) &&
      !missed.includes(i) &&
      !unseen.includes(i) &&
      !mod.itemState[i.id]?.mastered,
  );
  const result: Item[] = [];
  for (const group of [due, missed.slice(0, 3), unseen, rest, pool])
    for (const item of shuffle(group, rng))
      if (result.length < n && !result.includes(item)) result.push(item);
  return result;
}
export function startSession(
  state: Progress,
  moduleId: string,
  mode: Mode,
  items: Item[],
  now = Date.now(),
) {
  const mod = ensureModule(state, moduleId);
  const session = {
    id: `s-${now}-${Math.floor(Math.random() * 1e6)}`,
    startedAt: now,
    endedAt: null as number | null,
    mode,
    itemIds: allowed(items).map((i) => i.id),
    results: [] as { id: string; correct: boolean }[],
    activeMs: 0,
  };
  mod.sessions.push(session);
  mod.sessions = mod.sessions.slice(-100);
  return session;
}
export function endSession(
  state: Progress,
  moduleId: string,
  id: string,
  activeMs: number,
  now = Date.now(),
) {
  const mod = ensureModule(state, moduleId),
    s = mod.sessions.find((s) => s.id === id);
  if (!s || s.endedAt !== null) return;
  s.endedAt = now;
  s.activeMs = Math.max(0, activeMs);
  mod.activeMs += Math.min(s.activeMs, 5 * 60 * 1000);
  state.meta.updatedAt = now;
}
