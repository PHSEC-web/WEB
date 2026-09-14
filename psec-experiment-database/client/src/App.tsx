import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PsecLayout from "./components/PsecLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useLanguage } from "./contexts/LanguageContext";

const AdminReview = lazy(() => import("./pages/AdminReview"));
const Home = lazy(() => import("./pages/Home"));
const Library = lazy(() => import("./pages/Library"));
const Submission = lazy(() => import("./pages/Submission"));
const EvidenceSubmission = lazy(() => import("./pages/EvidenceSubmission"));
const MyRecords = lazy(() => import("./pages/MyRecords"));
const RecordDetail = lazy(() => import("./pages/RecordDetail"));
const EvidenceSheet = lazy(() => import("./pages/EvidenceSheet"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Legal = lazy(() => import("./pages/Legal"));

function PageLoader() {
  const { t } = useLanguage();
  return <div className="flex min-h-[45vh] items-center justify-center bg-background" role="status" aria-live="polite"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{t("loading")}</span></div>;
}

function RouteEffects() {
  const [location] = useLocation();
  const { language, t } = useLanguage();

  useEffect(() => {
    const titleForPath = location === "/"
      ? t("overview")
      : location.startsWith("/library")
        ? t("archive")
        : location === "/submit"
          ? t("submissionGuidelines")
          : location === "/submit-evidence"
            ? t("addEvidence")
            : location === "/my-records"
              ? t("myRecords")
              : location === "/login"
                ? t("memberAccess")
                : location === "/privacy"
                  ? t("privacyPolicy")
                  : location === "/terms"
                    ? t("termsOfUse")
                    : location === "/research-ethics"
                      ? t("researchEthics")
                      : location === "/content-policy"
                        ? t("contentPolicy")
                        : location.includes("/evidence")
                          ? t("evidencePack")
                          : location.startsWith("/records/")
                            ? t("recordLabel")
                            : location === "/psec-admin-review-queue"
                              ? t("adminReviewQueue")
                              : "404";
    document.title = `${titleForPath} · ${t("brandTitle")}`;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language, location, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
    let attempts = 0;
    let frame = 0;
    const restorePosition = () => {
      if (window.location.hash === "#archive-search") {
        const target = document.getElementById("archive-search");
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
        if (attempts < 20) {
          attempts += 1;
          frame = window.requestAnimationFrame(restorePosition);
        }
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    frame = window.requestAnimationFrame(restorePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return null;
}

function PublicRouter() {
  return <PsecLayout>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/library/social-psychology"><Library discipline="Social Psychology" /></Route>
        <Route path="/library/behavioral-economics"><Library discipline="Behavioral Economics" /></Route>
        <Route path="/library/sociology"><Library discipline="Sociology" /></Route>
        <Route path="/library/moral-political-philosophy"><Library discipline="Moral & Political Philosophy" /></Route>
        <Route path="/submit" component={Submission} />
        <Route path="/login" component={Login} />
        <Route path="/privacy"><Legal kind="privacy" /></Route>
        <Route path="/terms"><Legal kind="terms" /></Route>
        <Route path="/research-ethics"><Legal kind="research-ethics" /></Route>
        <Route path="/content-policy"><Legal kind="content-policy" /></Route>
        <Route path="/submit-evidence" component={EvidenceSubmission} />
        <Route path="/my-records" component={MyRecords} />
        <Route path="/records/:slug/evidence" component={EvidenceSheet} />
        <Route path="/records/:slug" component={RecordDetail} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  </PsecLayout>;
}

function Router() {
  return <Suspense fallback={<PageLoader />}>
    <Switch>
      <Route path="/psec-admin-review-queue" component={AdminReview} />
      <Route component={PublicRouter} />
    </Switch>
  </Suspense>;
}

function ResumeMemberFlow() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;
    const destination = localStorage.getItem("psec-after-login");
    if (!destination || !destination.startsWith("/")) return;
    localStorage.removeItem("psec-after-login");
    if (window.location.pathname !== destination) window.location.assign(destination);
  }, [loading, user]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <RouteEffects />
            <ResumeMemberFlow />
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
