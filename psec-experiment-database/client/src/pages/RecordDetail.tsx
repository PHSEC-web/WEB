import { ArrowLeft, Download, FileText, History, Printer, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { EmptyState, LoadingState } from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const disciplineKeys = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
} as const;
const lifecycleKeys = { idea: "ideaStage", design: "designStage", in_progress: "inProgressStage", completed: "completedStage" } as const;
const kindKeys = { reference: "referenceLabel", project: "projectLabel" } as const;
const fileKindKeys = { photo: "photoFile", data: "dataFile", report: "reportFile", protocol: "protocolFile", other: "otherFile" } as const;
const actionKeys = { created: "actionCreated", submitted: "actionSubmitted", edited: "actionEdited", attachment_added: "actionAttachmentAdded", edited_by_admin: "actionEditedByAdmin", review_passed: "actionReviewPassed", review_rejected: "actionReviewRejected", hidden: "actionHidden", deleted_by_owner: "actionDeletedByOwner", appended_result: "actionAppendedResult", approved: "actionReviewPassed", rejected: "actionReviewRejected" } as const;
const roleKeys = { admin: "roleAdmin", member: "roleMember", system: "roleSystem" } as const;
const outputKeys = { "IB Extended Essay": "ibExtendedEssay", "Academic competition": "academicCompetition", "CAS activity": "casActivity", "Club research": "clubResearch", "Unassigned / exploratory": "unassignedExploratory", "": "notAssignedYet" } as const;
const fieldLabelKeys = { title: "experimentProjectTitle", abstract: "oneSentenceSummary", theoreticalBasis: "theoreticalBasis", historicalBackground: "creatorHistory", hypothesis: "researchHypothesis", procedure: "procedureDataRecord", materials: "materialsEnvironment", expectedOutput: "expectedOutput", lifecycle: "researchStage", results: "resultsConclusions", limitations: "limitationsReflection", nextQuestion: "nextQuestion", ethicsNotes: "ethicsConsentNotes", attachments: "publicAttachments" } as const;

const display = (value?: string | null, fallback = "") => value?.trim() || fallback;

