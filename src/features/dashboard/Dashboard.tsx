import { isEligible, type Course, type Item } from "../../domain/content";
import type { ModuleProgress, Mode } from "../../domain/progress";
import {
  buildPath,
  dueItems,
  missedItems,
  shuffle,
} from "../../domain/reviewEngine";
import { statistics } from "../../domain/statistics";
import { Stat, formatTime, percent } from "../progress/Stats";
export function Dashboard({
  course,
  mod,
  begin,
}: {
  course: Course;
  mod: ModuleProgress;
  begin: (mode: Mode, items: Item[]) => void;
}) {
  const st = statistics(mod, course.items),
    due = dueItems(mod, course.items),
    missed = missedItems(mod, course.items),
    pool = course.items.filter(isEligible);
  return (
    <div className="home-grid">
      <div>
        <section className="card hero">
          <div className="eyebrow">Today's study</div>
          <h2 className="h">Guided session · up to 8 exercises</h2>
          <p className="small">
            About 5–8 minutes (estimate). Active recall with explained
            corrections. Due successes schedule reviews at 1, 3 and 7 days; the
            fourth due success marks an item retained, followed by 14-day
            maintenance.
          </p>
          <div className="row">
            <button
              className="btn primary lg"
              disabled={!pool.length}
              onClick={() => begin("path", buildPath(mod, pool))}
            >
              Guided session
            </button>
            <button
              className="btn"
              disabled={!pool.length}
              onClick={() => begin("practice", shuffle(pool).slice(0, 8))}
            >
              Free practice
            </button>
          </div>
          <p className="small">
            Free practice updates accuracy, never the review schedule.
          </p>
          <div className="quick">
            <div className="tile">
              <div className="t">Due reviews</div>
              <p className="small">{due.length} items due</p>
              <button
                className="btn"
                disabled={!due.length}
                onClick={() => begin("review", due.slice(0, 10))}
              >
                Review due ({due.length})
              </button>
            </div>
            <div className="tile">
              <div className="t">Retry mistakes</div>
              <p className="small">{missed.length} missed, not retained</p>
              <button
                className="btn"
                disabled={!missed.length}
                onClick={() => begin("retry", missed.slice(0, 10))}
              >
                Retry mistakes ({missed.length})
              </button>
            </div>
          </div>
        </section>
        <section className="card">
          <h3>Chapters — retained items</h3>
          <ul className="ch-list">
            {course.chapters.map((ch) => {
              const stats = st.perChapter[ch.id];
              return (
                <li key={ch.id}>
                  <span>
                    {ch.code} · {ch.titleEn ?? ch.title}
                  </span>
                  <progress
                    max={stats?.items || 1}
                    value={stats?.mastered ?? 0}
                    aria-label={`${ch.titleEn ?? ch.title}: ${stats?.mastered ?? 0} retained of ${stats?.items ?? 0}`}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div>
        <section className="card">
          <h3>Your progress</h3>
          <div className="stats2">
            <Stat label="Attempted" value={`${st.attempted} / ${st.items}`} />
            <Stat label="Retained" value={String(st.retained)} />
            <Stat
              label="Accuracy — all attempts"
              value={percent(st.accuracy)}
            />
            <Stat label="Active time" value={formatTime(st.activeMs)} />
          </div>
        </section>
        <section className="card">
          <p className="small">
            Personal study aid. Not an official ECQB question bank, complete
            exam course, or operational advice. Cadet selection is outside
            scope.
          </p>
        </section>
      </div>
    </div>
  );
}
