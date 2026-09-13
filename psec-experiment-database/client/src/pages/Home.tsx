import { ArrowDown, ArrowUpRight, BookOpenCheck, Clock3, Database, FileText, FileUp, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { DISCIPLINES, type Discipline } from "@shared/classicExperiments";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const navMap: Record<string, string> = {
  "Social Psychology": "/library/social-psychology",
  "Behavioral Economics": "/library/behavioral-economics",
  Sociology: "/library/sociology",
  "Moral & Political Philosophy": "/library/moral-political-philosophy",
};

const recordHref = (item: { slug: string }) => `/records/${item.slug}`;

function useHomeMotion(pageRef: React.RefObject<HTMLDivElement | null>, heroRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = page.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.dataset.revealed = "true");
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.revealed = "true";
        observer.unobserve(entry.target);
      }
    }), { threshold: .16, rootMargin: "0px 0px -8% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pageRef]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 768) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      hero.style.setProperty("--hero-progress", progress.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [heroRef]);
}

function disciplineLabel(discipline: Discipline, language: "zh" | "en") {
  if (language === "en") return discipline;
  return { "Social Psychology": "社会心理学", "Behavioral Economics": "行为经济学", Sociology: "社会学", "Moral & Political Philosophy": "道德与政治哲学" }[discipline];
}

function categoryLabel(category: string, language: "zh" | "en") {
  const labels = {
    "Academic Reference Library": language === "zh" ? "学术参考库" : "Academic reference library",
    "Idea Pool": language === "zh" ? "想法池" : "Idea pool",
    "Formal Experimental Designs": language === "zh" ? "正式实验设计" : "Formal experimental designs",
    "Completed Experimental Projects": language === "zh" ? "已完成实验项目" : "Completed experimental projects",
  } as const;
  return labels[category as keyof typeof labels] || category;
}

function statusLabel(status: string, language: "zh" | "en") {
  const labels = {
    approved: language === "zh" ? "已发布" : "Published",
    published: language === "zh" ? "已发布" : "Published",
    pending: language === "zh" ? "待审核" : "Pending review",
    needs_revision: language === "zh" ? "需修改" : "Needs revision",
    rejected: language === "zh" ? "已拒绝" : "Rejected",
    hidden: language === "zh" ? "已隐藏" : "Hidden",
    archived: language === "zh" ? "已归档" : "Archived",
  } as const;
  return labels[status as keyof typeof labels] || status;
}

function HeroVisual() {
  const { t } = useLanguage();
  return <div className="hero-story-visual" aria-hidden="true">
    <div className="hero-dashboard">
      <div className="hero-dashboard-top"><span className="hero-dashboard-kicker">PSEC / INDEX 01</span><span className="hero-dashboard-live"><i /> {t("heroLive")}</span></div>
      <div className="hero-dashboard-title">{t("heroResearch")}<br /><span>{t("heroInMotion")}</span></div>
      <div className="hero-dashboard-line" />
      <div className="hero-dashboard-grid">
        <div><strong>04</strong><span>{t("heroDisciplines")}</span></div>
        <div><strong>∞</strong><span>{t("heroNextQuestions")}</span></div>
      </div>
      <div className="hero-dashboard-footer"><span>{t("heroArchiveSignal")}</span><span>01—05</span></div>
    </div>
    <div className="hero-float-card"><span className="hero-float-dot" /><span>{t("heroRecordReady")}</span><strong>{t("heroKeepGoing")}</strong></div>
  </div>;
}

