import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionCard } from "../features/session/QuestionCard";
import { mcq, scenario, match, order } from "../test/fixtures";
afterEach(cleanup);
describe("accessible exercises and feedback", () => {
  it.each([mcq, scenario])(
    "$type has named radios and records one answer",
    async (item) => {
      const user = userEvent.setup(),
        answer = vi.fn();
      render(
        <QuestionCard
          item={item}
          onAnswer={answer}
          onContinue={() => {}}
          last={false}
        />,
      );
      expect(
        (
          screen.getByRole("button", {
            name: "Check answer",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      await user.click(screen.getByRole("radio", { name: "Bravo" }));
      await user.click(screen.getByRole("button", { name: "Check answer" }));
      expect(answer).toHaveBeenCalledExactlyOnceWith(true);
      expect(screen.getByRole("status").textContent).toContain("Correct");
      expect(document.activeElement).toBe(screen.getByRole("status"));
      expect(screen.getByText("Verified proposition")).toBeTruthy();
    },
  );
  it("supports multiple correct answers with checkboxes", async () => {
    const user = userEvent.setup(),
      answer = vi.fn();
    render(
      <QuestionCard
        item={{ ...mcq, correct: ["a", "b"] }}
        onAnswer={answer}
        onContinue={() => {}}
        last
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Alpha" }));
    await user.click(screen.getByRole("checkbox", { name: "Bravo" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(answer).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Finish session" })).toBeTruthy();
  });
  it("matching controls are labelled and require all matches", async () => {
    const user = userEvent.setup(),
      answer = vi.fn();
    render(
      <QuestionCard
        item={match}
        onAnswer={answer}
        onContinue={() => {}}
        last={false}
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "One" }),
      "First",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Two" }),
      "Second",
    );
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(answer).toHaveBeenCalledWith(true);
  });
  it("order controls move without drag and grade current order", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const user = userEvent.setup(),
      answer = vi.fn();
    render(
      <QuestionCard
        item={order}
        onAnswer={answer}
        onContinue={() => {}}
        last={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Move Bravo up" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(answer).toHaveBeenCalledWith(false);
    expect(screen.getByRole("status").textContent).toContain("Alpha → Bravo");
  });
  it("native form supports submission with Enter", () => {
    const answer = vi.fn();
    render(
      <QuestionCard
        item={mcq}
        onAnswer={answer}
        onContinue={() => {}}
        last={false}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Bravo" }));
    fireEvent.submit(
      screen.getByRole("button", { name: "Check answer" }).closest("form")!,
    );
    expect(answer).toHaveBeenCalledWith(true);
  });
  it("never uses old status as legal verification", () => {
    render(
      <QuestionCard
        item={{
          ...mcq,
          verificationStatus: "unverified",
          ...{ status: "verified_current" },
        }}
        onAnswer={() => {}}
        onContinue={() => {}}
        last={false}
      />,
    );
    expect(screen.queryByText("Verified proposition")).toBeNull();
  });
  it("renders question markup as text, not HTML", () => {
    render(
      <QuestionCard
        item={{ ...mcq, prompt: "<img src=x onerror=alert(1)>" }}
        onAnswer={() => {}}
        onContinue={() => {}}
        last={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "<img src=x onerror=alert(1)>" }),
    ).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("legacy keyboard shortcuts", () => {
  it("selects a numbered choice and Enter submits / continues", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const user = userEvent.setup(),
      answer = vi.fn(),
      next = vi.fn();
    render(
      <QuestionCard
        item={mcq}
        onAnswer={answer}
        onContinue={next}
        last={false}
      />,
    );
    await user.keyboard("2{Enter}");
    expect(answer).toHaveBeenCalledExactlyOnceWith(true);
    await user.keyboard("{Enter}");
    expect(next).toHaveBeenCalledOnce();
  });
  it("does not capture number keys inside match selects", () => {
    const answer = vi.fn();
    render(
      <QuestionCard
        item={match}
        onAnswer={answer}
        onContinue={() => {}}
        last={false}
      />,
    );
    fireEvent.keyDown(screen.getByRole("combobox", { name: "One" }), {
      key: "1",
    });
    expect(answer).not.toHaveBeenCalled();
  });
});

describe("scoped content-owner badges", () => {
  it("never gives excluded items a verified badge, even with conflicting verification metadata", () => {
    render(
      <QuestionCard
        item={{ ...mcq, auditDecision: "excluded" }}
        onAnswer={() => {}}
        onContinue={() => {}}
        last={false}
      />,
    );
    expect(screen.queryByText("Verified proposition")).toBeNull();
    expect(screen.getByText(/Excluded from scored study/)).toBeTruthy();
  });
  it("shows jurisdiction scope beside the badge and source notes only after answering", async () => {
    const user = userEvent.setup();
    render(
      <QuestionCard
        item={{
          ...mcq,
          jurisdiction: "Synthetic scope",
          currentSource: {
            title: "Source",
            url: "https://example.org",
            date: "2026 test edition",
            note: "Narrow audited proposition only.",
          },
        }}
        onAnswer={() => {}}
        onContinue={() => {}}
        last={false}
      />,
    );
    expect(
      screen.getByText(/Jurisdiction \/ source scope: Synthetic scope/),
    ).toBeTruthy();
    expect(screen.queryByText(/Narrow audited proposition only/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Bravo" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(
      screen.getByText(/Source note: Narrow audited proposition only/),
    ).toBeTruthy();
  });
});
