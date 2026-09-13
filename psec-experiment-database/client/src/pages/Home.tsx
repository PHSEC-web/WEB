import { ArrowUpRight, BookOpenCheck, Database, FileText, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link } from "wouter";
import { DISCIPLINES, type Discipline } from "@shared/classicExperiments";
import { EmptyState, StatusBanner } from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const disciplineRoutes: Record<Discipline, string> = {
  "Social Psychology": "/library/social-psychology",
  "Behavioral Economics": "/library/behavioral-economics",
  Sociology: "/library/sociology",
  "Moral & Political Philosophy": "/library/moral-political-philosophy",
};

const disciplineKeys: Record<Discipline, "socialPsychology" | "behavioralEconomics" | "sociology" | "philosophy"> = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
};

const disciplineDescriptionKeys: Record<Discipline, "librarySocialDescription" | "libraryBehavioralDescription" | "librarySociologyDescription" | "libraryPhilosophyDescription"> = {
  "Social Psychology": "librarySocialDescription",
  "Behavioral Economics": "libraryBehavioralDescription",
  Sociology: "librarySociologyDescription",
  "Moral & Political Philosophy": "libraryPhilosophyDescription",
};

const categoryKeys = {
  "Academic Reference Library": "academicReferenceLibrary",
  "Idea Pool": "ideaPool",
  "Formal Experimental Designs": "formalExperimentalDesigns",
  "Completed Experimental Projects": "completedExperimentalProjects",
} as const;

const statusKeys = {
  approved: "statusPublished",
  published: "statusPublished",
  pending: "statusPending",
  needs_revision: "statusNeedsRevision",
  rejected: "statusRejected",
  hidden: "statusHidden",
  archived: "statusArchived",
} as const;

function useRevealMotion(pageRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const targets = page.querySelectorAll<HTMLElement>("[data-reveal]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(target => { target.dataset.revealed = "true"; });
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealed = "true";
        observer.unobserve(entry.target);
      });
    }, { threshold: .14, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [pageRef]);
}

