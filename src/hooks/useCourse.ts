import { useEffect, useState } from "react";
import { modules } from "../domain/modules";
import {
  loadCourse,
  type ContentResult,
} from "../features/content/contentLoader";
export function useCourse() {
  const [result, setResult] = useState<ContentResult | null>(null),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setResult(null);
    loadCourse(
      `${import.meta.env.BASE_URL}${modules.find((module) => module.id === "010")!.contentUrl!}`,
      controller.signal,
    )
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load content");
      });
    return () => controller.abort();
  }, [attempt]);
  return { result, error, retry: () => setAttempt((n) => n + 1) };
}
