> **ENGLISH TEST PREVIEW** — QA build only. Live: https://tibononox.github.io/atpl-study/ · Preview: https://tibononox.github.io/atpl-study-preview/

# ATPL Study

Maintainable React + TypeScript + Vite static app. Air Law (010) is the only enabled subject; the manifest reserves the other 12 ATPL(A) subjects. No server account or analytics. Browser-local progress only.

## Status / publication gate

**Approved English content integrated locally; not approved for publication/deployment.** Root content revision `010-en-2026-11-07-r2` retains all 40 stable item IDs: 36 verified eligible items and 4 excluded records (`010-fcl-04`, `010-ifr-01`, `010-ifr-02`, `010-ifr-03`). The 36 active items comprise 26 MCQ, 7 scenario, 2 ordering and 1 matching exercise. Seventeen meaningful item revisions request a one-time review reset without deleting history. No answer-key arrays or exercise types changed. Only the owner's approved public JSON was copied; private audit/evidence/translation-inventory files are not shipped.

English UI wording was reconciled against the owner's 123-entry legacy UI inventory where applicable to the new React surfaces. The “Verified proposition” badge requires verified/non-excluded eligibility and displays jurisdiction scope; detailed source versions and notes appear with references after answering. Verification is limited to each tested proposition, not a certification of all aviation law or operational applicability. The three IFR exclusions remain unverified because current Doc 8168 provisions were not independently obtained; the fourth exclusion is a product-scope note rather than a law objective.

Production content validation now passes. Supervisor real-browser QA and direct user approval are still required before any push or deployment.

## Local commands

Node **22.13+ (22.x)** or **24+**, npm:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
# Open http://localhost:5173/atpl-study-preview/
npm run lint
npm run typecheck
npm test
npm run validate:content
npm run validate:content -- --production # passes for the integrated English package
npm run build
npm run preview -- --port 4173 --strictPort
# Open http://localhost:4173/atpl-study-preview/
npm run format:check
```

`build` outputs only `dist/`. Vite base is `/atpl-study-preview/`. The Pages workflow installs, checks, validates English production content, builds and uploads **dist only**. A workflow file in this local branch does not change the existing Pages settings. No standalone `file://` compatibility: serve HTTP(S).

## Hierarchy

```text
public/content/010-air-law.json  Runtime-fetched question data (not imported into JS)
src/domain/
  content.ts                    Zod schema and inferred content types
  progress.ts                   v1 progress types/validation/defaults
  modules.ts                    13-subject manifest
  reviewEngine.ts               Grading, queues, spaced review, revision reconciliation
  statistics.ts                 Counts and accuracy definitions
src/storage/progressStore.ts    localStorage adapter + v1 import/export
src/hooks/                      Loading, persistence, session timing/lifecycle
src/exercises/                  Accessible choice/scenario, matching and ordering controls
src/features/
  content/                      Loader/cache, sources, chapters, verification labels
  dashboard/                    Daily session and progress summary
  session/                      Question/feedback card, due review hub
  progress/                     Statistics and backup controls
src/styles/app.css              Original desktop rail/mobile design + component styles
src/App.tsx                     App shell and navigation composition
scripts/validate-content.ts     Author-time validation (same schema as runtime)
```

Tests live beside their domains/components; synthetic test fixtures are not user progress or legal content.

## Content package contract / authoring

The content owner is responsible for all legal/source text and translations. Replace the external JSON only with their approved package, then validate and review the rendered warnings/citations. Do not translate or infer legal answers in UI code.

Root: existing `moduleId`, `moduleCode`, `moduleTitle`, `source`, `chapters`, `items`, plus `schemaVersion: 1`, `contentRevision: string`, `language: "en"`. Runtime accepts `fr` for explicitly warned local staging only. Existing extra source metadata may remain; only explicitly typed fields are consumed by the UI. Chapter IDs/item IDs must remain stable.

Each item requires:

- `id`, `chapterId`, `type`, `prompt`, `explanation`
- `contentRevision: string`
- `verificationStatus: "verified" | "flagged" | "unverified"`
- `citations: [{title, url, locator?, accessedAt?}]` using HTTP(S); verified items require at least one citation
- `reviewResetNeeded: boolean`
- `auditDecision: "retained" | "rewritten" | "excluded"`, `auditReason: string`
- `pdfPrinted` / `pdfFile`: page-number arrays (default empty); optional `jurisdiction`, `currentSource`