function formatDate(value: unknown, language: "zh" | "en") {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function Home() {
  const { language, t } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const archive = trpc.experiments.list.useQuery();
  const archiveRecords = useMemo(() => archive.data ?? [], [archive.data]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const records = normalizedQuery
      ? archiveRecords.filter(item => [item.title, item.abstract, item.theoreticalBasis, item.historicalBackground, item.hypothesis, item.procedure, item.authorName, item.discipline].join(" ").toLowerCase().includes(normalizedQuery))
      : archiveRecords;
    return records.slice(0, 8);
  }, [archiveRecords, normalizedQuery]);
  const featuredRecord = archiveRecords.find(item => Boolean(item.results?.trim())) ?? archiveRecords[0];
  const latestRecords = archiveRecords.slice(0, 3);

  useRevealMotion(pageRef);

  return (
    <div ref={pageRef} className="overview-page">
      <section className="navy-grid relative z-10 overflow-hidden text-white">
        <div className="page-container grid min-h-[min(72vh,46rem)] items-center gap-10 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(19rem,.75fr)] lg:py-20">
          <div className="max-w-3xl">
            <div className="section-kicker text-signal">{t("heroEyebrow")}</div>
            <h1 className="mt-5 max-w-4xl whitespace-pre-line font-display text-[clamp(3rem,7vw,6.8rem)] leading-[1.03] tracking-[-.045em]">{t("heroTitle")}</h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/68">{t("heroDescription")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#archive-search" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-signal px-5 text-sm font-semibold text-ink shadow-[0_10px_24px_rgba(183,210,251,.16)]"><Search size={15} /> {t("exploreArchive")}</a>
              <Link href="/submit" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 text-sm text-white/88 transition-colors hover:bg-white/14"><Sparkles size={15} /> {t("submitIdea")}</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/62">
              <span><strong className="mr-2 text-2xl font-semibold text-white">{archiveRecords.length}</strong>{t("records")}</span>
              <span><strong className="mr-2 text-2xl font-semibold text-white">{DISCIPLINES.length}</strong>{t("disciplines")}</span>
              <span className="inline-flex items-center gap-2 text-[#b6dda9]"><span className="h-2 w-2 rounded-full bg-[#9ed08f]" /> {t("liveArchive")}</span>
            </div>
          </div>
          <aside className="glass-panel-dark p-6 md:p-7" aria-label={t("latestTitle")}>
            <div className="flex items-center justify-between gap-4">
              <div className="section-kicker text-signal">{t("latestEyebrow")}</div>
              <FileText size={18} className="text-signal" />
            </div>
            {featuredRecord ? (
              <>
                <div className="mt-8 text-sm text-white/55">{t(disciplineKeys[featuredRecord.discipline as Discipline])} · {t(statusKeys[featuredRecord.status as keyof typeof statusKeys] ?? "statusPublished")}</div>
                <h2 className="mt-3 font-display text-2xl leading-tight md:text-3xl">{featuredRecord.title}</h2>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-white/68">{featuredRecord.abstract || featuredRecord.theoreticalBasis || t("recordFallbackSummary")}</p>
                <Link href={"/records/" + featuredRecord.slug} className="focus-ring mt-7 inline-flex items-center gap-2 text-sm font-semibold text-signal hover:text-white">{t("openShareableRecord")} <ArrowUpRight size={14} /></Link>
              </>
            ) : (
              <div className="mt-8 text-sm leading-6 text-white/65">{t("noRecords")}</div>
            )}
          </aside>
        </div>
      </section>

      <section id="archive-search" className="paper-grid relative z-10 border-b border-border py-14 lg:py-20">
        <div data-reveal className="story-reveal page-container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="section-kicker">{t("startEyebrow")}</div>
              <h2 className="mt-3 font-display text-3xl tracking-[-.025em] text-ink md:text-5xl">{t("startTitle")}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{t("startDescription")}</p>
            </div>
            <div className="relative w-full md:max-w-md">
              <label htmlFor="archive-search-input" className="sr-only">{t("searchArchive")}</label>
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary" />
              <input id="archive-search-input" type="search" className="search-control form-control h-14 rounded-2xl pr-5 text-base" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} />
            </div>
          </div>

          <div className="mt-9" aria-live="polite">
            {archive.isError && <StatusBanner tone="error">{t("archiveRefreshError")}</StatusBanner>}
            {!archive.isLoading && !archive.isError && filtered.length === 0 && <EmptyState icon={<Database size={20} />} title={t("noMatch")} description={t("tryAnotherFilter")} />}
            {archive.isLoading && <div className="rounded-[var(--radius-card)] border border-border bg-white/55 px-6 py-10 text-sm text-muted-foreground" role="status">{t("loadingArchiveRecords")}</div>}
            {!archive.isLoading && filtered.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {filtered.slice(0, normalizedQuery ? 8 : 4).map(item => (
                  <Link key={item.slug} href={"/records/" + item.slug} className="focus-ring card-lift group p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="meta-label">{t(disciplineKeys[item.discipline as Discipline])}</span>
                      <ArrowUpRight size={16} className="shrink-0 text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                    <h3 className="mt-8 line-clamp-2 font-display text-lg leading-7">{item.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.abstract || item.theoreticalBasis || t("notRecordedEntry")}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{categoryKeys[item.category as keyof typeof categoryKeys] ? t(categoryKeys[item.category as keyof typeof categoryKeys]) : item.category}</span>
                      {item.updatedAt && <span>· {formatDate(item.updatedAt, language)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {!normalizedQuery && (
            <div className="mt-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="section-kicker">{t("archive")}</div>
                  <h2 className="mt-2 font-display text-2xl md:text-3xl">{t("browseAll")}</h2>
                </div>
                <Link href="/library/social-psychology" className="focus-ring hidden items-center gap-2 text-sm font-semibold text-primary sm:flex">{t("browseAll")} <ArrowUpRight size={14} /></Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DISCIPLINES.map((discipline, index) => (
                  <Link key={discipline.name} href={disciplineRoutes[discipline.name]} className="focus-ring card-lift group relative min-h-44 overflow-hidden p-5">
                    <div className="flex items-start justify-between gap-3"><span className="meta-label">{String(index + 1).padStart(2, "0")}</span><ArrowUpRight size={16} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
                    <div className="mt-12">
                      <h3 className="font-display text-xl leading-7">{t(disciplineKeys[discipline.name])}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{t(disciplineDescriptionKeys[discipline.name])}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="surface-band relative z-10 py-14 lg:py-20">
        <div data-reveal className="story-reveal page-container grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
          <div>
            <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="section-kicker">{t("latestEyebrow")}</div>
                <h2 className="mt-2 font-display text-3xl">{t("archiveRecords")}</h2>
              </div>
              <Link href="/library/social-psychology" className="focus-ring hidden items-center gap-2 text-sm font-semibold text-primary sm:flex">{t("browseAll")} <ArrowUpRight size={14} /></Link>
            </div>
            <div className="divide-y divide-border">
              {latestRecords.length > 0 ? latestRecords.map((item, index) => (
                <Link key={item.slug ?? item.id} href={"/records/" + item.slug} className="focus-ring flex items-start gap-4 py-5">
                  <span className="meta-label w-8 shrink-0 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary">
                      {item.discipline && <span>{t(disciplineKeys[item.discipline as Discipline])}</span>}
                      {item.status && <span className="text-muted-foreground">· {t(statusKeys[item.status as keyof typeof statusKeys] ?? "statusPublished")}</span>}
                    </div>
                    <h3 className="mt-2 font-display text-lg leading-7">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.results || item.abstract || item.theoreticalBasis || t("notRecordedEntry")}</p>
                  </div>
                  <ArrowUpRight size={16} className="mt-1 shrink-0 text-muted-foreground" />
                </Link>
              )) : <div className="py-8 text-sm text-muted-foreground">{t("noRecords")}</div>}
            </div>
          </div>
          <div className="glass-panel p-6 md:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><BookOpenCheck size={20} /></div>
            <h2 className="mt-6 font-display text-2xl md:text-3xl">{t("clubTitle")}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("clubDescription")}</p>
            <Link href="/submit" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">{t("openForm")} <ArrowUpRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="surface-band-muted relative z-10 border-y border-border">
        <div data-reveal className="story-reveal page-container grid gap-8 py-12 lg:grid-cols-[.8fr_1.2fr] lg:py-16">
          <div>
            <div className="section-kicker">{t("notesEyebrow")}</div>
            <h2 className="mt-2 font-display text-3xl">{t("notesTitle")}</h2>
          </div>
          <div className="grid gap-6 text-sm leading-7 text-muted-foreground md:grid-cols-3">
            <div><span className="font-semibold text-ink">01 · {t("standardize")}</span><p className="mt-2">{t("standardizeText")}</p></div>
            <div><span className="font-semibold text-ink">02 · {t("iterate")}</span><p className="mt-2">{t("iterateText")}</p></div>
            <div><span className="font-semibold text-ink">03 · {t("protect")}</span><p className="mt-2">{t("protectText")}</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
