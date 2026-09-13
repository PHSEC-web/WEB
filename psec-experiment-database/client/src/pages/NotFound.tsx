import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-2xl border border-border bg-card p-8 text-center shadow-[0_18px_46px_rgba(35,62,101,.09)] md:p-14">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#e9f1fb] text-primary">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="mt-7 font-mono text-[10px] tracking-[.16em] text-primary">PSEC / 404</div>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink">404</h1>

        <h2 className="mt-5 font-display text-2xl text-ink">
          {t("pageNotFound")}
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          {t("pageNotFoundDescription")}
        </p>

        <div id="not-found-button-group" className="mt-8 flex justify-center">
          <Button onClick={handleGoHome} className="focus-ring h-11 gap-2 bg-primary px-5 text-sm text-white">
            <Home className="h-4 w-4" />
            {t("goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
