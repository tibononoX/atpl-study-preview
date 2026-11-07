import type { MatchItem } from "../domain/content";
export function MatchExercise({
  item,
  rights,
  mapping,
  onChange,
  disabled,
}: {
  item: MatchItem;
  rights: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  disabled: boolean;
}) {
  return (
    <div className="match-grid">
      {item.pairs.map((p, index) => (
        <label key={p.left} htmlFor={`${item.id}-${index}`}>
          {p.left}
          <select
            className="match"
            id={`${item.id}-${index}`}
            value={mapping[p.left] ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...mapping, [p.left]: e.target.value })}
          >
            <option value="">Choose a match</option>
            {rights.map((right) => (
              <option key={right}>{right}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
