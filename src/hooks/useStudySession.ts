import { useCallback, useEffect, useRef, useState } from "react";
import { isEligible, type Item } from "../domain/content";
import type { Progress, Mode } from "../domain/progress";
import {
  startSession,
  endSession,
  recordAttempt,
} from "../domain/reviewEngine";
type Running = { id: string; mode: Mode; queue: Item[]; index: number };
export function useStudySession(
  moduleId: string,
  update: (fn: (draft: Progress) => void) => void,
) {
  const [session, setSession] = useState<Running | null>(null),
    [elapsed, setElapsed] = useState(0);
  const running = useRef<Running | null>(null),
    active = useRef(0),
    last = useRef(Date.now()),
    answered = useRef(false);
  const tick = useCallback(() => {
    const now = Date.now();
    if (running.current && !document.hidden)
      active.current += Math.min(now - last.current, 30000);
    last.current = now;
  }, []);
  const finish = useCallback(() => {
    const s = running.current;
    if (!s) return;
    tick();
    update((state) => endSession(state, moduleId, s.id, active.current));
    running.current = null;
    setSession(null);
  }, [moduleId, update, tick]);
  useEffect(() => {
    const id = setInterval(() => {
      tick();
      setElapsed(active.current);
    }, 1000);
    const visibility = () => {
      last.current = Date.now();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", finish);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", finish);
    };
  }, [finish, tick]);
  function begin(mode: Mode, queue: Item[]) {
    finish();
    const safe = queue.filter(isEligible);
    if (!safe.length) return;
    let id = "";
    update((state) => {
      id = startSession(state, moduleId, mode, safe).id;
    });
    const s = { id, mode, queue: safe, index: 0 };
    running.current = s;
    active.current = 0;
    last.current = Date.now();
    answered.current = false;
    setElapsed(0);
    setSession(s);
  }
  function answer(correct: boolean) {
    const s = running.current;
    if (!s || answered.current) return;
    answered.current = true;
    const item = s.queue[s.index];
    update((state) => {
      recordAttempt(state, moduleId, item.id, correct, Date.now(), s.mode);
      const st = state.modules[moduleId].itemState[item.id];
      st.appliedContentRevision = item.contentRevision;
      state.modules[moduleId].sessions
        .find((x) => x.id === s.id)
        ?.results.push({ id: item.id, correct });
    });
  }
  function next() {
    const s = running.current;
    if (!s || !answered.current) return;
    if (s.index === s.queue.length - 1) {
      finish();
      return;
    }
    const next = { ...s, index: s.index + 1 };
    running.current = next;
    answered.current = false;
    setSession(next);
  }
  return { session, elapsed, begin, answer, next, finish };
}
