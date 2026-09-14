import { ArrowUpRight, BookOpen, ChevronDown, Database, Download, FileText, Filter, History, Image as ImageIcon, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { type Discipline } from "@shared/classicExperiments";
import { EmptyState, LoadingState, PageHero, SectionHeader, StatusBanner } from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate as displayDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type LibraryProps = { discipline: Discipline };

const disciplineRoutes: Record<Discipline, string> = {
  "Social Psychology": "/library/social-psychology",
  "Behavioral Economics": "/library/behavioral-economics",
  Sociology: "/library/sociology",
  "Moral & Political Philosophy": "/library/moral-political-philosophy",
};

const metadata: Record<Discipline, { number: string; eyebrowKey: "librarySocialEyebrow" | "libraryBehavioralEyebrow" | "librarySociologyEyebrow" | "libraryPhilosophyEyebrow"; descriptionKey: "librarySocialDescription" | "libraryBehavioralDescription" | "librarySociologyDescription" | "libraryPhilosophyDescription"; accent: string }> = {
  "Social Psychology": { number: "01", eyebrowKey: "librarySocialEyebrow", descriptionKey: "librarySocialDescription", accent: "#dce8f5" },
  "Behavioral Economics": { number: "02", eyebrowKey: "libraryBehavioralEyebrow", descriptionKey: "libraryBehavioralDescription", accent: "#f3ebd1" },
  Sociology: { number: "03", eyebrowKey: "librarySociologyEyebrow", descriptionKey: "librarySociologyDescription", accent: "#e5eee4" },
  "Moral & Political Philosophy": { number: "04", eyebrowKey: "libraryPhilosophyEyebrow", descriptionKey: "libraryPhilosophyDescription", accent: "#eee3ef" },
};

const disciplineKeys: Record<Discipline, "socialPsychology" | "behavioralEconomics" | "sociology" | "philosophy"> = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
};

const libraryViews = [{ id: "reference", key: "academicReferences" }, { id: "project", key: "clubProjects" }] as const;
const lifecycleOptions = [{ id: "", key: "allStages" }, { id: "idea", key: "ideaStage" }, { id: "design", key: "designStage" }, { id: "in_progress", key: "inProgressStage" }, { id: "completed", key: "completedStage" }] as const;
const lifecycleKeys = { idea: "ideaStage", design: "designStage", in_progress: "inProgressStage", completed: "completedStage" } as const;
const fileKindKeys = { photo: "photoFile", data: "dataFile", report: "reportFile", protocol: "protocolFile", other: "otherFile" } as const;

function updateQuery(next: { view: "reference" | "project"; stage: string; query: string }) {
  const params = new URLSearchParams(window.location.search);
  params.set("view", next.view);
  next.stage ? params.set("stage", next.stage) : params.delete("stage");
  next.query ? params.set("q", next.query) : params.delete("q");
  window.history.replaceState(null, "", window.location.pathname + "?" + params.toString() + window.location.hash);
}

