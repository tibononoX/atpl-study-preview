import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCourse } from "./content";
import { course, mcq } from "../test/fixtures";
describe("runtime content schema", () => {
  it("accepts all four contracted shapes", () =>
    expect(parseCourse(course).items).toHaveLength(4));
  it("validates the owner's approved English forty-item package", () => {
    const result = parseCourse(
      JSON.parse(readFileSync("public/content/010-air-law.json", "utf8")),
      true,
    );
    expect(result.contentRevision).toBe("010-en-2026-11-07-r2");
    expect(result.items).toHaveLength(40);
    expect(
      result.items.filter(
        (i) =>
          i.verificationStatus === "verified" && i.auditDecision !== "excluded",
      ),
    ).toHaveLength(36);
    expect(result.items.filter((i) => i.reviewResetNeeded)).toHaveLength(17);
  });
  it("production refuses French staging", () =>
    expect(() => parseCourse({ ...course, language: "fr" }, true)).toThrow(
      "English",
    ));
  it("accepts English production contract", () =>
    expect(parseCourse(course, true).language).toBe("en"));
  it.each(["schemaVersion", "contentRevision", "items", "chapters"])(
    "rejects missing %s",
    (key) => {
      const data: Record<string, unknown> = { ...course };
      delete data[key];
      expect(() => parseCourse(data)).toThrow();
    },
  );
  it("rejects duplicate IDs", () =>
    expect(() => parseCourse({ ...course, items: [mcq, mcq] })).toThrow());
  it("rejects unknown chapter", () =>
    expect(() =>
      parseCourse({ ...course, items: [{ ...mcq, chapterId: "missing" }] }),
    ).toThrow());
  it("rejects nonexistent answer ID", () =>
    expect(() =>
      parseCourse({ ...course, items: [{ ...mcq, correct: ["x"] }] }),
    ).toThrow());
  it("rejects partial order key", () =>
    expect(() =>
      parseCourse({
        ...course,
        items: [{ ...mcq, type: "order", correct: ["b"] }],
      }),
    ).toThrow());
  it("rejects verified items without citations", () =>
    expect(() =>
      parseCourse({
        ...course,
        items: [{ ...mcq, verificationStatus: "verified", citations: [] }],
      }),
    ).toThrow());
  it("accepts owner citations", () =>
    expect(
      parseCourse({
        ...course,
        items: [
          {
            ...mcq,
            verificationStatus: "verified",
            citations: [
              { title: "Source", url: "https://example.org", locator: "Art 1" },
            ],
          },
        ],
      }).items[0].verificationStatus,
    ).toBe("verified"));
  it.each([
    "/workspace/private.pdf",
    "/home/user/private.pdf",
    "file:///private/document.pdf",
    "C:\\Users\\private.pdf",
  ])("rejects private path %s", (path) =>
    expect(() =>
      parseCourse({ ...course, source: { title: "Manual", path } }),
    ).toThrow(),
  );
  it("rejects active citation URLs", () =>
    expect(() =>
      parseCourse({
        ...course,
        items: [
          { ...mcq, citations: [{ title: "Bad", url: "javascript:alert(1)" }] },
        ],
      }),
    ).toThrow());
});
