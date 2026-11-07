import type { Course } from "../../domain/content";
import { References, Verification } from "./References";
export function Sources({ course }: { course: Course }) {
  return (
    <>
      <h2>Sources and limitations</h2>
      <section className="card">
        <p>
          Personal theoretical study only. Not official ECQB material, not
          operational guidance, and not a substitute for current regulations and
          approved training.
        </p>
        <p>
          Content revision: {course.contentRevision}. Language:{" "}
          {course.language}. Legal verification is displayed per item and
          depends only on the content owner's audit status, never legacy labels.
        </p>
        {course.source && (
          <p>
            Manual reference: {course.source.title} ·{" "}
            {course.source.copyrightYear}. Page numbers are study references,
            not proof of current law.
          </p>
        )}
        <p>
          Excluded items remain identifiable below but are never graded or
          included in study statistics.
        </p>
      </section>
      {course.items.map((item) => (
        <details className="card" key={item.id}>
          <summary>
            {item.id} · {item.auditDecision} · {item.verificationStatus}
          </summary>
          <p>{item.prompt}</p>
          <Verification item={item} />
          <References item={item} />
        </details>
      ))}
    </>
  );
}