export default function Library({ discipline }: LibraryProps) {
  const { language, t } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const [activeView, setActiveView] = useState<"reference" | "project">(params.get("view") === "project" ? "project" : "reference");
  const [lifecycleFilter, setLifecycleFilter] = useState<"" | "idea" | "design" | "in_progress" | "completed">((params.get("stage") as "" | "idea" | "design" | "in_progress" | "completed") || "");
  const [query, setQuery] = useState(params.get("q") || "");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading, error } = trpc.experiments.list.useQuery();
  const current = metadata[discipline];
  const expandedAttachmentSlug = activeView === "project" ? expanded : null;
  const attachmentInput = useMemo(() => ({ slug: expandedAttachmentSlug || "" }), [expandedAttachmentSlug]);
  const attachments = trpc.experiments.attachments.useQuery(attachmentInput, { enabled: Boolean(expandedAttachmentSlug) });
  const executionRecords = trpc.experiments.executionRecords.useQuery(attachmentInput, { enabled: Boolean(expandedAttachmentSlug) });
  const records = useMemo(() => (data ?? []).filter(item => {
    const searchable = [item.title, item.abstract, item.theoreticalBasis, item.historicalBackground, item.hypothesis, item.procedure, item.authorName].join(" ").toLowerCase();
    return item.discipline === discipline && item.recordKind === activeView && (!lifecycleFilter || item.lifecycle === lifecycleFilter) && searchable.includes(query.trim().toLowerCase());
  }), [activeView, data, discipline, lifecycleFilter, query]);

  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.slice(1));
    if (slug && records.some(item => item.slug === slug)) setExpanded(slug);
  }, [records]);

  const changeView = (view: "reference" | "project") => {
    setActiveView(view);
    setLifecycleFilter("");
    updateQuery({ view, stage: "", query });
  };

  const changeStage = (stage: "" | "idea" | "design" | "in_progress" | "completed") => {
    setLifecycleFilter(stage);
    updateQuery({ view: activeView, stage, query });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    updateQuery({ view: activeView, stage: lifecycleFilter, query: value });
  };

  return (
    <div className="page-library">
      <PageHero
        backHref="/"
        backLabel={t("backToOverview")}
        eyebrow={t(current.eyebrowKey) + " · " + current.number}
        title={t(disciplineKeys[discipline])}
        description={t(current.descriptionKey)}
        aside={<div className="glass-panel-dark min-w-48 p-5 text-white"><div className="meta-label text-signal">{t("archiveIndex")}</div><div className="mt-2 font-display text-4xl">{records.length}</div><div className="mt-1 text-sm text-white/58">{t("curatedRecordsInView")}</div></div>}
      />

      <nav className="border-b border-border bg-white/65" aria-label={t("archive")}>
        <div className="page-container flex gap-1 overflow-x-auto py-3">
          {(Object.keys(disciplineRoutes) as Discipline[]).map(item => <Link key={item} href={disciplineRoutes[item]} className={"focus-ring shrink-0 rounded-full px-4 py-2 text-sm transition-colors " + (item === discipline ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-ink")}>{t(disciplineKeys[item])}</Link>)}
        </div>
      </nav>

      <section className="border-b border-border bg-white/55">
        <div className="page-container flex flex-wrap items-center gap-2 py-3">
          <span className="mr-1 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"><Filter size={15} /> {t("archiveView")}</span>
          {libraryViews.map(view => <button key={view.id} type="button" aria-pressed={activeView === view.id} onClick={() => changeView(view.id)} className={"focus-ring rounded-full px-3.5 py-2 text-sm transition-colors " + (activeView === view.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-ink")}>{t(view.key)}</button>)}
          {activeView === "project" && <div className="flex flex-wrap gap-2 border-l border-border pl-2 sm:ml-2">{lifecycleOptions.map(option => <button key={option.id || "all"} type="button" aria-pressed={lifecycleFilter === option.id} onClick={() => changeStage(option.id)} className={"focus-ring rounded-full px-3 py-2 text-sm transition-colors " + (lifecycleFilter === option.id ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-white hover:text-ink")}>{t(option.key)}</button>)}</div>}
        </div>
      </section>

      <section className="page-container py-10 lg:py-14">
        <SectionHeader
          eyebrow={activeView === "reference" ? t("academicReferences") : t("clubProjects")}
          title={t("recordStartingPoint")}
          action={<div className="relative w-full md:w-80"><label htmlFor="library-search" className="sr-only">{t("filterLibrary")}</label><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" /><input id="library-search" className="form-control search-control h-11 bg-white/80 pr-3 text-sm" value={query} onChange={event => changeQuery(event.target.value)} placeholder={t("filterLibrary")} /></div>}
        />

        <div className="mt-8">
          {isLoading && <LoadingState label={t("loadingArchiveRecords")} />}
          {error && <StatusBanner tone="error">{t("archiveRefreshError")}</StatusBanner>}
          {!isLoading && !error && records.length === 0 && <EmptyState icon={<Database size={20} />} title={t("noRecordsMatchFilter")} description={t("tryAnotherFilter")} />}
          {!isLoading && !error && records.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {records.map((item, index) => {
                const isExpanded = expanded === item.slug;
                return (
                  <article key={item.slug} id={item.slug} className={"card-lift overflow-hidden " + (isExpanded ? "lg:col-span-2" : "")} style={{ borderTopColor: current.accent }}>
                    <button type="button" aria-expanded={isExpanded} aria-controls={item.slug + "-details"} onClick={() => setExpanded(isExpanded ? null : item.slug)} className="focus-ring flex w-full items-start gap-4 p-5 text-left md:p-6">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-primary"><span>{item.recordKind === "reference" ? t("referenceLabel") : item.lifecycle && item.lifecycle in lifecycleKeys ? t(lifecycleKeys[item.lifecycle as keyof typeof lifecycleKeys]) : t("projectLabel")}</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{item.authorName || t("psecMember")}</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{item.attachmentCount || 0} {item.attachmentCount === 1 ? t("publicFile") : t("publicFiles")}</span></span>
                        <span className="mt-3 block font-display text-xl leading-8">{item.title}</span>
                        <span className="mt-2 block line-clamp-2 text-sm leading-6 text-muted-foreground">{item.abstract || item.theoreticalBasis || t("notRecordedEntry")}</span>
                      </span>
                      <ChevronDown size={18} className={"mt-1 shrink-0 text-muted-foreground transition-transform " + (isExpanded ? "rotate-180 text-primary" : "")} />
                    </button>
                    {isExpanded && <div id={item.slug + "-details"} className="grid gap-7 border-t border-border bg-white/55 p-5 md:grid-cols-2 md:p-7 lg:grid-cols-[.92fr_1.08fr]">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen size={15} /> {t("theoreticalBasis")}</div>
                        <p className="mt-3 text-sm leading-7 text-ink">{item.theoreticalBasis || t("notRecordedEntry")}</p>
                        <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-primary"><History size={15} /> {t("creatorHistory")}</div>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.historicalBackground || t("notRecordedEntry")}</p>
                      </div>
                      <div className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
                        <div className="text-sm font-semibold text-primary">{t("researchHypothesis")}</div>
                        <p className="mt-3 text-sm leading-7 text-ink">{item.hypothesis || t("notRecordedEntry")}</p>
                        <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-primary"><FileText size={15} /> {t("procedureDataRecord")}</div>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.procedure || t("noProcedureRecord")}</p>
                        {activeView === "project" && item.lifecycle === "completed" && <div className="mt-7 border-t border-border pt-5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><ImageIcon size={15} /> {t("experimentalEvidence")}</div>
                          {attachments.isLoading && <p className="mt-3 text-sm text-muted-foreground">{t("loadingPhotosData")}</p>}
                          {!attachments.isLoading && (attachments.data ?? []).length === 0 && <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("noPublicEvidence")}</p>}
                          {(attachments.data ?? []).length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2">{(attachments.data ?? []).map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="surface-card group overflow-hidden p-3"><div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-secondary text-primary">{file.mimeType.startsWith("image/") ? <img src={file.url} alt={file.fileName} className="h-full w-full object-cover" /> : <Database size={28} />}</div><div className="flex items-center gap-2"><Download size={13} className="shrink-0 text-primary" /><span className="min-w-0 truncate text-sm text-ink group-hover:text-primary">{file.fileName}</span></div><div className="mt-1 text-xs text-muted-foreground">{file.kind && file.kind in fileKindKeys ? t(fileKindKeys[file.kind as keyof typeof fileKindKeys]) : t("fileLabel")} · {file.sizeBytes ? (file.sizeBytes / 1024 / 1024).toFixed(2) + " MB" : t("fileLabel")}</div></a>)}</div>}
                        </div>}
                      </div>
                      <div className="border-t border-border pt-5 lg:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{t("archivedRecordHistory")}</span><Link href={"/records/" + item.slug} className="focus-ring text-sm font-semibold text-primary hover:underline">{t("openShareableRecord")}</Link></div>
                        {activeView === "project" && item.lifecycle === "completed" && <div className="mt-5">{(executionRecords.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("noExecutionSupplements")}</p> : <div className="grid gap-3 md:grid-cols-2">{(executionRecords.data ?? []).map(record => <div key={record.id} className="surface-card p-4"><div className="flex flex-wrap justify-between gap-2 text-xs text-primary"><span>{t("runRecord")} · {record.submitterName || t("submitter")}</span><span>{displayDate(record.createdAt, language)}</span></div>{record.observationNotes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.observationNotes}</p>}</div>)}</div>}</div>}
                      </div>
                    </div>}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-white/55">
        <div className="page-container flex flex-wrap items-center justify-between gap-5 py-7"><div><div className="section-kicker">{t("missingRecord")}</div><p className="mt-2 text-sm text-muted-foreground">{t("memberFormExtend")}</p></div><Link href="/submit" className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">{t("openSubmissionForm")} <ArrowUpRight size={14} /></Link></div>
      </section>
    </div>
  );
}
