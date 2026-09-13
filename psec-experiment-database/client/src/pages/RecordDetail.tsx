import {
  ArrowLeft,
  Download,
  FileText,
  History,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const disciplineKeys = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
} as const;
const lifecycleKeys = {
  idea: "ideaStage",
  design: "designStage",
  in_progress: "inProgressStage",
  completed: "completedStage",
} as const;
const kindKeys = {
  reference: "referenceLabel",
  project: "projectLabel",
} as const;
const fileKindKeys = {
  photo: "photoFile",
  data: "dataFile",
  report: "reportFile",
  protocol: "protocolFile",
  other: "otherFile",
} as const;
const actionKeys = {
  created: "actionCreated",
  submitted: "actionSubmitted",
  edited: "actionEdited",
  attachment_added: "actionAttachmentAdded",
  edited_by_admin: "actionEditedByAdmin",
  review_passed: "actionReviewPassed",
  review_rejected: "actionReviewRejected",
  hidden: "actionHidden",
  deleted_by_owner: "actionDeletedByOwner",
  appended_result: "actionAppendedResult",
  approved: "actionReviewPassed",
  rejected: "actionReviewRejected",
} as const;
const roleKeys = {
  admin: "roleAdmin",
  member: "roleMember",
  system: "roleSystem",
} as const;
const outputKeys = {
  "IB Extended Essay": "ibExtendedEssay",
  "Academic competition": "academicCompetition",
  "CAS activity": "casActivity",
  "Club research": "clubResearch",
  "Unassigned / exploratory": "unassignedExploratory",
  "": "notAssignedYet",
} as const;
const fieldLabelKeys = {
  title: "experimentProjectTitle",
  abstract: "oneSentenceSummary",
  theoreticalBasis: "theoreticalBasis",
  historicalBackground: "creatorHistory",
  hypothesis: "researchHypothesis",
  procedure: "procedureDataRecord",
  materials: "materialsEnvironment",
  expectedOutput: "expectedOutput",
  lifecycle: "researchStage",
  results: "resultsConclusions",
  limitations: "limitationsReflection",
  nextQuestion: "nextQuestion",
  ethicsNotes: "ethicsConsentNotes",
  attachments: "publicAttachments",
} as const;
const display = (value?: string | null, fallback = "") =>
  value?.trim() || fallback;

