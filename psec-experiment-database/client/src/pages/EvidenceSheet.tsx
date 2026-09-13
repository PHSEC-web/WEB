import { ArrowLeft, Download, Printer } from "lucide-react";
import { Link, useRoute } from "wouter";
import { LoadingState } from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const text = (value?: string | null, fallback = "") =>
  value?.trim() || fallback;
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
const outputKeys = {
  "IB Extended Essay": "ibExtendedEssay",
  "Academic competition": "academicCompetition",
  "CAS activity": "casActivity",
  "Club research": "clubResearch",
  "Unassigned / exploratory": "unassignedExploratory",
  "": "notAssignedYet",
} as const;

export default function EvidenceSheet() {
  const { t } = useLanguage();
  const [, params] = useRoute("/records/:slug/evidence");
  const slug = params?.slug || "";
  const evidence = trpc.records.evidence.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  if (evidence.isLoading)
    return (
      <div className="page-evidence">
        <div className="page-container py-16 lg:py-24">
          <LoadingState label={t("preparingEvidencePack")} />
        </div>
      </div>
    );
  if (evidence.error || !evidence.data)
    return (
      <div className="page-evidence">
        <div className="page-container py-16 lg:py-24">
          <div className="surface-card mx-auto max-w-2xl px-6 py-12 text-center md:px-12 md:py-16">
            <div className="section-kicker">PSEC / {t("evidencePack")}</div>
            <h1 className="mt-3 font-display text-3xl tracking-[-.02em] text-ink">
              {t("evidencePackUnavailable")}
            </h1>
            <Link
              href="/"
              className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft size={15} aria-hidden="true" /> {t("returnToOverview")}
            </Link>
          </div>
        </div>
      </div>
    );
  const { record, revisions, attachments, generatedAt, siteName } =
    evidence.data;
  const displayDiscipline = (value: string) =>
    value in disciplineKeys
      ? t(disciplineKeys[value as keyof typeof disciplineKeys])
      : value;
  const displayLifecycle = (value?: string | null) =>
    value && value in lifecycleKeys
      ? t(lifecycleKeys[value as keyof typeof lifecycleKeys])
      : value || t("referenceLabel");
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
    <div className="evidence-sheet page-evidence py-8 print:py-0">
      <div className="mx-auto max-w-[210mm] bg-white px-6 py-8 shadow-[var(--shadow-md)] md:px-12 md:py-12 print:max-w-none print:shadow-none">
        <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link
            href={`/records/${record.slug}`}
            className="focus-ring inline-flex items-center gap-2 rounded-full text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ArrowLeft size={15} aria-hidden="true" /> {t("backToRecord")}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[.98]"
          >
            <Printer size={15} aria-hidden="true" /> {t("printSavePdf")}
          </button>
        </div>
        <header className="border-b-2 border-ink pb-7">
          <div className="section-kicker">
            {siteName} / {t("evidencePack")}
          </div>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-[-.03em] text-ink md:text-5xl">
            {record.title}
          </h1>
          <p className="mt-4 content-measure text-sm leading-7 text-muted-foreground">
            {text(record.abstract, t("notRecordedEntry"))}
          </p>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
            <Meta
              label={t("disciplineLabel")}
              value={displayDiscipline(record.discipline)}
            />
            <Meta
              label={t("researchStage")}
              value={displayLifecycle(record.lifecycle)}
            />
            <Meta
              label={t("generated")}
              value={new Date(generatedAt).toLocaleString()}
            />
          </div>
        </header>
        <Section title={t("researchRecord")}>
          <Field
            label={t("theoreticalBasis")}
            value={record.theoreticalBasis}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("creatorHistory")}
            value={record.historicalBackground}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("researchHypothesis")}
            value={record.hypothesis}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("procedureDataRecord")}
            value={record.procedure}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("materialsEnvironment")}
            value={record.materials}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("expectedOutput")}
            value={displayOutput(record.expectedOutput)}
            fallback={t("notSet")}
          />
        </Section>
        <Section title={t("resultsReflection")}>
          <Field
            label={t("resultsConclusions")}
            value={record.results}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("limitationsReflection")}
            value={record.limitations}
            fallback={t("notRecordedEntry")}
          />
          <Field
            label={t("nextQuestion")}
            value={record.nextQuestion}
            fallback={t("notRecordedEntry")}
          />
        </Section>
        <Section title={t("ethicsStatement")}>
          <Field
            label={t("ethicsConsentNotes")}
            value={record.ethicsNotes}
            fallback={t("notRecordedEntry")}
          />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {t("ethicsStatementText")}
          </p>
        </Section>
        <Section title={t("versionTimeline")}>
          <div className="mt-5 space-y-3">
            {revisions.map(revision => (
              <div
                key={revision.id}
                className="break-inside-avoid surface-card p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="meta-label">
                    v{revision.revisionNo} / {displayAction(revision.action)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(revision.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-ink">
                  {revision.summary}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {revision.editorName || t("psecMember")} ·{" "}
                  {displayRole(revision.editorRole)}
                </p>
                {revision.changedFields.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("changed")}{" "}
                    {revision.changedFields.map(displayField).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("publicAttachmentManifest")}>
          <div className="mt-5 space-y-2">
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noPublicAttachmentsShort")}
              </p>
            ) : (
              attachments.map(file => (
                <a
                  key={file.id}
                  href={file.url}
                  className="no-print focus-ring surface-card flex items-center gap-3 p-3 text-sm text-primary"
                >
                  <Download size={15} aria-hidden="true" />
                  <span className="flex-1">{file.fileName}</span>
                  <span className="meta-label text-muted-foreground">
                    {displayFileKind(file.kind)}
                  </span>
                </a>
              ))
            )}
          </div>
        </Section>
        <footer className="mt-10 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
          PSEC · {record.slug} · {t("generatedFooter")}{" "}
          {new Date(generatedAt).toISOString()}
        </footer>
      </div>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 break-inside-avoid">
      <h2 className="border-b border-border pb-3 font-display text-2xl tracking-[-.02em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  fallback,
}: {
  label: string;
  value?: string | null;
  fallback?: string;
}) {
  return (
    <div className="mt-5">
      <div className="meta-label">{label}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink">
        {text(value, fallback)}
      </p>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="meta-label text-muted-foreground">{label}</div>
      <div className="mt-1 text-ink">{value}</div>
    </div>
  );
}
