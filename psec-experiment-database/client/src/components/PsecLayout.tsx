import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, Menu, Plus, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/library/social-psychology", label: "Social Psychology" },
  { href: "/library/behavioral-economics", label: "Behavioral Economics" },
  { href: "/library/sociology", label: "Sociology" },
  { href: "/library/moral-political-philosophy", label: "Philosophy" },
];

export default function PsecLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="navy-grid sticky top-0 z-30 border-b border-white/10 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <Link href="/" className="focus-ring group flex shrink-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/25 bg-white/10 text-signal transition-colors group-hover:bg-signal group-hover:text-ink"><BookOpen size={17} strokeWidth={1.8} /></span>
            <span className="hidden sm:block">
              <span className="block font-mono text-[10px] uppercase tracking-[.22em] text-white/55">PSEC / Archive 01</span>
              <span className="block text-[15px] font-semibold tracking-tight">Social Experiment Database</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={`focus-ring px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] transition-colors ${active ? "bg-white/12 text-signal" : "text-white/65 hover:bg-white/8 hover:text-white"}`}>{item.label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/#archive-search" className="focus-ring hidden items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-white/65 transition-colors hover:text-white lg:flex"><Search size={14} /> Search</Link>
            <Link href="/my-records" className="focus-ring hidden px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-white/65 transition-colors hover:text-white lg:block">My records</Link>
            <Link href="/submit" className="focus-ring hidden items-center gap-2 bg-signal px-3.5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-ink transition-transform active:scale-[.97] sm:flex"><Plus size={14} strokeWidth={2.4} /> Submit an idea</Link>
            <button aria-label="Toggle navigation menu" className="focus-ring flex h-10 w-10 items-center justify-center border border-white/20 text-white xl:hidden" onClick={() => setMobileOpen((value) => !value)}><Menu size={19} /></button>
          </div>
        </div>
        {mobileOpen && <nav className="border-t border-white/10 px-5 py-3 xl:hidden" aria-label="Mobile navigation">
          <div className="grid gap-1">
            {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="focus-ring px-3 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/75 hover:bg-white/10 hover:text-signal">{item.label}</Link>)}
            <Link href="/my-records" onClick={() => setMobileOpen(false)} className="focus-ring px-3 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/75 hover:bg-white/10 hover:text-signal">My records</Link>
            <Link href="/submit" onClick={() => setMobileOpen(false)} className="focus-ring mt-2 flex items-center gap-2 bg-signal px-3 py-3 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-ink"><Plus size={14} /> Submit an idea</Link>
          </div>
        </nav>}
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-[#d9d7d1] bg-[#ece9e2]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 md:grid-cols-[1fr_auto] md:items-end lg:px-10">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#0b4ea2]"><span className="h-2 w-2 bg-signal" /> PSEC internal academic archive</div>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">A shared research memory for experiments, thought frameworks, and next questions. Built for careful iteration by PSEC members.</p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-x-5 gap-y-3 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            <Link href="/submit" className="transition-colors hover:text-primary">Submission guidelines <ArrowUpRight size={12} className="ml-1 inline" /></Link>
            <Link href="/my-records" className="transition-colors hover:text-primary">My records <ArrowUpRight size={12} className="ml-1 inline" /></Link>
            <span>All rights reserved · 2026</span>
            <Link href="/psec-admin-review-queue" aria-label="Admin Access" className="fixed bottom-5 right-5 z-50 border-2 border-[#072f66] bg-[#0b4ea2] px-4 py-2.5 text-xs font-semibold normal-case tracking-wide text-white shadow-lg transition-all hover:bg-[#083d80] hover:shadow-xl active:scale-95">Admin Access</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
