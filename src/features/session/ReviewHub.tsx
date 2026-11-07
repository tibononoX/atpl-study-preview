import type { Item } from "../../domain/content";
import type { ModuleProgress, Mode } from "../../domain/progress";
import { dueItems, missedItems } from "../../domain/reviewEngine";
export function ReviewHub({
  mod,
  items,
  begin,
}: {
  mod: ModuleProgress;
  items: Item[];
  begin: (mode: Mode, items: Item[]) => void;
}) {
  const due = dueItems(mod, items),
    missed = missedItems(mod, items);
  return (
    <>
      <section className="card">
        <h2>Due reviews</h2>
        <p>
          {due.length} items are due, including maintenance of retained items.
        </p>
        <button
          className="btn primary"
          disabled={!due.length}
          onClick={() => begin("review", due.slice(0, 10))}
        >
          Start due reviews
        </button>
        {due.length > 0 && (
          <ul>
            {due.slice(0, 15).map((i) => (
              <li key={i.id}>{i.prompt}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="card">
        <h2>Retry mistakes</h2>
        <p>{missed.length} previously missed items are not yet mastered.</p>
        <button
          className="btn"
          disabled={!missed.length}
          onClick={() => begin("retry", missed.slice(0, 10))}
        >
          Retry mistakes
        </button>
      </section>
    </>
  );
}
