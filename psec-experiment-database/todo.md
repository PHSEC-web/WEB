# PSEC Refactor Checklist

## Completed stages

- [x] **S0 — Backup and secret hygiene.** A timestamped external JSON backup was created outside the repository, and tracked files were checked for credentials.
- [x] **S1 — Safe template cleanup.** Confirmed-unused template code, screens, components, and dependencies were removed only after import-closure checks and production validation.
- [x] **S2 — Unified data foundation.** Additive `records`, `recordRevisions`, and `attachments` tables were created; legacy data was migrated without deleting legacy tables; migrations were verified against the preserved backup.
- [x] **S3 — Unified append-only write path.** New project submissions, administrator edits, approvals, rejections, and record hiding use `server/recordStore.ts`. Each operation appends an immutable revision with an actor, action, summary, changed-field list, and complete snapshot.
- [x] **S4 — Focused public archive and review UX.** Each discipline exposes **Academic references** and **Club projects** views. Club projects support lifecycle filters, and the main submission form has three required fields.
- [x] **S5 — Member research lifecycle and evidence.** School email authentication binds new records to `ownerOpenId`; **My Records** lets owners track their records and append completed results, reflections, next questions, ethics notes, reports, images, and data. Public records now have shareable details, immutable timelines, visibility-aware public attachments, and printable evidence packs.
- [x] **S6 — Release acceptance and operations handover.** Regression tests, a production build, lifecycle verification, attachment-access checks, migration integrity audit, operations guidance, and a release report were completed.

## S5–S6 validation completed

- [x] Anonymous create and My Records routes return `UNAUTHORIZED` before database access.
- [x] An isolated lifecycle test exercised create → publish → append result → evidence pack, producing four continuous revisions and cleaning its test record afterward.
- [x] Anonymous public-file access returned HTTP 307; an internal `members` data attachment returned HTTP 404.
- [x] Public record details, the printable evidence pack, My Records, and the member submission page received browser visual QA.
- [x] `pnpm test` passed: 3 test files and 5 tests.
- [x] `pnpm check` and `pnpm build` passed.
- [x] The records migration audit found no revision-number gaps. Legacy tables remain preserved for rollback and inspection.

## Operating notes

The public archive reads persisted, published unified records only. The existing legacy `submissions`, `experiments`, and `submissionHistory` tables remain intentionally preserved and read-only for rollback and historical inspection; they should not be deleted without a separately approved archival decision.

See `docs/PSEC_OPERATIONS_GUIDE.md` for member and administrator workflows, and `docs/S6_RELEASE_REPORT.md` for verified migration counts, release checks, retained hidden test data, known limitations, and rollback steps.