export default function RecordDetail() {
  const { language, t } = useLanguage();
  const [, params] = useRoute("/records/:slug");
  const slug = params?.slug || "";
  const timeline = trpc.records.timeline.useQuery({ slug }, { enabled: Boolean(slug) });

  if (timeline.isLoading) return <div className="page-detail px-5 py-24"><div className="page-container"><LoadingState label={t("recordLoading")} /></div></div>;
  if (timeline.error || !timeline.data) return <div className="page-detail px-5 py-24"><div className="page-container max-w-2xl"><h1 className="font-display text-4xl">{t("recordUnavailable")}</h1><p className="mt-4 text-base leading-7 text-muted-foreground">{t("recordUnavailableDescription")}</p><Link href="/" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"><ArrowLeft size={15} /> {t("returnToOverview")}</Link></div></div>;

  const { record, revisions } = timeline.data;
  const displayDiscipline = (value: string) => value in disciplineKeys ? t(disciplineKeys[value as keyof typeof disciplineKeys]) : value;
  const displayLifecycle = (value?: string | null) => value && value in lifecycleKeys ? t(lifecycleKeys[value as keyof typeof lifecycleKeys]) : value || t("referenceLabel");
  const displayKind = (value: string) => value in kindKeys ? t(kindKeys[value as keyof typeof kindKeys]) : value;
  const displayFileKind = (value?: string | null) => value && value in fileKindKeys ? t(fileKindKeys[value as keyof typeof fileKindKeys]) : value || t("fileLabel");
  const displayAction = (value: string) => value in actionKeys ? t(actionKeys[value as keyof typeof actionKeys]) : value.replaceAll("_", " ");
  const displayRole = (value?: string | null) => value && value in roleKeys ? t(roleKeys[value as keyof typeof roleKeys]) : value || "";
  const displayOutput = (value?: string | null) => value != null && value in outputKeys ? t(outputKeys[value as keyof typeof outputKeys]) : value || t("notSet");
  const displayField = (value: string) => value in fieldLabelKeys ? t(fieldLabelKeys[value as keyof typeof fieldLabelKeys]) : value.replaceAll("_", " ");

  return (
    <div className="page-detail">
      <section className="page-hero navy-grid text-white">
        <div className="page-container">
          <Link href={"/library/" + libraryPath(record.discipline) + "?view=" + record.recordKind} className="focus-ring inline-flex items-center gap-2 text-sm text-white/62 transition-colors hover:text-signal"><ArrowLeft size={14} /> {t("backToArchive")}</Link>
          <div className="mt-8 flex flex-wrap gap-2 text-xs text-white/72">
            <span className="rounded-full bg-white/12 px-3 py-1.5">{displayKind(record.recordKind)}</span>
            {record.lifecycle && <span className="rounded-full bg-[#9dc4f4]/16 px-3 py-1.5 text-[#d3e5fd]">{displayLifecycle(record.lifecycle)}</span>}
            <span className="rounded-full bg-white/12 px-3 py-1.5">v{record.revisionCount}</span>
          </div>
          <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.6rem,6vw,5.8rem)] leading-[1.06] tracking-[-.04em]">{record.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/68">{display(record.abstract, t("recordFallbackSummary"))}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={"/records/" + record.slug + "/evidence"} className="focus-ring inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 text-sm font-semibold text-ink"><Printer size={15} /> {t("evidencePack")}</Link>
            {record.lifecycle === "completed" && <Link href="/submit-evidence" className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/8 px-5 py-3 text-sm text-white/88 hover:bg-white/14">{t("addEvidence")}</Link>}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-3 text-sm text-white/68"><ShieldCheck size={15} className="text-[#a9d3a2]" /> {t("published")} · {record.publishedAt ? formatDate(record.publishedAt, language) : t("recordLabel")}</span>
          </div>
        </div>
      </section>

      <div className="page-container py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.7fr)]">
          <div className="space-y-5">
            <ContentBlock title={t("theoreticalBasis")} value={record.theoreticalBasis} fallback={t("notRecordedEntry")} />
            <ContentBlock title={t("creatorHistory")} value={record.historicalBackground} fallback={t("notRecordedEntry")} />
            <ContentBlock title={t("researchHypothesis")} value={record.hypothesis} fallback={t("notRecordedEntry")} />
            <ContentBlock title={t("procedureDataRecord")} value={record.procedure} fallback={t("notRecordedEntry")} />
            <ContentBlock title={t("materialsEnvironment")} value={record.materials} fallback={t("notRecordedEntry")} />
            {record.results && <section className="rounded-[var(--radius-card)] border border-[#b8d6bd] bg-[var(--success-surface)] p-6 md:p-8"><h2 className="font-display text-xl text-[#315f3a]">{t("resultsConclusions")}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">{record.results}</p>{record.limitations && <div className="mt-6 border-t border-[#bfd0bc] pt-5"><h3 className="text-sm font-semibold text-[#315f3a]">{t("limitationsReflection")}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.limitations}</p></div>}{record.nextQuestion && <div className="mt-6 border-t border-[#bfd0bc] pt-5"><h3 className="text-sm font-semibold text-[#315f3a]">{t("nextResearchQuestion")}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.nextQuestion}</p></div>}</section>}
          </div>
          <aside className="space-y-5">
            <section className="surface-card p-5"><h2 className="section-kicker">{t("recordCard")}</h2><dl className="mt-5 space-y-4 text-sm"><Meta label={t("disciplineLabel")} value={displayDiscipline(record.discipline)} /><Meta label={t("researchStage")} value={displayLifecycle(record.lifecycle)} /><Meta label={t("author")} value={record.authorName || t("psecMember")} /><Meta label={t("expectedOutput")} value={displayOutput(record.expectedOutput)} /></dl></section>
            <section className="surface-card p-5"><h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Download size={15} /> {t("publicAttachments")}</h2>{record.attachments.length === 0 ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("noPublicAttachments")}</p> : <div className="mt-4 space-y-2">{record.attachments.map(file => <a key={file.id} href={file.url} className="focus-ring flex items-center gap-3 rounded-xl border border-border bg-white/72 p-3 text-sm text-primary hover:border-primary"><FileText size={15} /><span className="min-w-0 flex-1 truncate">{file.fileName}</span><span className="text-xs text-muted-foreground">{displayFileKind(file.kind)}</span></a>)}</div>}</section>
          </aside>
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><History size={15} /> {t("recordTimeline")}</div>
          {revisions.length === 0 ? <div className="mt-5"><EmptyState title={t("recordTimeline")} description={t("notRecordedEntry")} icon={<History size={20} />} /></div> : <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{revisions.map(revision => <article key={revision.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3 text-xs text-primary"><span>v{revision.revisionNo} · {displayAction(revision.action)}</span><span className="text-muted-foreground">{formatDate(revision.createdAt, language)}</span></div><p className="mt-3 text-sm font-medium text-ink">{revision.summary}</p><p className="mt-2 text-xs text-muted-foreground">{revision.editorName || t("psecMember")} · {displayRole(revision.editorRole)}</p>{revision.changedFields.length > 0 && <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("changed")} {revision.changedFields.map(displayField).join(", ")}</p>}</article>)}</div>}
        </section>
      </div>
    </div>
  );
}

function ContentBlock({ title, value, fallback }: { title: string; value?: string | null; fallback?: string }) {
  return <section className="surface-card p-6 md:p-8"><h2 className="font-display text-xl">{title}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">{display(value, fallback)}</p></section>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-ink">{value}</dd></div>;
}

function libraryPath(discipline: string) {
  return ({ "Social Psychology": "social-psychology", "Behavioral Economics": "behavioral-economics", Sociology: "sociology", "Moral & Political Philosophy": "moral-political-philosophy" } as Record<string, string>)[discipline] || "social-psychology";
}
