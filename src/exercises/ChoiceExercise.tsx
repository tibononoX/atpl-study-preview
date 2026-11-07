import type { ChoiceItem } from "../domain/content";
export function ChoiceExercise({
  item,
  options,
  selected,
  onChange,
  disabled,
}: {
  item: ChoiceItem;
  options: ChoiceItem["options"];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const multiple = item.correct.length > 1;
  return (
    <fieldset className="opts">
      <legend className="small">
        {multiple ? "Select all correct answers." : "Select one answer."}
      </legend>
      {options.map((o) => (
        <label
          className={`opt ${selected.includes(o.id) ? "selected" : ""}`}
          key={o.id}
        >
          <input
            type={multiple ? "checkbox" : "radio"}
            name={item.id}
            value={o.id}
            checked={selected.includes(o.id)}
            disabled={disabled}
            onChange={() =>
              onChange(
                multiple
                  ? selected.includes(o.id)
                    ? selected.filter((id) => id !== o.id)
                    : [...selected, o.id]
                  : [o.id],
              )
            }
          />{" "}
          {o.text}
        </label>
      ))}
    </fieldset>
  );
}
