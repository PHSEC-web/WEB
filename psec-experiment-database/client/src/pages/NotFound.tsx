import { AlertCircle, BookOpen, Home, Search } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="page-detail">
      <div className="page-container py-16 lg:py-24">
        <div className="surface-card mx-auto max-w-2xl px-6 py-12 text-center md:px-14 md:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="section-kicker mt-7">PSEC / 404</div>
          <h1 className="mt-3 font-display text-5xl leading-none tracking-[-.03em] text-ink">
            404
          </h1>

          <h2 className="mt-5 font-display text-2xl tracking-[-.02em] text-ink">
            {t("pageNotFound")}
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            {t("pageNotFoundDescription")}
          </p>

          <div
            id="not-found-button-group"
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[.98]"
            >
              <Home size={16} aria-hidden="true" />
              {t("goHome")}
            </Link>
            <Link
              href="/library/social-psychology"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              <BookOpen size={16} aria-hidden="true" />
              {t("exploreArchive")}
            </Link>
          </div>

          <Link
            href="/#archive-search"
            className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <Search size={15} aria-hidden="true" />
            {t("search")}
          </Link>
        </div>
      </div>
    </div>
  );
}
