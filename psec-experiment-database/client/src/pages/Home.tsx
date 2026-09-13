import { ArrowDownRight, ArrowUpRight, BookOpenCheck, Clock3, Database, FileText, FileUp, LockKeyhole, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { DISCIPLINES } from "@shared/classicExperiments";
import { trpc } from "@/lib/trpc";

const navMap: Record<string, string> = {
  "Social Psychology": "/library/social-psychology",
  "Behavioral Economics": "/library/behavioral-economics",
  Sociology: "/library/sociology",
  "Moral & Political Philosophy": "/library/moral-political-philosophy",
};

const recordHref = (item: { slug: string }) => `/records/${item.slug}`;

/**
 * This hook is intentionally scoped to Overview. It uses one IntersectionObserver
 * and a rAF-throttled CSS variable instead of a scroll library or React state.
 */
function useOverviewScrollMotion(pageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches && !reduced;
    const targets = Array.from(page.querySelectorAll<HTMLElement>("[data-overview-reveal], [data-flask-reveal]"))
      .filter((target) => !desktop || !target.hasAttribute("data-flask-reveal"));

    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.setAttribute("data-revealed", "true"));
      if (reduced) page.setAttribute("data-flask-rested", "true");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "true");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pageRef]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const isMobile = window.matchMedia("(max-width: 767px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (isMobile.matches || reduced.matches) {
      page.style.setProperty("--overview-parallax-y", "0px");
      page.style.setProperty("--flask-rotation", "0deg");
      page.style.setProperty("--flask-slide-x", "0px");
      page.style.setProperty("--flask-drop-y", "0px");
      page.style.setProperty("--flask-pour", "0");
      page.style.setProperty("--flask-liquid-sway", "0deg");
      page.style.setProperty("--flask-liquid-level", "1");
      page.style.setProperty("--flask-particle-lift", "0px");
      page.style.setProperty("--flask-atmosphere-lift", "0px");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      // Both movements are deliberately small, rAF-throttled, and only affect transforms.
      page.style.setProperty("--overview-parallax-y", `${Math.round(window.scrollY * -0.045)}px`);
      const progress = Math.min(Math.max(window.scrollY / 500, 0), 1);
      const eased = progress * progress * (3 - 2 * progress);
      const pour = Math.min(Math.max((eased - 0.22) / 0.78, 0), 1);
      page.style.setProperty("--flask-rotation", `${Math.round(eased * 88)}deg`);
      page.style.setProperty("--flask-slide-x", `${Math.round(eased * 54)}px`);
      page.style.setProperty("--flask-drop-y", `${Math.round(eased * 18)}px`);
      page.style.setProperty("--flask-pour", pour.toFixed(3));
      page.style.setProperty("--flask-liquid-sway", `${Math.round(eased * -13)}deg`);
      page.style.setProperty("--flask-liquid-level", (1 - pour * 0.34).toFixed(3));
      page.style.setProperty("--flask-particle-lift", `${Math.round(eased * 25)}px`);
      page.style.setProperty("--flask-atmosphere-lift", `${Math.round(eased * 37)}px`);
      page.setAttribute("data-flask-rested", eased >= 0.86 ? "true" : "false");
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pageRef]);
}

function FloatingKeywords() {
  return (
    <div className="overview-parallax" aria-hidden="true">
      <div className="overview-parallax-inner">
        <span className="overview-keyword overview-keyword-one">SOCIAL EXPERIMENT</span>
        <span className="overview-keyword overview-keyword-two">GAME THEORY</span>
        <span className="overview-keyword overview-keyword-three">CONFORMITY</span>
        <span className="overview-keyword overview-keyword-four">EXPERIMENTAL DATA</span>
        <span className="overview-keyword overview-keyword-five">FIELD NOTE</span>
      </div>
    </div>
  );
}

