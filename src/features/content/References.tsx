import { isEligible, type Item } from "../../domain/content";
export function Verification({ item }: { item: Item }) {
  if (item.auditDecision === "excluded")
    return (
      <div className="banner" role="note">
        Excluded from scored study — {item.auditReason}{" "}
        {item.verificationStatus !== "verified"
          ? "Unverified — not legally validated."
          : ""}
      </div>
    );
  return isEligible(item) ? (
    <div className="verification">
      <span className="chip ok">Verified proposition</span>
      <p className="small">
        Jurisdiction / source scope: {item.jurisdiction ?? "See cited sources"}.
        Verification covers only the proposition tested, not every law, national
        variation or operational application.
      </p>
    </div>
  ) : (
    <div className="banner" role="note">
      {item.verificationStatus === "flagged"
        ? "Flagged — content requires review."
        : "Unverified — not legally validated."}{" "}
      Not eligible for scored study. Do not rely on this item for operational
      decisions. {item.auditReason}
    </div>
  );
}
export function References({ item }: { item: Item }) {
  return (
    <details className="refs">
      <summary>References and sources</summary>
      <p className="small">
        Item {item.id} · revision {item.contentRevision} ·{" "}
        {item.verificationStatus}
      </p>
      {item.citations.length ? (
        <ul>
          {item.citations.map((c, i) => (
            <li key={i}>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.title}
                <span className="sr-only"> (opens an external website)</span>
              </a>
              {c.locator && ` — ${c.locator}`}
              {c.accessedAt && ` (checked ${c.accessedAt})`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">No audited citations supplied.</p>
      )}
      {item.currentSource && (
        <>
          <p className="small">
            Source edition: {item.currentSource.date ?? "See citation"}
          </p>
          {item.currentSource.note && (
            <p className="small">Source note: {item.currentSource.note}</p>
          )}
        </>
      )}
      <p className="small">
        Course printed p. {item.pdfPrinted.join(", ") || "—"} · PDF file p.{" "}
        {item.pdfFile.join(", ") || "—"}. Page references are not evidence of
        current law.
      </p>
      <p className="small">External links — internet access required.</p>
    </details>
  );
}
