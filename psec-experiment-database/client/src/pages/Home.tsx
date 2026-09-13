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
  if (language === "en") return category;
  return category === "Academic Reference Library" ? "学术参考库" : category;
}

function HeroVisual() {
  return <div className="hero-story-visual" aria-hidden="true">
    <div className="hero-dashboard">
      <div className="hero-dashboard-top"><span className="hero-dashboard-kicker">PSEC / INDEX 01</span><span className="hero-dashboard-live"><i /> LIVE</span></div>
      <div className="hero-dashboard-title">Research<br /><span>in motion.</span></div>
      <div className="hero-dashboard-line" />
      <div className="hero-dashboard-grid">
        <div><strong>04</strong><span>disciplines</span></div>
        <div><strong>∞</strong><span>next questions</span></div>
      </div>
      <div className="hero-dashboard-footer"><span>ARCHIVE SIGNAL</span><span>01—05</span></div>
    </div>
    <div className="hero-float-card"><span className="hero-float-dot" /><span>record / ready</span><strong>keep going →</strong></div>
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
        <div className="hero-story-content mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-signal"><span className="h-px w-8 bg-signal" /> {t("heroEyebrow")} <span className="text-white/30">01—05</span></div>
            <h1 className="max-w-4xl whitespace-pre-line font-display text-[clamp(3.2rem,8vw,8rem)] leading-[.95] tracking-[-.07em]">{t("heroTitle")}</h1>
            <p className="mt-8 max-w-xl text-[17px] leading-8 text-white/65">{t("heroDescription")}</p>
            <div className="mt-10 flex flex-wrap gap-3"><a href="#archive-search" className="focus-ring inline-flex h-12 items-center gap-2 rounded-full border border-signal bg-signal px-5 font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-ink"><Search size={15} /> {t("exploreArchive")}</a><Link href="/submit" className="focus-ring inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/[.05] px-5 font-mono text-[10px] uppercase tracking-[.12em] text-white/85"><Sparkles size={15} /> {t("submitIdea")}</Link><Link href="/submit-evidence" className="focus-ring inline-flex h-12 items-center gap-2 rounded-full border border-[#9dc4f4]/60 bg-[#0d2c54]/55 px-5 font-mono text-[10px] uppercase tracking-[.12em] text-[#d3e5fd]"><FileUp size={15} /> {t("addEvidence")}</Link></div>
            <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/45"><span><strong className="mr-2 text-2xl font-normal text-white">{archiveRecords.length}</strong>{t("records")}</span><span><strong className="mr-2 text-2xl font-normal text-white">04</strong>{t("disciplines")}</span><span className="flex items-center gap-2 text-[#b6dda9]"><span className="h-2 w-2 rounded-full bg-[#9ed08f]" /> {t("liveArchive")}</span></div>
          </div>
        </div>
        <HeroVisual />
        <div className="hero-scroll-line"><ArrowDown size={13} /> {t("scrollToExplore")}</div>
      </div>
    </section>

    <section className="story-section relative z-10 flex items-center border-b border-border bg-[#f5f2eb] py-16 lg:py-20"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[.35fr_.65fr] lg:px-10"><div className="border-l-2 border-signal pl-5"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t("clubEyebrow")}</div><div className="mt-5 font-display text-6xl leading-none text-[#0b4ea2] md:text-8xl">PSEC</div></div><div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e1ebf6] text-primary"><BookOpenCheck size={20} /></div><h2 className="mt-7 max-w-3xl font-display text-[clamp(2.35rem,5vw,5.2rem)] leading-[1.02] tracking-[-.06em] text-ink">{t("clubTitle")}</h2><p className="mt-6 max-w-2xl text-[17px] leading-8 text-muted-foreground">{t("clubDescription")}</p><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t("archiveMemory")}</p></div><div className="grid gap-3 border-t border-[#d9d7d1] pt-6 md:grid-cols-3 lg:col-span-2"><article className="card-lift border border-[#ccd6e1] p-5"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">01 / {t("whatPsec")}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("whatPsecText")}</p></article><article className="card-lift border border-[#ccd6e1] p-5"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">02 / {t("whatArchive")}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("whatArchiveText")}</p></article><div className="rounded-[1.15rem] border border-[#0b4ea2] bg-[#0b4ea2] p-5 text-white shadow-[0_18px_48px_rgba(11,78,162,.16)]"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b8d6fa]">03 / {t("beginRecord")}</div><p className="mt-4 text-sm leading-6 text-white/75">{t("beginRecordText")}</p><Link href="/submit" className="focus-ring mt-5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-white underline underline-offset-4"><Sparkles size={13} /> {t("submitIdea")}</Link></div></div></div></section>

    <section className="navy-grid relative z-10 flex min-h-[70vh] items-center overflow-hidden py-16 text-white lg:py-20"><div data-reveal className="story-reveal mx-auto w-full max-w-[1440px] px-5 lg:px-10"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-signal">{t("databaseEyebrow")}</div><h2 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,5.5vw,5.7rem)] leading-[1] tracking-[-.06em]">{t("databaseTitle")}</h2></div><p className="max-w-xl text-[17px] leading-8 text-white/65">{t("databaseDescription")}</p></div><div className="mt-10 grid gap-3 md:grid-cols-3"><article className="story-card rounded-[1.25rem] p-6"><Database size={20} className="text-signal" /><h3 className="mt-10 font-display text-2xl">{t("archiveCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("archiveCardText")}</p></article><article className="story-card rounded-[1.25rem] p-6"><Clock3 size={20} className="text-signal" /><h3 className="mt-10 font-display text-2xl">{t("iterateCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("iterateCardText")}</p></article><article className="story-card rounded-[1.25rem] p-6"><FileText size={20} className="text-signal" /><h3 className="mt-10 font-display text-2xl">{t("shareCardTitle")}</h3><p className="mt-3 text-sm leading-6 text-white/60">{t("shareCardText")}</p></article></div></div></section>

    <section id="archive-search" className="paper-grid relative z-10 border-b border-border py-16 lg:py-20"><div data-reveal className="story-reveal mx-auto max-w-[1440px] px-5 lg:px-10"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t("startEyebrow")}</div><h2 className="mt-3 font-display text-4xl tracking-[-.04em] text-ink md:text-5xl">{t("startTitle")}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{t("startDescription")}</p></div><div className="relative w-full md:max-w-md"><label htmlFor="archive-search-input" className="sr-only">{t("searchArchive")}</label><Search size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary" /><input id="archive-search-input" type="search" className="search-control form-control h-14 rounded-full pr-5" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /></div></div>{query ? <div className="mt-10" aria-live="polite"><div className="mb-5 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">{t("searchResults")} / {filtered.length} {t("shown")}</div>{filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#aeb9c8] bg-white/60 p-10 text-center text-sm text-muted-foreground">{t("noMatch")}</div> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Link key={item.slug} href={recordHref(item)} className="focus-ring card-lift border border-border p-5"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[.12em] text-primary">{disciplineLabel(item.discipline as Discipline, language)} · {categoryLabel(item.category, language)}</span><ArrowUpRight size={15} className="shrink-0 text-muted-foreground" /></div><h3 className="mt-7 font-display text-lg leading-7">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.theoreticalBasis}</p></Link>)}</div>}</div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{DISCIPLINES.map((discipline, index) => <Link key={discipline.name} href={navMap[discipline.name]} className="focus-ring card-lift group relative min-h-[190px] overflow-hidden border border-border p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] tracking-[.15em] text-muted-foreground">{discipline.icon}</span><ArrowUpRight size={16} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><div className="mt-14"><h3 className="font-display text-xl leading-7 tracking-[-.02em]">{disciplineLabel(discipline.name, language)}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{language === "zh" ? ["行为、身份与影响", "选择、激励与合作", "群体、地位与公共生活", "正义、伦理与判断"][index] : discipline.short}</p></div><span className="absolute -bottom-8 -right-2 font-display text-[110px] leading-none text-[#e7eef6]">{index + 1}</span></Link>)}</div>}</div></section>

    <section className="relative z-10 bg-[#f5f2eb] py-20 lg:py-28"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-10"><div><div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t("browseAll")}</div><h2 className="mt-3 font-display text-4xl tracking-[-.04em] text-ink">{t("archiveRecords")}</h2></div><Link href="/library/social-psychology" className="focus-ring hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-primary sm:flex">{t("browseAll")} <ArrowUpRight size={13} /></Link></div><div className="mt-8 divide-y divide-border border-y border-border">{featuredRecords.map((item, index) => <Link key={item.slug} href={recordHref(item)} className="focus-ring flex items-start gap-5 py-5"><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-primary">{disciplineLabel(item.discipline as Discipline, language)}</span>{item.results && <><span className="h-1 w-1 rounded-full bg-signal" /><span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#3f7b44]">{t("resultsAdded")}</span></>}</div><h3 className="mt-2 font-display text-xl tracking-[-.02em]">{item.title}</h3><p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.results || item.abstract || item.theoreticalBasis}</p></div><ArrowUpRight size={16} className="mt-1 shrink-0 text-muted-foreground" /></Link>)}{archiveRecords.length === 0 && <div className="py-6 text-sm text-muted-foreground">{t("noMatch")}</div>}</div></div><div className="glass-panel rounded-[1.5rem] bg-[#eaf2fb]/80 p-7"><div className="flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t("latestEyebrow")}</div><FileText size={18} className="text-primary" /></div><h2 className="mt-4 font-display text-3xl tracking-[-.04em] text-ink">{t("latestTitle")}</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("latestDescription")}</p><Link href="/submit" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white">{t("openForm")} <ArrowUpRight size={14} /></Link><div className="mt-8 border-t border-[#cbd8e6] pt-5">{latest.data && latest.data.length > 0 ? latest.data.slice(0, 2).map((item) => <div key={item.id} className="border-b border-[#cbd8e6] py-3 last:border-0"><div className="font-mono text-[9px] uppercase tracking-[.12em] text-primary">{disciplineLabel(item.discipline as Discipline, language)} · {item.status}</div><div className="mt-1 text-sm font-medium">{item.title}</div></div>) : <div className="font-mono text-[10px] uppercase tracking-[.12em] leading-5 text-muted-foreground">{t("noRecords")}</div>}</div></div></div></section>

    <section className="relative z-10 border-y border-border bg-[#ece9e2]"><div data-reveal className="story-reveal mx-auto grid max-w-[1440px] gap-8 px-5 py-16 lg:grid-cols-3 lg:px-10 lg:py-20"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{t("notesEyebrow")}</div><h2 className="mt-3 font-display text-3xl tracking-[-.04em] text-ink">{t("notesTitle")}</h2></div><div className="grid gap-7 text-sm leading-6 text-muted-foreground md:grid-cols-3 lg:col-span-2"><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">01 — {t("standardize")}</span><p className="mt-2">{t("standardizeText")}</p></div><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">02 — {t("iterate")}</span><p className="mt-2">{t("iterateText")}</p></div><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">03 — {t("protect")}</span><p className="mt-2">{t("protectText")}</p></div></div></div></section>
  </div>;
}
