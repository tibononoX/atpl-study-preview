import { useCallback, useRef, useState } from "react";
import { type Course } from "../domain/content";
import { reconcileContent } from "../domain/reviewEngine";
import { type Progress, emptyState } from "../domain/progress";
import {
  readProgress,
  writeProgress,
  importProgress,
} from "../storage/progressStore";
export function useProgress(course: Course) {
  const [initial] = useState(() => {
    let result;
    try {
      result = readProgress(window.localStorage);
    } catch {
      result = {
        state: emptyState(),
        warning:
          "Browser storage is unavailable. Export progress before leaving.",
      };
    }
    result.state = reconcileContent(
      result.state,
      course.moduleId,
      course.items,
    );
    return result;
  });
  const [state, setState] = useState(initial.state),
    [warning, setWarning] = useState(initial.warning);
  const current = useRef(state),
    blocked = useRef(!!initial.warning);
  const update = useCallback((fn: (draft: Progress) => void) => {
    const draft = structuredClone(current.current);
    fn(draft);
    current.current = draft;
    setState(draft);
    if (!blocked.current) {
      try {
        setWarning(writeProgress(window.localStorage, draft));
      } catch {
        setWarning("Browser storage is unavailable. Export a backup.");
      }
    }
  }, []);
  const restore = useCallback(
    (raw: string) => {
      const next = reconcileContent(
        importProgress(raw),
        course.moduleId,
        course.items,
      );
      blocked.current = false;
      current.current = next;
      setState(next);
      try {
        setWarning(writeProgress(window.localStorage, next));
      } catch {
        setWarning("Unable to save imported progress. Export a backup.");
      }
    },
    [course],
  );
  return { state, update, restore, warning };
}