export default function Home() {
  const { language, t } = useLanguage();
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const latest = trpc.submissions.latest.useQuery();
  const archive = trpc.experiments.list.useQuery();
  const archiveRecords = useMemo(() => archive.data ?? [], [archive.data]);
  const featuredRecords = useMemo(() => [...archiveRecords.filter((item) => Boolean(item.results?.trim())), ...archiveRecords.filter((item) => !item.results?.trim())].slice(0, 4), [archiveRecords]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return archiveRecords.slice(0, 4);
    return archiveRecords.filter((item) => [item.title, item.abstract, item.theoreticalBasis, item.historicalBackground, item.discipline, item.authorName].join(" ").toLowerCase().includes(normalized)).slice(0, 12);
  }, [archiveRecords, query]);

  useHomeMotion(pageRef, heroRef);

  return <div ref={pageRef} className="overview-page">
    <section ref={heroRef} className="hero-story navy-grid relative z-10 text-white">
      <div className="hero-story-stage">
        <div className="hero-story-content mx-auto max-w-[1440px] px-5 py-14 lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3 font-mono text-[10px] tracking-[.1em] text-signal"><span className="h-px w-8 bg-signal" /> {t("heroEyebrow")} <span className="text-white/30">01—05</span></div>
            <h1 className="max-w-4xl whitespace-pre-line font-display text-[clamp(3rem,7vw,6.6rem)] leading-[1]">{t("heroTitle")}</h1>
            <p className="mt-7 max-w-xl text-[16px] leading-7 text-white/65">{t("heroDescription")}</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="#archive-search" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-signal bg-signal px-5 font-mono text-[10px] font-semibold tracking-[.08em] text-ink shadow-[0_10px_24px_rgba(183,210,251,.16)]"><Search size={15} /> {t("exploreArchive")}</a><Link href="/submit" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[.05] px-5 font-mono text-[10px] tracking-[.08em] text-white/85"><Sparkles size={15} /> {t("submitIdea")}</Link><Link href="/submit-evidence" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-[#9dc4f4]/60 bg-[#0d2c54]/55 px-5 font-mono text-[10px] tracking-[.08em] text-[#d3e5fd]"><FileUp size={15} /> {t("addEvidence")}</Link></div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10px] tracking-[.08em] text-white/45"><span><strong className="mr-2 text-2xl font-normal text-white">{archiveRecords.length}</strong>{t("records")}</span><span><strong className="mr-2 text-2xl font-normal text-white">04</strong>{t("disciplines")}</span><span className="flex items-center gap-2 text-[#b6dda9]"><span className="h-2 w-2 rounded-full bg-[#9ed08f]" /> {t("liveArchive")}</span></div>
          </div>
        </div>
        <HeroVisual />
        <div className="hero-scroll-line"><ArrowDown size={13} /> {t("scrollToExplore")}</div>
      </div>
    </section>

    <section className="story-section surface-band relative z-10 flex items-center border-b border-border py-14 lg:py-20"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[.35fr_.65fr] lg:px-10"><div className="border-l-2 border-signal pl-5"><div className="font-mono text-[10px] tracking-[.1em] text-primary">{t("clubEyebrow")}</div><div className="mt-5 font-display text-6xl leading-none text-[#0b4ea2] md:text-8xl">PSEC</div></div><div><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e1ebf6] text-primary"><BookOpenCheck size={20} /></div><h2 className="mt-6 max-w-3xl font-display text-[clamp(2.25rem,5vw,5rem)] leading-[1.05] text-ink">{t("clubTitle")}</h2><p className="mt-5 max-w-2xl text-[16px] leading-7 text-muted-foreground">{t("clubDescription")}</p><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t("archiveMemory")}</p></div><div className="grid gap-3 border-t border-[var(--surface-line)] pt-6 md:grid-cols-3 lg:col-span-2"><article className="card-lift border border-[var(--surface-line)] p-5"><div className="font-mono text-[9px] tracking-[.08em] text-primary">01 / {t("whatPsec")}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("whatPsecText")}</p></article><article className="card-lift border border-[var(--surface-line)] p-5"><div className="font-mono text-[9px] tracking-[.08em] text-primary">02 / {t("whatArchive")}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("whatArchiveText")}</p></article><div className="rounded-[.9rem] border border-[#0b4ea2] bg-[#0b4ea2] p-5 text-white shadow-[0_18px_48px_rgba(11,78,162,.16)]"><div className="font-mono text-[9px] tracking-[.08em] text-[#b8d6fa]">03 / {t("beginRecord")}</div><p className="mt-4 text-sm leading-6 text-white/75">{t("beginRecordText")}</p><Link href="/submit" className="focus-ring mt-5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.08em] text-white underline underline-offset-4"><Sparkles size={13} /> {t("submitIdea")}</Link></div></div></div></section>

    <section className="navy-grid relative z-10 flex min-h-[64vh] items-center overflow-hidden py-14 text-white lg:py-20"><div data-reveal className="story-reveal mx-auto w-full max-w-[1440px] px-5 lg:px-10"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><div className="font-mono text-[10px] tracking-[.1em] text-signal">{t("databaseEyebrow")}</div><h2 className="mt-4 max-w-3xl font-display text-[clamp(2.55rem,5.3vw,5.4rem)] leading-[1.05]">{t("databaseTitle")}</h2></div><p className="max-w-xl text-[16px] leading-7 text-white/65">{t("databaseDescription")}</p></div><div className="mt-9 grid gap-3 md:grid-cols-3"><article className="story-card rounded-[.9rem] p-5"><Database size={20} className="text-signal" /><h3 className="mt-9 font-display text-2xl">{t("archiveCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("archiveCardText")}</p></article><article className="story-card rounded-[.9rem] p-5"><Clock3 size={20} className="text-signal" /><h3 className="mt-9 font-display text-2xl">{t("iterateCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("iterateCardText")}</p></article><article className="story-card rounded-[.9rem] p-5"><FileText size={20} className="text-signal" /><h3 className="mt-9 font-display text-2xl">{t("shareCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("shareCardText")}</p></article></div></div></section>

    <section id="archive-search" className="paper-grid relative z-10 border-b border-border py-14 lg:py-20"><div data-reveal className="story-reveal mx-auto max-w-[1440px] px-5 lg:px-10"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="font-mono text-[10px] tracking-[.1em] text-primary">{t("startEyebrow")}</div><h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">{t("startTitle")}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{t("startDescription")}</p></div><div className="relative w-full md:max-w-md"><label htmlFor="archive-search-input" className="sr-only">{t("searchArchive")}</label><Search size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary" /><input id="archive-search-input" type="search" className="search-control form-control h-14 rounded-xl pr-5" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /></div></div>{query ? <div className="mt-9" aria-live="polite"><div className="mb-5 font-mono text-[10px] tracking-[.08em] text-muted-foreground">{t("searchResults")} / {filtered.length} {t("shown")}</div>{filtered.length === 0 ? <div className="rounded-xl border border-dashed border-[#aeb9c8] bg-white/60 p-9 text-center text-sm text-muted-foreground">{t("noMatch")}</div> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Link key={item.slug} href={recordHref(item)} className="focus-ring card-lift border border-border p-5"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] tracking-[.08em] text-primary">{disciplineLabel(item.discipline as Discipline, language)} · {categoryLabel(item.category, language)}</span><ArrowUpRight size={15} className="shrink-0 text-muted-foreground" /></div><h3 className="mt-6 font-display text-lg leading-7">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.theoreticalBasis}</p></Link>)}</div>}</div> : <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{DISCIPLINES.map((discipline, index) => <Link key={discipline.name} href={navMap[discipline.name]} className="focus-ring card-lift group relative min-h-[180px] overflow-hidden border border-border p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] tracking-[.08em] text-muted-foreground">{discipline.icon}</span><ArrowUpRight size={16} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><div className="mt-12"><h3 className="font-display text-xl leading-7">{disciplineLabel(discipline.name, language)}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{language === "zh" ? ["行为、身份与影响", "选择、激励与合作", "群体、地位与公共生活", "正义、伦理与判断"][index] : discipline.short}</p></div><span className="absolute -bottom-8 -right-2 font-display text-[100px] leading-none text-[#e7eef6]">{index + 1}</span></Link>)}</div>}</div></section>

    <section className="surface-band relative z-10 py-16 lg:py-24"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-10"><div><div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[10px] tracking-[.1em] text-primary">{t("browseAll")}</div><h2 className="mt-3 font-display text-4xl text-ink">{t("archiveRecords")}</h2></div><Link href="/library/social-psychology" className="focus-ring hidden items-center gap-2 font-mono text-[10px] tracking-[.08em] text-primary sm:flex">{t("browseAll")} <ArrowUpRight size={13} /></Link></div><div className="mt-7 divide-y divide-border border-y border-border">{featuredRecords.map((item, index) => <Link key={item.slug} href={recordHref(item)} className="focus-ring flex items-start gap-5 py-5"><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-[9px] tracking-[.08em] text-primary">{disciplineLabel(item.discipline as Discipline, language)}</span>{item.results && <><span className="h-1 w-1 rounded-full bg-signal" /><span className="font-mono text-[9px] tracking-[.08em] text-[#3f7b44]">{t("resultsAdded")}</span></>}</div><h3 className="mt-2 font-display text-xl">{item.title}</h3><p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.results || item.abstract || item.theoreticalBasis}</p></div><ArrowUpRight size={16} className="mt-1 shrink-0 text-muted-foreground" /></Link>)}{archiveRecords.length === 0 && <div className="py-6 text-sm text-muted-foreground">{t("noMatch")}</div>}</div></div><div className="glass-panel bg-[#eaf2fb]/80 p-6 md:p-7"><div className="flex items-center justify-between"><div className="font-mono text-[10px] tracking-[.1em] text-primary">{t("latestEyebrow")}</div><FileText size={18} className="text-primary" /></div><h2 className="mt-4 font-display text-3xl text-ink">{t("latestTitle")}</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("latestDescription")}</p><Link href="/submit" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-mono text-[10px] tracking-[.08em] text-white">{t("openForm")} <ArrowUpRight size={14} /></Link><div className="mt-8 border-t border-[#cbd8e6] pt-5">{latest.data && latest.data.length > 0 ? latest.data.slice(0, 2).map((item) => <div key={item.id} className="border-b border-[#cbd8e6] py-3 last:border-0"><div className="font-mono text-[9px] tracking-[.08em] text-primary">{disciplineLabel(item.discipline as Discipline, language)} · {statusLabel(item.status, language)}</div><div className="mt-1 text-sm font-medium">{item.title}</div></div>) : <div className="font-mono text-[10px] tracking-[.08em] leading-5 text-muted-foreground">{t("noRecords")}</div>}</div></div></div></section>

    <section className="surface-band-muted relative z-10 border-y border-border"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-8 px-5 py-14 lg:grid-cols-3 lg:px-10 lg:py-18"><div><div className="font-mono text-[10px] tracking-[.1em] text-primary">{t("notesEyebrow")}</div><h2 className="mt-3 font-display text-3xl text-ink">{t("notesTitle")}</h2></div><div className="grid gap-7 text-sm leading-6 text-muted-foreground md:grid-cols-3 lg:col-span-2"><div><span className="font-mono text-[10px] tracking-[.08em] text-ink">01 — {t("standardize")}</span><p className="mt-2">{t("standardizeText")}</p></div><div><span className="font-mono text-[10px] tracking-[.08em] text-ink">02 — {t("iterate")}</span><p className="mt-2">{t("iterateText")}</p></div><div><span className="font-mono text-[10px] tracking-[.08em] text-ink">03 — {t("protect")}</span><p className="mt-2">{t("protectText")}</p></div></div></div></section>
  </div>;
}
