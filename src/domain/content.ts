import { z } from "zod";

const text = z.string().min(1);
const httpUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//.test(v), "HTTP(S) URL required");
const option = z.object({ id: text, text });
const citation = z.object({
  title: text,
  url: httpUrl,
  locator: z.string().optional(),
  accessedAt: z.string().optional(),
});
const common = z.object({
  id: text,
  chapterId: text,
  prompt: text,
  explanation: text,
  contentRevision: text,
  verificationStatus: z.enum(["verified", "flagged", "unverified"]),
  citations: z.array(citation),
  reviewResetNeeded: z.boolean(),
  auditDecision: z.enum(["retained", "rewritten", "excluded"]),
  auditReason: z.string(),
  pdfPrinted: z.array(z.number().int().nonnegative()).default([]),
  pdfFile: z.array(z.number().int().nonnegative()).default([]),
  jurisdiction: z.string().optional(),
  currentSource: z
    .object({
      title: z.string(),
      url: z.union([httpUrl, z.literal("")]),
      date: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});
const choices = {
  options: z.array(option).min(2),
  correct: z.array(text).min(1),
};
export const itemSchema = z
  .discriminatedUnion("type", [
    common.extend({ type: z.literal("mcq"), ...choices }),
    common.extend({ type: z.literal("scenario"), ...choices }),
    common.extend({ type: z.literal("order"), ...choices }),
    common.extend({
      type: z.literal("match"),
      pairs: z.array(z.object({ left: text, right: text })).min(2),
    }),
  ])
  .superRefine((item, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (item.verificationStatus === "verified" && !item.citations.length)
      fail("Verified item requires citations");
    if (item.type === "match") {
      if (
        new Set(item.pairs.map((p) => p.left)).size !== item.pairs.length ||
        new Set(item.pairs.map((p) => p.right)).size !== item.pairs.length
      )
        fail("Match labels must be unique");
    } else {
      const ids = item.options.map((o) => o.id);
      if (
        new Set(ids).size !== ids.length ||
        new Set(item.correct).size !== item.correct.length
      )
        fail("Duplicate option/answer ID");
      if (!item.correct.every((id) => ids.includes(id)))
        fail("Unknown answer ID");
      if (item.type === "order" && item.correct.length !== ids.length)
        fail("Order key must be a full permutation");
    }
  });
export const courseSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentRevision: text,
    language: z.enum(["en", "fr"]),
    moduleId: text,
    moduleCode: text,
    moduleTitle: text,
    source: z
      .object({
        title: text,
        publisher: z.string().optional(),
        edition: z.string().optional(),
        copyrightYear: z.number().optional(),
      })
      .optional(),
    chapters: z
      .array(
        z.object({
          id: text,
          code: text,
          title: text,
          titleEn: z.string().optional(),
          blurb: z.string().optional(),
        }),
      )
      .min(1),
    items: z.array(itemSchema).min(1),
  })
  .superRefine((course, ctx) => {
    if (new Set(course.items.map((i) => i.id)).size !== course.items.length)
      ctx.addIssue({ code: "custom", message: "Duplicate item IDs" });
    if (
      new Set(course.chapters.map((c) => c.id)).size !== course.chapters.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate chapter IDs" });
    for (const item of course.items)
      if (!course.chapters.some((c) => c.id === item.chapterId))
        ctx.addIssue({
          code: "custom",
          message: `Unknown chapter for ${item.id}`,
        });
  });
export type Course = z.infer<typeof courseSchema>;
export type Item = z.infer<typeof itemSchema>;
export type ChoiceItem = Extract<Item, { type: "mcq" | "scenario" }>;
export type OrderItem = Extract<Item, { type: "order" }>;
export type MatchItem = Extract<Item, { type: "match" }>;
export function parseCourse(value: unknown, production = false): Course {
  // Reject private paths even in unknown fields; do not merely strip them from the parsed result.
  const raw = JSON.stringify(value);
  if (/(?:\/workspace\/|\/home\/|file:\/\/|[A-Za-z]:\\\\)/.test(raw))
    throw new Error("Private filesystem path in content");
  const course = courseSchema.parse(value);
  if (production && course.language !== "en")
    throw new Error("Production requires the approved English content package");
  return course;
}
export const isEligible = (item: Item) =>
  item.auditDecision !== "excluded" && item.verificationStatus === "verified";
export const gradedItems = (course: Course) => course.items.filter(isEligible);
