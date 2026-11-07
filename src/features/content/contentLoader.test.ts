import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { loadCourse } from "./contentLoader";
import { course } from "../../test/fixtures";
const url = "/atpl-study/content/010-air-law.json";
const signal = () => new AbortController().signal;
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
describe("external content and explicit offline fallback", () => {
  it("fetches JSON with revalidation and caches successful package", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => course });
    vi.stubGlobal("fetch", fetcher);
    const result = await loadCourse(url, signal());
    expect(result.course.moduleId).toBe("010");
    expect(result.offline).toBe(false);
    expect(fetcher).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ cache: "no-cache" }),
    );
  });
  it("uses cache only on network failure and labels it offline", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => course })
      .mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    await loadCourse(url, signal());
    const result = await loadCourse(url, signal());
    expect(result.offline).toBe(true);
    expect(result.cachedAt).toBeGreaterThan(0);
    expect(result.course.contentRevision).toBe("r1");
  });
  it("does not silently use old content after HTTP errors", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => course })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetcher);
    await loadCourse(url, signal());
    await expect(loadCourse(url, signal())).rejects.toThrow("404");
  });
  it("does not hide invalid replacement package behind cache", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => course })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bad: "data" }) });
    vi.stubGlobal("fetch", fetcher);
    await loadCourse(url, signal());
    await expect(loadCourse(url, signal())).rejects.toThrow();
  });
  it("shows retryable error with no cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(loadCourse(url, signal())).rejects.toThrow(
      "Connect to the internet",
    );
  });
  it("rejects wrong module", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...course, moduleId: "050" }),
      }),
    );
    await expect(loadCourse(url, signal())).rejects.toThrow(
      "Unexpected module",
    );
  });
  it("does not fall back when aborted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    const controller = new AbortController();
    controller.abort();
    await expect(loadCourse(url, controller.signal)).rejects.toThrow("aborted");
  });
});