function ScrollFlask() {
  return (
    <figure className="flask-scroll-stage" aria-label="A laboratory flask that responds to page scroll">
      <div className="flask-scene" aria-hidden="true">
        <span className="flask-atmosphere-particle flask-atmosphere-one" />
        <span className="flask-atmosphere-particle flask-atmosphere-two" />
        <span className="flask-atmosphere-particle flask-atmosphere-three" />
        <span className="flask-atmosphere-particle flask-atmosphere-four" />
        <div className="flask-shadow" />
        <div className="flask-model">
          <div className="flask-neck" />
          <div className="flask-rim" />
          <div className="flask-vessel">
            <div className="flask-liquid" />
            <span className="flask-particle flask-particle-one" />
            <span className="flask-particle flask-particle-two" />
            <span className="flask-particle flask-particle-three" />
          </div>
          <div className="flask-water-flow">
            <svg viewBox="0 0 310 370" fill="none" preserveAspectRatio="none">
              <path className="water-mist water-mist-wide" d="M4 3 C42 48 38 100 81 143 C126 189 138 237 188 282 C230 320 262 342 304 366" pathLength="1" />
              <path className="water-glow" d="M4 3 C42 48 38 100 81 143 C126 189 138 237 188 282 C230 320 262 342 304 366" pathLength="1" />
              <path className="water-stream" d="M4 3 C42 48 38 100 81 143 C126 189 138 237 188 282 C230 320 262 342 304 366" pathLength="1" />
              <path className="water-highlight" d="M7 5 C39 50 43 96 84 140 C128 189 141 232 191 278 C234 316 264 340 301 361" pathLength="1" />
            </svg>
            <span className="water-drop water-drop-one" />
            <span className="water-drop water-drop-two" />
            <span className="water-drop water-drop-three" />
          </div>
        </div>
      </div>
      <figcaption className="flask-caption"><span className="h-px w-7 bg-[#9dc4f4]/70" /> Scroll to begin the record</figcaption>
    </figure>
  );
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const latest = trpc.submissions.latest.useQuery();
  const archive = trpc.experiments.list.useQuery();
  const archiveRecords = useMemo(() => archive.data ?? [], [archive.data]);
  const featuredRecords = useMemo(() => [
    ...archiveRecords.filter((item) => Boolean(item.results?.trim())),
    ...archiveRecords.filter((item) => !item.results?.trim()),
  ].slice(0, 4), [archiveRecords]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return archiveRecords.slice(0, 4);
    return archiveRecords.filter((item) => [item.title, item.abstract, item.theoreticalBasis, item.historicalBackground, item.discipline, item.authorName].join(" ").toLowerCase().includes(normalized)).slice(0, 12);
  }, [archiveRecords, query]);

  useOverviewScrollMotion(pageRef);

  return (
    <div ref={pageRef} className="overview-page">
      <FloatingKeywords />

      {/* Section 1: visible immediately on arrival. */}
      <section className="navy-grid relative z-10 min-h-[min(760px,calc(100vh-73px))] overflow-hidden text-white">
        <div className="relative z-10 mx-auto grid min-h-[min(760px,calc(100vh-73px))] max-w-[1440px] gap-10 px-5 pb-20 pt-16 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:pb-24 lg:pt-24">
          <div className="flex max-w-3xl flex-col justify-center">
            <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.22em] text-signal"><span className="h-px w-8 bg-signal" /> Field note / internal archive <span className="text-white/30">01—06</span></div>
            <h1 className="font-display text-[clamp(3.2rem,7.4vw,7.2rem)] leading-[.98] tracking-[-.06em] text-white">Ideas worth<br /><span className="text-[#9dc4f4]">testing.</span></h1>
            <p className="mt-8 max-w-xl text-[17px] leading-8 text-white/65">The PSEC Social Experiment Database is a student-led archive for social science research ideas, formal protocols, completed projects, and the theories that keep them moving.</p>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
              <a href="#archive-search" className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full border border-signal bg-signal px-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-ink active:scale-[.98]"><Search size={15} /> Explore archive</a>
              <Link href="/submit" className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[.03] px-4 text-center font-mono text-[10px] uppercase tracking-[.13em] text-white/85"><Sparkles size={15} /> Add a research idea</Link>
              <Link href="/submit-evidence" className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full border border-[#9dc4f4]/60 bg-[#0d2c54]/55 px-4 text-center font-mono text-[10px] uppercase tracking-[.13em] text-[#d3e5fd]"><FileUp size={15} /> Add experiment evidence</Link>
              <Link href="/psec-admin-review-queue" className="focus-ring flex h-12 items-center justify-center gap-2 rounded-full border border-[#9dc4f4] bg-[#0b4ea2] px-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-white shadow-[0_5px_16px_rgba(2,18,45,.28)]"><LockKeyhole size={14} /> Admin Access</Link>
            </div>
          </div>
          <div className="flex items-center lg:justify-end">
            <div className="glass-panel-dark w-full max-w-md rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-white/50">Archive status</span><span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#a9d3a2]"><span className="h-2 w-2 rounded-full bg-[#9ed08f]" /> Live</span></div>
              <div className="grid grid-cols-2 gap-px bg-white/10 pt-5">
                <div className="bg-[#0c2343]/80 py-3 pr-4"><div className="font-display text-4xl text-white">{String(archiveRecords.filter((item) => item.recordKind === "reference").length).padStart(2, "0")}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[.14em] text-white/45">Reference records</div></div>
                <div className="bg-[#0c2343]/80 py-3 pl-4"><div className="font-display text-4xl text-white">04</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[.14em] text-white/45">Disciplines</div></div>
              </div>
              <div className="mt-6 flex items-start gap-3 border-l-2 border-signal pl-4 text-sm leading-6 text-white/65"><Clock3 size={16} className="mt-1 shrink-0 text-signal" /><span>All entries carry a theoretical basis and a creator-centered historical record.</span></div>
            </div>
          </div>
        </div>
        <ScrollFlask />
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 font-mono text-[9px] uppercase tracking-[.18em] text-white/35 lg:px-10"><span>Student-led social science experimental archive</span><span>Scroll to explore <ArrowDownRight size={13} className="ml-1 inline text-signal" /></span></div></div>
      </section>

      {/* Section 2: club introduction, revealed by vertical scroll. */}
      <section className="relative z-10 flex min-h-[78vh] items-center border-b border-border bg-[#f5f2eb] py-20 lg:py-28">
        <div data-flask-reveal className="overview-reveal flask-club-reveal mx-auto grid max-w-[1440px] items-center gap-10 px-5 lg:grid-cols-[.42fr_.58fr] lg:px-10">
          <div className="flask-club-mark border-l-2 border-signal pl-5"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">01 / The club</div><div className="mt-5 font-display text-5xl leading-none text-[#0b4ea2] md:text-7xl">PSEC</div></div>
          <div className="flask-club-copy"><div className="flex h-10 w-10 items-center justify-center bg-[#e1ebf6] text-primary"><BookOpenCheck size={19} /></div><h2 className="mt-7 max-w-3xl font-display text-[clamp(2.35rem,4.5vw,4.8rem)] leading-[1.04] tracking-[-.05em] text-ink">A club for turning social questions into careful experiments.</h2><p className="mt-6 max-w-2xl text-[17px] leading-8 text-muted-foreground"><strong className="font-semibold text-ink">Pinghe Social Experiment Club</strong> brings students together to notice the social world closely, form testable questions, and learn through responsible research. We treat an unfinished question as the beginning of shared work—not a dead end.</p><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">The archive is our common memory: a place to make thinking legible, recognize contributors, and give the next researcher a clearer place to begin.</p></div>
          <div className="flask-club-cards grid gap-3 border-t border-[#d9d7d1] pt-6 md:grid-cols-3 lg:col-span-2">
            <article className="flask-club-card border border-[#ccd6e1] bg-white/75 p-5"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">01 / What is PSEC</div><p className="mt-4 text-sm leading-6 text-muted-foreground">A student research club that turns social observation into ethical, testable questions.</p></article>
            <article className="flask-club-card border border-[#ccd6e1] bg-white/75 p-5"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">02 / What we archive</div><p className="mt-4 text-sm leading-6 text-muted-foreground">Ideas, designs, execution records, evidence, results, and the next question.</p></article>
            <div className="flask-club-card border border-[#0b4ea2] bg-[#0b4ea2] p-5 text-white"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b8d6fa]">03 / Begin a record</div><p className="mt-4 text-sm leading-6 text-white/75">Add your research idea and let the record grow with your work.</p><Link href="/submit" className="focus-ring mt-5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-white underline underline-offset-4"><Sparkles size={13} /> Add a Research Idea</Link></div>
          </div>
        </div>
      </section>

      {/* Section 3: database purpose and core functions, revealed by vertical scroll. */}
      <section className="navy-grid relative z-10 flex min-h-[86vh] items-center overflow-hidden py-20 text-white lg:py-28">
        <div data-overview-reveal className="overview-reveal mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-signal">02 / The database</div><h2 className="mt-5 font-display text-[clamp(2.5rem,5vw,5.4rem)] leading-[1.02] tracking-[-.055em]">Research should remain<br /><span className="text-[#9dc4f4]">in motion.</span></h2></div><p className="max-w-xl text-[17px] leading-8 text-white/65">The database connects an idea to its design, its evidence, its results, and the next question. It gives PSEC a durable, searchable record without erasing the revisions that made the work stronger.</p></div>
          <div className="mt-12 grid gap-px border border-white/15 bg-white/10 md:grid-cols-3">
            <div className="bg-[#0b213f]/85 p-6"><Database size={20} className="text-signal" /><div className="mt-10 font-mono text-[10px] uppercase tracking-[.16em] text-[#9dc4f4]">01 / Archive</div><h3 className="mt-3 font-display text-2xl">Find the thread.</h3><p className="mt-3 text-sm leading-6 text-white/60">Search references and club projects across four disciplines, then open a shareable research record.</p></div>
            <div className="bg-[#0b213f]/85 p-6"><Clock3 size={20} className="text-signal" /><div className="mt-10 font-mono text-[10px] uppercase tracking-[.16em] text-[#9dc4f4]">02 / Iterate</div><h3 className="mt-3 font-display text-2xl">Keep the trail.</h3><p className="mt-3 text-sm leading-6 text-white/60">Record submissions, review decisions, results, and reflections as an honest version history.</p></div>
            <div className="bg-[#0b213f]/85 p-6"><FileText size={20} className="text-signal" /><div className="mt-10 font-mono text-[10px] uppercase tracking-[.16em] text-[#9dc4f4]">03 / Share</div><h3 className="mt-3 font-display text-2xl">Show the evidence.</h3><p className="mt-3 text-sm leading-6 text-white/60">Publish approved reports and photos, retain member-only data, and print evidence packs for EE and CAS portfolios.</p></div>
          </div>
        </div>
      </section>

      <section id="archive-search" className="paper-grid relative z-10 flex min-h-[76vh] items-center border-b border-border py-16 lg:py-20">
        <div data-overview-reveal className="overview-reveal mx-auto w-full max-w-[1440px] px-5 lg:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">03 / Start here</div><h2 className="mt-3 font-display text-3xl tracking-[-.03em] text-ink md:text-4xl">Find a line of inquiry.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Search all approved records by experiment, theory, researcher, discipline, or library folder.</p></div><div className="relative w-full md:max-w-sm"><label htmlFor="archive-search-input" className="sr-only">Search the PSEC archive</label><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" /><input id="archive-search-input" type="search" className="focus-ring h-12 w-full border border-[#bfc9d7] bg-white/80 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/70" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive..." /></div></div>
          {query ? <div className="mt-10" aria-live="polite"><div className="mb-4 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Search results / {filtered.length} shown</div>{filtered.length === 0 ? <div className="border border-dashed border-[#aeb9c8] bg-white/60 p-8 text-center text-sm text-muted-foreground">No approved archive records match this query.</div> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Link key={item.slug} href={recordHref(item)} className="focus-ring card-lift border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[.12em] text-primary">{item.discipline} · {item.category}</span><ArrowUpRight size={15} className="shrink-0 text-muted-foreground" /></div><h3 className="mt-7 font-display text-lg leading-7">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.theoreticalBasis}</p></Link>)}</div>}</div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{DISCIPLINES.map((discipline, index) => <Link key={discipline.name} href={navMap[discipline.name]} className="focus-ring card-lift group relative min-h-[198px] overflow-hidden border border-border bg-card p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] tracking-[.15em] text-muted-foreground">{discipline.icon}</span><ArrowUpRight size={16} className="text-primary" /></div><div className="mt-16"><h3 className="font-display text-xl leading-7 tracking-[-.02em]">{discipline.name}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{discipline.short}</p></div><span className="absolute -bottom-8 -right-2 font-display text-[110px] leading-none text-[#e7eef6]">{index + 1}</span></Link>)}</div>}
        </div>
      </section>

      <section className="relative z-10 flex min-h-[82vh] items-center bg-background py-16 lg:py-20">
        <div data-overview-reveal className="overview-reveal mx-auto grid w-full max-w-[1440px] gap-12 px-5 lg:grid-cols-[1.15fr_.85fr] lg:px-10">
          <div><div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">04 / Latest results & archive</div><h2 className="mt-3 font-display text-3xl tracking-[-.03em] text-ink">Start with what was learned.</h2></div><Link href="/library/social-psychology" className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-primary sm:flex">Browse libraries <ArrowUpRight size={13} /></Link></div><div className="mt-8 divide-y divide-border border-y border-border">{featuredRecords.map((item, index) => <Link key={item.slug} href={recordHref(item)} className="focus-ring flex items-start gap-5 py-5"><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-primary">{item.discipline}</span>{item.results && <><span className="h-1 w-1 rounded-full bg-signal" /><span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#3f7b44]">Results added</span></>}<span className="h-1 w-1 rounded-full bg-signal" /><span className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{item.authorName || "PSEC archive"}</span></div><h3 className="mt-2 font-display text-xl tracking-[-.02em]">{item.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.results || item.abstract || item.theoreticalBasis}</p></div><ArrowUpRight size={16} className="mt-1 shrink-0 text-muted-foreground" /></Link>)}{archiveRecords.length === 0 && <div className="py-6 text-sm text-muted-foreground">No published records are available yet.</div>}</div></div>
          <div className="border border-border bg-[#edf3f9] p-7"><div className="flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">05 / Latest submissions</div><FileText size={18} className="text-primary" /></div><h2 className="mt-4 font-display text-2xl tracking-[-.03em]">Your next study<br />starts here.</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">Submit an unfinished concept, a ready-to-run protocol, or a completed project. Every entry keeps its author, timestamp, and iteration trail.</p><Link href="/submit" className="focus-ring mt-6 flex w-fit items-center gap-2 bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white active:scale-[.97]">Open submission form <ArrowUpRight size={14} /></Link><div className="mt-8 border-t border-[#cbd8e6] pt-5">{latest.data && latest.data.length > 0 ? latest.data.slice(0, 2).map((item) => <div key={item.id} className="border-b border-[#cbd8e6] py-3 last:border-0"><div className="font-mono text-[9px] uppercase tracking-[.12em] text-primary">{item.discipline} · {item.status}</div><div className="mt-1 text-sm font-medium">{item.title}</div></div>) : <div className="font-mono text-[10px] uppercase tracking-[.12em] leading-5 text-muted-foreground">No member records yet — be the first to add one.</div>}</div></div>
        </div>
      </section>

      <section className="relative z-10 border-y border-border bg-[#ece9e2]"><div data-overview-reveal className="overview-reveal mx-auto grid max-w-[1440px] gap-8 px-5 py-16 lg:grid-cols-3 lg:px-10 lg:py-20"><div className="lg:col-span-1"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">06 / Archive notes</div><h2 className="mt-3 font-display text-2xl tracking-[-.03em]">Make the idea legible.</h2></div><div className="grid gap-7 text-sm leading-6 text-muted-foreground md:grid-cols-3 lg:col-span-2"><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">01 — Standardize</span><p className="mt-2">Use consistent fields across disciplines so another member can understand and extend the work.</p></div><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">02 — Iterate</span><p className="mt-2">Archive unfinished work honestly. A clear next question is already a useful result.</p></div><div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink">03 — Protect participants</span><p className="mt-2">Plan consent, privacy, debriefing, risk minimization, and adult or school review before collecting human-subject data.</p></div></div></div></section>
    </div>
  );
}
