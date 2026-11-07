import { useEffect, useRef, useState } from "react";
import type { Item } from "../../domain/content";
import { grade, shuffle, type Answer } from "../../domain/reviewEngine";
import { ChoiceExercise } from "../../exercises/ChoiceExercise";
import { MatchExercise } from "../../exercises/MatchExercise";
import { OrderExercise } from "../../exercises/OrderExercise";
import { References, Verification } from "../content/References";
export function QuestionCard({
  item,
  onAnswer,
  onContinue,
  last,
}: {
  item: Item;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
  last: boolean;
}) {
  const [options] = useState(() =>
    item.type === "match" ? [] : shuffle(item.options),
  );
  const [rights] = useState(() =>
    item.type === "match" ? shuffle(item.pairs.map((p) => p.right)) : [],
  );
  const [answer, setAnswer] = useState<Answer>({
    selectedIds: [],
    orderedIds: options.map((o) => o.id),
    mapping: {},
  });
  const [result, setResult] = useState<boolean | null>(null),
    feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result !== null) feedback.current?.focus();
  }, [result]);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (
        target.closest("select,textarea,a") ||
        (target instanceof HTMLInputElement &&
          !["radio", "checkbox"].includes(target.type))
      )
        return;
      if (event.key === "Enter" && !target.closest("button,input")) {
        event.preventDefault();
        form.current?.requestSubmit();
        return;
      }
      if (result !== null || (item.type !== "mcq" && item.type !== "scenario"))
        return;
      const index = Number(event.key) - 1;
      if (!/^[1-9]$/.test(event.key) || !options[index]) return;
      event.preventDefault();
      const id = options[index].id;
      setAnswer((previous) => {
        const selected = previous.selectedIds ?? [];
        return {
          ...previous,
          selectedIds:
            item.correct.length > 1
              ? selected.includes(id)
                ? selected.filter((x) => x !== id)
                : [...selected, id]
              : [id],
        };
      });
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [item, options, result]);
  const ready =
    item.type === "match"
      ? item.pairs.every((p) => answer.mapping?.[p.left])
      : item.type === "order"
        ? true
        : !!answer.selectedIds?.length;
  const solution =
    item.type === "match"
      ? item.pairs.map((p) => `${p.left} → ${p.right}`).join("; ")
      : item.correct
          .map((id) => item.options.find((o) => o.id === id)?.text)
          .join(item.type === "order" ? " → " : "; ");
  return (
    <article className="card" aria-labelledby="question-prompt">
      <div className="row">
        <span className="chip">{item.type}</span>
        <span className="chip">{item.jurisdiction ?? "Theory"}</span>
      </div>
      <Verification item={item} />
      <h2 className="prompt" id="question-prompt">
        {item.prompt}
      </h2>
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          if (result !== null) {
            onContinue();
            return;
          }
          if (!ready) return;
          const correct = grade(item, answer);
          setResult(correct);
          onAnswer(correct);
        }}
      >
        {(item.type === "mcq" || item.type === "scenario") && (
          <ChoiceExercise
            item={item}
            options={options}
            selected={answer.selectedIds ?? []}
            disabled={result !== null}
            onChange={(selectedIds) => setAnswer({ ...answer, selectedIds })}
          />
        )}
        {item.type === "match" && (
          <MatchExercise
            item={item}
            rights={rights}
            mapping={answer.mapping ?? {}}
            disabled={result !== null}
            onChange={(mapping) => setAnswer({ ...answer, mapping })}
          />
        )}
        {item.type === "order" && (
          <OrderExercise
            item={item}
            ids={answer.orderedIds ?? []}
            disabled={result !== null}
            onChange={(orderedIds) => setAnswer({ ...answer, orderedIds })}
          />
        )}
        {result !== null && (
          <div
            ref={feedback}
            tabIndex={-1}
            className={`feedback ${result ? "good" : "bad"}`}
            role="status"
          >
            <h3>{result ? "Correct" : "Not quite"}</h3>
            <p>
              <strong>Answer:</strong> {solution}
            </p>
            <p>{item.explanation}</p>
            <References item={item} />
          </div>
        )}
        <button className="btn primary action" disabled={!ready} type="submit">
          {result === null
            ? "Check answer"
            : last
              ? "Finish session"
              : "Continue"}
        </button>
      </form>
    </article>
  );
}