Exercise payloads:

- `mcq` / `scenario`: `options: [{id,text}]`, `correct: string[]` (one answer uses radios; multiple answers use checkboxes).
- `order`: same option shape, `correct` must contain every option ID exactly once.
- `match`: `pairs: [{left,right}]`; labels must be unique.

Schema also rejects duplicate IDs, unknown chapters/answer IDs, invalid citation URLs and private filesystem paths. Never include PDFs, `source.path`, credentials, or real progress in the public directory/repository. Source page references do not mean current-law verification. Legacy `status` / `currentSource` are **never** used to grant verification. Only verified, non-excluded items enter grading, queues, chapter exercise lists or study counts. Excluded/flagged/unverified records remain visible in Sources without a verified badge.

When a correction changes meaning or answer key, the owner increments the item `contentRevision` and sets `reviewResetNeeded: true`. The app preserves attempts/accuracy/history but resets retention and schedule once for that revision, storing `appliedContentRevision` in progress. Cosmetic revisions use `false`.

## Progress compatibility / scheduling

- Existing key: **`atpl-study:v1`**, existing v1 JSON export structure retained (`appId`, `schemaVersion`, `modules`, `meta`). All module data is preserved. New revision fields are additive; old UI can still consume exported v1 files.
- Validates nested imports before replacing data; rejects other apps, future schema versions and malformed nested states. Confirmation required to import. Corrupted local data is not automatically overwritten; in-memory operation still works with a warning.
- Due success: +1 day, then +3 days, then +7 days; fourth **due** success = retained, followed by +14-day maintenance. Early correct answers do not advance. Wrong scheduled answers reset to immediately due. Practice affects accuracy only, including on wrong answers.
- Guided queue: due, then missed, unseen, other unretained, fallback remaining; no duplicates. Eight guided/practice items; up to ten due/mistake reviews.
- Same legacy counters, bounded history (50/item), bounded session list (100), first-attempt and review-mode accuracy definitions. Review-mode accuracy includes recorded review-mode history, not an independently inferred delayed-retention statistic.
- Visible-tab time, 30-second tick-gap cap, interrupted sessions finalized on navigation/pagehide, idempotent completion. Legacy cumulative study time caps each session at 5 minutes; the individual session preserves its full active duration. Sudden process termination can lose the unfinalized current session time; answers are persisted immediately.

## Accessibility / offline behavior

Native radio/checkbox groups, labelled selects, keyboard up/down ordering buttons (no drag dependency), visible focus and live feedback. Legacy numeric choice shortcuts and Enter check/continue remain. Existing desktop sidebar/mobile layout and reduced-motion CSS retained. Real-browser visual/keyboard/responsive QA remains required; DOM unit tests are not a substitute.

Content requests revalidate on load (`cache: no-cache`). A successful, validated content response is cached separately from progress. Only a network failure can use that cache, with a prominent offline banner showing revision and cache date plus a reconnect/retry button. HTTP failures and invalid new packages show errors rather than hiding behind stale content. Cache storage failure does not prevent online use. The already loaded app works offline; there is **no service worker/app-shell offline-reload guarantee**.

## Dependency note

A `minimatch` override selects the patched 11.0.5+ implementation for development lint tooling to avoid the published globparts amplification advisory affecting its older transitive range. Run `npm audit` after tool updates; reevaluate/remove the override when upstream ranges are patched. Production is static assets and React/Zod only.

## Supervisor QA checklist

- Desktop rail at 1100px+, narrow mobile with no horizontal overflow.
- All four exercise types; correct/wrong feedback; Continue never records a second attempt.
- Native keyboard and 1–9 / Enter shortcuts, select controls and order move focus.
- Guided/free practice/due/retry/chapter sessions; early/practice schedule unchanged.
- Export then import a legacy v1 backup with another subject; malformed import must not replace progress.
- Storage denied/quota warning, fetch error/retry, explicit offline-cache revision banner.
- Approved English package: citations, verification warnings, excluded IDs, one-time revision resets.
- JSON request really goes to `/atpl-study-preview/content/010-air-law.json`; no bank in the JS bundle.
