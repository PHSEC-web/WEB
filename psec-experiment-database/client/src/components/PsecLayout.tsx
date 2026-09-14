import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, Languages, Menu, Plus, Search, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArchiveSearchLink } from "./PsecPrimitives";
import { useLanguage } from "../contexts/LanguageContext";

const navItems = [
  { href: "/", key: "overview" as const },
  { href: "/library/social-psychology", key: "archive" as const },
];

export default function PsecLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const evidenceLayout = location.startsWith("/records/") && location.endsWith("/evidence");

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  return (
    <div className={`min-h-screen bg-background text-foreground ${evidenceLayout ? "evidence-layout" : ""}`}>
      <header className="no-print navy-grid glass-header sticky top-0 z-30 border-b border-white/10 text-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          <Link href="/" className="focus-ring group flex shrink-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/25 bg-white/10 text-signal transition-colors group-hover:bg-signal group-hover:text-ink"><BookOpen size={17} strokeWidth={1.8} /></span>
            <span className="hidden sm:block">
              <span className="block font-mono text-[10px] tracking-[.12em] text-white/55">PSEC / {t("brandArchive")}</span>
              <span className="block text-[15px] font-semibold">{t("brandTitle")}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t("primaryNavigation")}>
            {navItems.map((item) => {
              const active = item.href === "/" ? location === "/" : location.startsWith("/library");
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`focus-ring rounded-full px-3.5 py-2 text-sm transition-colors ${active ? "bg-white/15 text-signal" : "text-white/68 hover:bg-white/10 hover:text-white"}`}>{t(item.key)}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ArchiveSearchLink className="focus-ring hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-white/68 transition-colors hover:bg-white/10 hover:text-white md:flex"><Search size={14} aria-hidden="true" /> {t("search")}</ArchiveSearchLink>
            <Link href="/my-records" className="focus-ring hidden rounded-full px-3 py-2 text-sm text-white/68 transition-colors hover:bg-white/10 hover:text-white sm:block">{t("myRecords")}</Link>
            <Link href="/submit" className="focus-ring hidden items-center gap-2 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_20px_rgba(183,210,251,.18)] transition-transform active:scale-[.97] sm:flex"><Plus size={14} strokeWidth={2.4} /> {t("submitIdea")}</Link>
            <button type="button" aria-label={`${t("languageLabel")}: ${language === "zh" ? "English" : "中文"}`} onClick={toggleLanguage} className="focus-ring language-toggle hidden items-center gap-2 border border-white/20 px-3 py-2 text-sm text-white/75 transition-colors hover:border-white/45 hover:bg-white/10 hover:text-white sm:flex"><Languages size={14} aria-hidden="true" /><span>{language === "zh" ? "EN" : "中"}</span></button>
            <button type="button" aria-label={t("menu")} aria-expanded={mobileOpen} aria-controls="mobile-navigation" className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}</button>
          </div>
        </div>
        {mobileOpen && <nav id="mobile-navigation" className="no-print border-t border-white/10 px-5 py-4 lg:hidden" aria-label={t("mobileNavigation")}>
          <div className="mx-auto grid max-w-2xl gap-1">
            {navItems.map((item) => {
              const active = item.href === "/" ? location === "/" : location.startsWith("/library");
              return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={`focus-ring rounded-lg px-3 py-3 text-sm transition-colors ${active ? "bg-white/12 text-signal" : "text-white/75 hover:bg-white/10 hover:text-signal"}`}>{t(item.key)}</Link>;
            })}
            <ArchiveSearchLink onClick={() => setMobileOpen(false)} className="focus-ring flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-signal"><Search size={15} aria-hidden="true" /> {t("search")}</ArchiveSearchLink>
            <Link href="/my-records" onClick={() => setMobileOpen(false)} className="focus-ring rounded-lg px-3 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-signal">{t("myRecords")}</Link>
            <button type="button" aria-label={`${t("languageLabel")}: ${language === "zh" ? "English" : "中文"}`} onClick={toggleLanguage} className="focus-ring flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-signal"><Languages size={15} aria-hidden="true" /> {language === "zh" ? "English" : "中文"}</button>
            <Link href="/submit" onClick={() => setMobileOpen(false)} className="focus-ring mt-2 flex items-center gap-2 rounded-lg bg-signal px-3 py-3 text-sm font-medium text-ink"><Plus size={14} aria-hidden="true" /> {t("submitIdea")}</Link>
          </div>
        </nav>}
      </header>

      <main>{children}</main>

      <footer className="no-print mt-20 border-t border-border surface-band-muted">
        <div className="page-container grid gap-10 py-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs text-primary"><span className="h-2 w-2 rounded-sm bg-signal" /> PSEC {t("archive")}</div>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">{t("footerDescription")}</p>
          </div>
          <div className="flex flex-wrap items-end justify-start gap-x-5 gap-y-3 text-xs text-muted-foreground md:justify-end">
            <Link href="/submit" className="transition-colors hover:text-primary">{t("submissionGuidelines")} <ArrowUpRight size={12} className="ml-1 inline" /></Link>
            <Link href="/my-records" className="transition-colors hover:text-primary">{t("myRecords")} <ArrowUpRight size={12} className="ml-1 inline" /></Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">{t("privacyPolicy")}</Link>
            <Link href="/terms" className="transition-colors hover:text-primary">{t("termsOfUse")}</Link>
            <Link href="/research-ethics" className="transition-colors hover:text-primary">{t("researchEthics")}</Link>
            <Link href="/content-policy" className="transition-colors hover:text-primary">{t("contentPolicy")}</Link>
            <span>{t("rights")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
