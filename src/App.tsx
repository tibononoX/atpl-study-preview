import { useState } from "react";
import type { Course } from "./domain/content";
import { modules } from "./domain/modules";
import { emptyModule, type Mode } from "./domain/progress";
import { useCourse } from "./hooks/useCourse";
import { useProgress } from "./hooks/useProgress";
import { useStudySession } from "./hooks/useStudySession";
import { Dashboard } from "./features/dashboard/Dashboard";
import {
  Stats,
  ProgressControls,
  downloadProgress,
  formatTime,
} from "./features/progress/Stats";
import { Chapters } from "./features/content/Chapters";
import { Sources } from "./features/content/Sources";
import { QuestionCard } from "./features/session/QuestionCard";
import { ReviewHub } from "./features/session/ReviewHub";
import type { ContentResult } from "./features/content/contentLoader";
const navigation = [
  ["home", "Home"],
  ["session", "Session"],
  ["review", "Due for review"],
  ["stats", "Statistics"],
  ["chapters", "Chapters"],
  ["sources", "Sources"],
] as const;
type View = (typeof navigation)[number][0];
export default function App() {
  const { result, error, retry } = useCourse();
  return (
    <>
      {result ? (
        <Study course={result.course} result={result} retry={retry} />
      ) : (
        <main className="app">
          <section className="card">
            <h1>ATPL Study</h1>
            {error ? (
              <>
                <p role="alert">Unable to load Air Law content: {error}</p>
                <button className="btn primary" onClick={retry}>
                  Retry loading
                </button>
              </>
            ) : (
              <p role="status">Loading Air Law content…</p>
            )}
          </section>
        </main>
      )}
    </>
  );
}
function Study({
  course,
  result,
  retry,
}: {
  course: Course;
  result: ContentResult;
  retry: () => void;
}) {
  const { state, update, restore, warning } = useProgress(course),
    { session, elapsed, begin, answer, next, finish } = useStudySession(
      course.moduleId,
      update,
    );
  const [view, setView] = useState<View>("home");
  const mod = state.modules[course.moduleId] ?? emptyModule();
  function navigate(target: View) {
    finish();
    setView(target);
  }
  function start(mode: Mode, items: Course["items"]) {
    begin(mode, items);
    setView(mode === "review" || mode === "retry" ? "review" : "session");
  }
  const item = session?.queue[session.index];
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="shell">
        <header className="top">
          <div className="brand">
            <span className="test-preview-badge" role="note">
              TEST PREVIEW
            </span>
            <div className="logo" aria-hidden="true">
              010
            </div>
            <div>
              <h1>Air Law — Active recall</h1>
              <p className="sub">
                EASA ATPL(A) · Module 010 · Practice and spaced review
              </p>
            </div>
          </div>
          <nav className="nav" aria-label="Main navigation">
            {navigation.map(([id, label]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <details className="module-picker">
            <summary>ATPL subjects</summary>
            <ul>
              {modules.map((m) => (
                <li key={m.id}>
                  {m.id} · {m.title}
                  {!m.enabled ? " — not available" : ""}
                </li>
              ))}
            </ul>
          </details>
          <p className="rail-foot">
            Personal study. Check each item's verification status. No official
            ECQB questions.
          </p>
        </header>
        <main className="main" id="main-content" tabIndex={-1}>
          {warning && (
            <div className="banner" role="alert">
              {warning}{" "}
              <button className="btn" onClick={() => downloadProgress(state)}>
                Export backup
              </button>
            </div>
          )}
          {result.offline && (
            <div className="banner" role="status">
              Offline cached content · revision {course.contentRevision} · saved{" "}
              {new Date(result.cachedAt!).toLocaleString("en-GB", {
                timeZone: "Europe/Paris",
              })}{" "}
              (Paris). It may be outdated.{" "}
              <button
                className="btn"
                onClick={() => {
                  finish();
                  retry();
                }}
              >
                Reconnect and check for updates
              </button>
            </div>
          )}
          {course.language !== "en" && (
            <div className="banner" role="note">
              UNVALIDATED STAGING CONTENT — original French question text
              retained pending the content owner's English audited package. This
              local build is not ready for publication.
            </div>
          )}
          {item && session ? (
            <>
              <div className="play">
                <div className="qcol">
                  <QuestionCard
                    key={`${session.id}-${item.id}`}
                    item={item}
                    onAnswer={answer}
                    last={session.index === session.queue.length - 1}
                    onContinue={() => {
                      const last = session.index === session.queue.length - 1;
                      next();
                      if (last) setView("stats");
                    }}
                  />
                </div>
                <aside className="aside" aria-label="Session context">
                  <section className="card">
                    <span className="eyebrow">
                      {session.mode === "practice"
                        ? "Free practice"
                        : session.mode === "path"
                          ? "Guided session"
                          : session.mode === "retry"
                            ? "Retry mistakes"
                            : "Due reviews"}
                    </span>
                    <h3>
                      Exercise {session.index + 1} / {session.queue.length}
                    </h3>
                    <progress
                      max={session.queue.length}
                      value={session.index}
                      aria-label="Session progress"
                    />
                    <p className="small">
                      {course.chapters.find((c) => c.id === item.chapterId)
                        ?.titleEn ?? item.chapterId}
                    </p>
                    {session.mode === "practice" && (
                      <p className="small">
                        Practice does not change your review schedule.
                      </p>
                    )}
                  </section>
                  <section className="card hide-sm">
                    <h3>Study tip</h3>
                    <p className="small">
                      Read the explanation before continuing. All exercises work
                      with a keyboard; use Tab, arrow keys and Space or Enter.
                    </p>
                  </section>
                </aside>
              </div>
              <div className="footerbar">
                <div className="inner">
                  <span className="small">
                    Exercise {session.index + 1}/{session.queue.length} · active{" "}
                    {formatTime(elapsed)}
                  </span>
                  <button
                    className="btn"
                    onClick={() => {
                      finish();
                      setView("stats");
                    }}
                  >
                    End session
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {(view === "home" || view === "session") && (
                <Dashboard course={course} mod={mod} begin={start} />
              )}
              {view === "review" && (
                <ReviewHub mod={mod} items={course.items} begin={start} />
              )}
              {view === "stats" && <Stats course={course} mod={mod} />}
              {view === "chapters" && (
                <Chapters
                  course={course}
                  practice={(items) => start("practice", items)}
                />
              )}
              {view === "sources" && <Sources course={course} />}
              {(view === "stats" || view === "sources") && (
                <ProgressControls
                  state={state}
                  restore={restore}
                  resetModule={() =>
                    update((draft) => {
                      draft.modules[course.moduleId] = emptyModule();
                    })
                  }
                  beforeImport={finish}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
