import { parseCourse, type Course } from "../../domain/content";
const CACHE_PREFIX = "atpl-study:content:v1:";
export type ContentResult = {
  course: Course;
  offline: boolean;
  cachedAt: number | null;
};
export async function loadCourse(
  url: string,
  signal: AbortSignal,
): Promise<ContentResult> {
  let response: Response;
  try {
    response = await fetch(url, { signal, cache: "no-cache" });
  } catch (error) {
    if (signal.aborted) throw error;
    // Network failure only: a broken new package or HTTP error must not silently select old content.
    let cache: string | null = null;
    try {
      cache = localStorage.getItem(CACHE_PREFIX + url);
    } catch {
      /* Cache is optional. */
    }
    if (!cache)
      throw new Error(
        "Content is unavailable. Connect to the internet and retry.",
        { cause: error },
      );
    const entry = JSON.parse(cache) as { data: unknown; cachedAt: number };
    if (!Number.isFinite(entry.cachedAt))
      throw new Error("Invalid content cache. Reconnect and retry.", {
        cause: error,
      });
    return {
      course: expectedCourse(entry.data),
      offline: true,
      cachedAt: entry.cachedAt,
    };
  }
  if (!response.ok)
    throw new Error(
      `Content request failed (${response.status}). Retry after checking the content deployment.`,
    );
  const data: unknown = await response.json();
  const course = expectedCourse(data);
  try {
    localStorage.setItem(
      CACHE_PREFIX + url,
      JSON.stringify({ data, cachedAt: Date.now() }),
    );
  } catch {
    /* Still usable online without cache. */
  }
  return { course, offline: false, cachedAt: null };
}

function expectedCourse(data: unknown): Course {
  const course = parseCourse(data);
  if (course.moduleId !== "010")
    throw new Error("Unexpected module in Air Law content package");
  return course;
}
