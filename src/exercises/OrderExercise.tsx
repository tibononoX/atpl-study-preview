import { useRef } from "react";
import type { OrderItem } from "../domain/content";
export function OrderExercise({
  item,
  ids,
  onChange,
  disabled,
}: {
  item: OrderItem;
  ids: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function move(index: number, delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
    requestAnimationFrame(() =>
      refs.current[`${ids[index]}-${delta}`]?.focus(),
    );
  }
  return (
    <>
      <p className="small">Use Move up / Move down to arrange the sequence.</p>
      <ol className="order-list">
        {ids.map((id, index) => (
          <li className="order-item" key={id}>
            <span>
              {index + 1}. {item.options.find((o) => o.id === id)?.text}
            </span>
            <div className="row">
              <button
                type="button"
                ref={(el) => {
                  refs.current[`${id}--1`] = el;
                }}
                className="btn"
                aria-label={`Move ${item.options.find((o) => o.id === id)?.text} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                ref={(el) => {
                  refs.current[`${id}-1`] = el;
                }}
                className="btn"
                aria-label={`Move ${item.options.find((o) => o.id === id)?.text} down`}
                disabled={disabled || index === ids.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
