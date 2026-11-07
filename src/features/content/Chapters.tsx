import { useState } from "react";
import { isEligible, type Course, type Item } from "../../domain/content";
import { shuffle } from "../../domain/reviewEngine";
export function Chapters({
  course,
  practice,
}: {
  course: Course;
  practice: (items: Item[]) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <>
      <h2>Chapters</h2>
      <label htmlFor="chapter-search" className="sr-only">
        Filter chapters
      </label>
      <input
        id="chapter-search"
        className="search"
        placeholder="Filter chapters"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="ch-grid">
        {course.chapters
          .filter((c) =>
            `${c.titleEn} ${c.title}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((ch) => {
            const items = course.items.filter(
              (i) => i.chapterId === ch.id && isEligible(i),
            );
            return (
              <section className="card" key={ch.id}>
                <span className="eyebrow">Chapter {ch.code}</span>
                <h3>{ch.titleEn ?? ch.title}</h3>
                <p className="small">{items.length} available exercises</p>
                <button
                  className="btn"
                  disabled={!items.length}
                  onClick={() => practice(shuffle(items).slice(0, 8))}
                >
                  Practice chapter
                </button>
              </section>
            );
          })}
      </div>
    </>
  );
}
