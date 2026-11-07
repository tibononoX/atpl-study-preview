import type {
  ChoiceItem,
  OrderItem,
  MatchItem,
  Course,
} from "../domain/content";
export const base = {
  id: "010-test-01",
  chapterId: "test",
  prompt: "Question?",
  explanation: "Because.",
  contentRevision: "r1",
  verificationStatus: "verified" as const,
  citations: [{ title: "Synthetic source", url: "https://example.org/source" }],
  reviewResetNeeded: false,
  auditDecision: "retained" as const,
  auditReason: "Pending audit",
  pdfPrinted: [],
  pdfFile: [],
};
export const mcq: ChoiceItem = {
  ...base,
  type: "mcq",
  options: [
    { id: "a", text: "Alpha" },
    { id: "b", text: "Bravo" },
  ],
  correct: ["b"],
};
export const scenario: ChoiceItem = {
  ...mcq,
  type: "scenario",
  id: "010-test-02",
};
export const order: OrderItem = {
  ...mcq,
  type: "order",
  id: "010-test-03",
  correct: ["a", "b"],
};
export const match: MatchItem = {
  ...base,
  type: "match",
  id: "010-test-04",
  pairs: [
    { left: "One", right: "First" },
    { left: "Two", right: "Second" },
  ],
};
export const course: Course = {
  schemaVersion: 1,
  contentRevision: "r1",
  language: "en",
  moduleId: "010",
  moduleCode: "010",
  moduleTitle: "Air Law",
  chapters: [{ id: "test", title: "Test", code: "1" }],
  items: [mcq, scenario, order, match],
};