export default function RecordDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/records/:slug");
  const slug = params?.slug || "";
  const timeline = trpc.records.timeline.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );

  if (timeline.isLoading)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
        {t("recordLoading")}
      </div>
    );
  if (timeline.error || !timeline.data)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24">
        <h1 className="font-display text-4xl">{t("recordUnavailable")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("recordUnavailableDescription")}
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
        >
          {t("returnToOverview")}
        </Link>
      </div>
    );

  const { record, revisions } = timeline.data;
  const displayDiscipline = (value: string) =>
    value in disciplineKeys
      ? t(disciplineKeys[value as keyof typeof disciplineKeys])
      : value;
  const displayLifecycle = (value?: string | null) =>
    value && value in lifecycleKeys
      ? t(lifecycleKeys[value as keyof typeof lifecycleKeys])
      : value || t("referenceLabel");
  const displayKind = (value: string) =>
    value in kindKeys ? t(kindKeys[value as keyof typeof kindKeys]) : value;
  const displayFileKind = (value?: string | null) =>
    value && value in fileKindKeys
      ? t(fileKindKeys[value as keyof typeof fileKindKeys])
      : value || t("fileLabel");
  const displayAction = (value: string) =>
    value in actionKeys
      ? t(actionKeys[value as keyof typeof actionKeys])
      : value.replaceAll("_", " ");
  const displayRole = (value?: string | null) =>
    value && value in roleKeys
      ? t(roleKeys[value as keyof typeof roleKeys])
      : value || "";
  const displayOutput = (value?: string | null) =>
    value != null && value in outputKeys
      ? t(outputKeys[value as keyof typeof outputKeys])
      : value || t("notSet");
  const displayField = (value: string) =>
    value in fieldLabelKeys
      ? t(fieldLabelKeys[value as keyof typeof fieldLabelKeys])
      : value.replaceAll("_", " ");
  return (
    <div className="print-evidence">
      <section className="navy-grid text-white">
        <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-14 lg:px-10 lg:pb-18 lg:pt-20">
          <Link
            href={`/library/${libraryPath(record.discipline)}?view=${record.recordKind}`}
            className="focus-ring inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/45 hover:text-signal"
          >
            <ArrowLeft size={13} /> {t("backToArchive")}
          </Link>
          <div className="mt-10 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[.14em]">
            <span className="bg-white/10 px-2 py-1">
              {displayKind(record.recordKind)}
            </span>
            {record.lifecycle && (
              <span className="bg-[#9dc4f4]/15 px-2 py-1 text-[#d3e5fd]">
                {displayLifecycle(record.lifecycle)}
              </span>
            )}
            <span className="bg-white/10 px-2 py-1">
              v{record.revisionCount}
            </span>
          </div>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-.06em]">
            {record.title}
          </h1>
          <p className="mt-6 max-w-3xl text-[16px] leading-7 text-white/65">
            {display(record.abstract, t("recordFallbackSummary"))}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/records/${record.slug}/evidence`}
              className="focus-ring inline-flex items-center gap-2 border border-[#9dc4f4] bg-[#0b4ea2] px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
            >
              <Printer size={14} /> {t("evidencePack")}
            </Link>
            <span className="inline-flex items-center gap-2 border border-white/20 px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/65">
              <ShieldCheck size={14} className="text-[#a9d3a2]" />{" "}
              {t("published")}{" "}
              {record.publishedAt
                ? new Date(record.publishedAt).toLocaleDateString()
                : t("recordLabel")}
            </span>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-7">
            <ContentBlock
              title={t("theoreticalBasis")}
              value={record.theoreticalBasis}
              fallback={t("notRecordedEntry")}
            />
            <ContentBlock
              title={t("creatorHistory")}
              value={record.historicalBackground}
              fallback={t("notRecordedEntry")}
            />
            <ContentBlock
              title={t("researchHypothesis")}
              value={record.hypothesis}
              fallback={t("notRecordedEntry")}
            />
            <ContentBlock
              title={t("procedureDataRecord")}
              value={record.procedure}
              fallback={t("notRecordedEntry")}
            />
            <ContentBlock
              title={t("materialsEnvironment")}
              value={record.materials}
              fallback={t("notRecordedEntry")}
            />
            {record.results && (
              <section className="border border-[#b8ccb5] bg-[#edf5eb] p-6 md:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[.17em] text-[#3f7b44]">
                  {t("resultsConclusions")}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">
                  {record.results}
                </p>
                {record.limitations && (
                  <div className="mt-6 border-t border-[#bfd0bc] pt-5">
                    <div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#3f7b44]">
                      {t("limitationsReflection")}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {record.limitations}
                    </p>
                  </div>
                )}
                {record.nextQuestion && (
                  <div className="mt-6 border-t border-[#bfd0bc] pt-5">
                    <div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#3f7b44]">
                      {t("nextResearchQuestion")}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {record.nextQuestion}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
          <aside className="space-y-7">
            <section className="border border-border bg-[#f7f5ef] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
                {t("recordCard")}
              </div>
              <dl className="mt-5 space-y-4 text-sm">
                <Meta
                  label={t("disciplineLabel")}
                  value={displayDiscipline(record.discipline)}
                />
                <Meta
                  label={t("researchStage")}
                  value={displayLifecycle(record.lifecycle)}
                />
                <Meta
                  label={t("author")}
                  value={record.authorName || t("psecMember")}
                />
                <Meta
                  label={t("expectedOutput")}
                  value={displayOutput(record.expectedOutput)}
                />
              </dl>
            </section>
            <section className="border border-border bg-card p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-primary">
                <Download size={14} /> {t("publicAttachments")}
              </div>
              {record.attachments.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t("noPublicAttachments")}
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {record.attachments.map(file => (
                    <a
                      key={file.id}
                      href={file.url}
                      className="focus-ring flex items-center gap-3 border border-border bg-white p-3 text-sm text-primary hover:border-primary"
                    >
                      <FileText size={15} />
                      <span className="min-w-0 flex-1 truncate">
                        {file.fileName}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                        {displayFileKind(file.kind)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
        <section className="mt-10 border-t border-border pt-8">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.17em] text-primary">
            <History size={14} /> {t("recordTimeline")}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {revisions.map(revision => (
              <article
                key={revision.id}
                className="border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3 font-mono text-[9px] uppercase tracking-[.13em] text-primary">
                  <span>
                    v{revision.revisionNo} · {displayAction(revision.action)}
                  </span>
                  <span>
                    {new Date(revision.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-ink">
                  {revision.summary}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {revision.editorName || t("psecMember")} ·{" "}
                  {displayRole(revision.editorRole)}
                </p>
                {revision.changedFields.length > 0 && (
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                    {t("changed")} {revision.changedFields.map(displayField).join(", ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ContentBlock({
  title,
  value,
  fallback,
}: {
  title: string;
  value?: string | null;
  fallback?: string;
}) {
  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <div className="font-mono text-[10px] uppercase tracking-[.17em] text-primary">
        {title}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">
        {display(value, fallback)}
      </p>
    </section>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
function libraryPath(discipline: string) {
  return (
    (
      {
        "Social Psychology": "social-psychology",
        "Behavioral Economics": "behavioral-economics",
        Sociology: "sociology",
        "Moral & Political Philosophy": "moral-political-philosophy",
      } as Record<string, string>
    )[discipline] || "social-psychology"
  );
}
