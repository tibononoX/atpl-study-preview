import { z } from "zod";
const number = z.number().finite().nonnegative();
const timestamp = number.nullable();
export const modeSchema = z.enum([
  "learn",
  "review",
  "retry",
  "practice",
  "path",
]);
export type Mode = z.infer<typeof modeSchema>;
export const itemProgressSchema = z
  .object({
    attempts: number.int(),
    correctCount: number.int(),
    incorrectCount: number.int(),
    consecutiveCorrect: number.int(),
    mastered: z.boolean(),
    lastAttemptAt: timestamp,
    lastCorrectAt: timestamp,
    nextReviewAt: timestamp,
    reviewStep: number.int(),
    history: z.array(
      z.object({ t: number, correct: z.boolean(), mode: modeSchema }),
    ),
    appliedContentRevision: z.string().optional(),
  })
  .passthrough();
export const sessionSchema = z
  .object({
    id: z.string(),
    startedAt: number,
    endedAt: timestamp,
    mode: modeSchema,
    itemIds: z.array(z.string()),
    results: z.array(z.object({ id: z.string(), correct: z.boolean() })),
    activeMs: number,
  })
  .passthrough();
export const moduleProgressSchema = z
  .object({
    itemState: z.record(z.string(), itemProgressSchema),
    sessions: z.array(sessionSchema),
    activeMs: number,
    firstStartedAt: timestamp,
  })
  .passthrough();
export const progressSchema = z
  .object({
    schemaVersion: z.literal(1),
    appId: z.literal("atpl-study"),
    modules: z.record(z.string(), moduleProgressSchema),
    meta: z
      .object({
        createdAt: timestamp.optional(),
        updatedAt: timestamp.optional(),
      })
      .passthrough(),
  })
  .passthrough();
export type Progress = z.infer<typeof progressSchema>;
export type ModuleProgress = z.infer<typeof moduleProgressSchema>;
export type ItemProgress = z.infer<typeof itemProgressSchema>;
export const emptyState = (): Progress => ({
  schemaVersion: 1,
  appId: "atpl-study",
  modules: {},
  meta: { createdAt: null, updatedAt: null },
});
export const emptyModule = (): ModuleProgress => ({
  itemState: {},
  sessions: [],
  activeMs: 0,
  firstStartedAt: null,
});
export const emptyItem = (): ItemProgress => ({
  attempts: 0,
  correctCount: 0,
  incorrectCount: 0,
  consecutiveCorrect: 0,
  mastered: false,
  lastAttemptAt: null,
  lastCorrectAt: null,
  nextReviewAt: null,
  reviewStep: 0,
  history: [],
});
export function ensureModule(state: Progress, id: string): ModuleProgress {
  return state.modules[id] ?? (state.modules[id] = emptyModule());
}
