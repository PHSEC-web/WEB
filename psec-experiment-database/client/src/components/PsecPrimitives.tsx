import { AlertCircle, CheckCircle2, Info, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  aside?: ReactNode;
  compact?: boolean;
};

export function PageHero({ eyebrow, title, description, backHref, backLabel, aside, compact = false }: PageHeroProps) {
  return (
    <section className={`page-hero navy-grid ${compact ? "py-10 lg:py-12" : "py-12 lg:py-16"}`}>
      <div className="page-container grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          {backHref && backLabel && <Link href={backHref} className="focus-ring inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-signal">← {backLabel}</Link>}
          {eyebrow && <div className={`${backHref ? "mt-7" : ""} section-kicker text-signal`}>{eyebrow}</div>}
          <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.45rem,6vw,5rem)] leading-[1.08] tracking-[-.035em]">{title}</h1>
          {description && <p className="mt-5 content-measure text-base leading-7 text-white/68">{description}</p>}
        </div>
        {aside && <div className="lg:justify-self-end">{aside}</div>}
      </div>
    </section>
  );
}

export function ArchiveSearchLink({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const [location, navigate] = useLocation();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClick?.();
    if (location === "/") {
      const target = document.getElementById("archive-search");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "/#archive-search");
      return;
    }
    navigate("/#archive-search");
  };

  return <a href="/#archive-search" onClick={handleClick} className={className}>{children}</a>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
      <div>
        {eyebrow && <div className="section-kicker">{eyebrow}</div>}
        <h2 className="mt-2 font-display text-2xl tracking-[-.02em] md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBanner({ tone, children, title }: { tone: "success" | "error" | "info"; children: ReactNode; title?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  return <div className={`status-banner status-banner-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon size={17} className="mt-0.5 shrink-0" /><div>{title && <strong className="mr-1 font-semibold">{title}</strong>}{children}</div></div>;
}

export function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-32 items-center justify-center gap-3 rounded-[var(--radius-card)] border border-border bg-white/55 px-6 py-10 text-sm text-muted-foreground" role="status"><LoaderCircle size={17} className="animate-spin text-primary" />{label}</div>;
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="rounded-[var(--radius-card)] border border-dashed border-[rgba(74,101,139,.32)] bg-white/60 px-6 py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><h3 className="mt-4 font-display text-xl">{title}</h3>{description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}{action && <div className="mt-6">{action}</div>}</div>;
}

export function FormSection({ number, title, description, children, tone = "default" }: { number?: string; title: ReactNode; description?: ReactNode; children: ReactNode; tone?: "default" | "quiet" }) {
  return <section className={`rounded-[var(--radius-card)] border p-5 md:p-7 ${tone === "quiet" ? "border-[#bfd2eb] bg-[#f1f6fc]" : "border-border bg-card"}`}><div className="flex items-start gap-4 border-b border-border pb-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-mono text-xs text-primary">{number}</div><div className="min-w-0"><h2 className="font-display text-xl">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}</div></div><div className="mt-6">{children}</div></section>;
}

export function PsecField({ label, hint, required, children, error }: { label: string; hint?: string; required?: boolean; children: ReactNode; error?: string }) {
  return <label className="block"><span className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-ink"><span>{label}{required && <span className="ml-1 text-primary" aria-hidden="true">*</span>}</span>{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</span>{children}{error && <span className="mt-1 block text-xs text-danger" role="alert">{error}</span>}</label>;
}
