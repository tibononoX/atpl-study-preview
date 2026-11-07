import { useState } from "react";
import type { Course } from "../../domain/content";
import type { ModuleProgress, Progress } from "../../domain/progress";
import { statistics } from "../../domain/statistics";
import { exportProgress } from "../../storage/progressStore";
export const percent = (n: number | null) =>
  n === null ? "—" : `${Math.round(n * 100)}%`;
export function formatTime(ms: number) {
  return `${Math.floor(ms / 60000)} min ${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")} s`;
}
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
export function downloadProgress(state: Progress) {
  const url = URL.createObjectURL(
    new Blob([exportProgress(state)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "atpl-study-progress.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ProgressControls({
  state,
  restore,
  beforeImport,
  resetModule,
}: {
  state: Progress;
  restore: (raw: string) => void;
  beforeImport: () => void;
  resetModule: () => void;
}) {
  const [message, setMessage] = useState("");
  return (
    <section className="card">
      <h3>Progress backup</h3>
      <p className="small">
        Stored only in this browser. Export before clearing browser data. Import
        replaces all local modules after validation.
      </p>
      <div className="row">
        <button className="btn" onClick={() => downloadProgress(state)}>
          Export progress
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Reset Air Law progress only? Other subjects are kept.",
              )
            ) {
              beforeImport();
              resetModule();
              setMessage("Air Law progress reset.");
            }
          }}
        >
          Reset Air Law
        </button>
        <label className="btn">
          Import progress
          <input
            className="file-input"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                setMessage("Import rejected: file exceeds 5 MB.");
                return;
              }
              if (
                !window.confirm("Replace all local progress with this backup?")
              )
                return;
              try {
                const raw = await file.text();
                beforeImport();
                restore(raw);
                setMessage("Progress imported.");
              } catch {
                setMessage(
                  "Import rejected. Invalid ATPL Study v1 backup. Existing progress was not replaced.",
                );
              }
            }}
          />
        </label>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
export function Stats({
  course,
  mod,
}: {
  course: Course;
  mod: ModuleProgress;
}) {
  const st = statistics(mod, course.items);
  return (
    <>
      <h2>Statistics (your locally stored data)</h2>
      <div className="grid">
        <Stat label="Attempted items" value={`${st.attempted} / ${st.items}`} />
        <Stat
          label="Retained after 4 due successes"
          value={String(st.retained)}
        />
        <Stat label="Accuracy — all attempts" value={percent(st.accuracy)} />
        <Stat
          label={`First-attempt accuracy (n=${st.attempted})`}
          value={percent(st.firstAccuracy)}
        />
        <Stat
          label={`Delayed reviews (due) (n=${st.delayedN})`}
          value={percent(st.delayedAccuracy)}
        />
        <Stat label="Active time" value={formatTime(st.activeMs)} />
      </div>
      <p className="small">
        Accuracy = correct / all attempts, including practice. Review-mode
        accuracy follows the legacy review history. Retained requires four due
        successes; early success and free practice do not advance the schedule.
        Session time counts visible-tab activity; each completed or interrupted
        session contributes at most 5 minutes to the total (legacy rule).
      </p>
      <div className="stats-cols">
        <section className="card">
          <h3>By chapter</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Attempted</th>
                  <th>Retained</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {course.chapters.map((ch) => {
                  const s = st.perChapter[ch.id];
                  return (
                    <tr key={ch.id}>
                      <td>{ch.titleEn ?? ch.title}</td>
                      <td>
                        {s?.attempted ?? 0} / {s?.items ?? 0}
                      </td>
                      <td>{s?.mastered ?? 0}</td>
                      <td>
                        {percent(s?.attempts ? s.correct / s.attempts : null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h3>Recurring errors</h3>
          {st.recurringErrors.length ? (
            <ul>
              {st.recurringErrors.map((x) => (
                <li key={x.id}>
                  {course.items.find((i) => i.id === x.id)?.prompt} —{" "}
                  {x.incorrectCount}
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">No mistakes recorded.</p>
          )}
        </section>
      </div>
      <section className="card">
        <h3>Recent sessions</h3>
        {st.recentSessions.length ? (
          <ul>
            {st.recentSessions.map((s) => (
              <li key={s.id}>
                {new Date(s.startedAt).toLocaleString("en-GB", {
                  timeZone: "Europe/Paris",
                })}{" "}
                (Paris) · {s.mode} · {s.results.length}/{s.itemIds.length}{" "}
                answered
                {" · "}
                {s.results.filter((r) => r.correct).length} correct ·{" "}
                {formatTime(s.activeMs)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">No completed sessions yet.</p>
        )}
      </section>
    </>
  );
}
