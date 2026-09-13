import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PsecLayout from "./components/PsecLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { LanguageProvider } from "./contexts/LanguageContext";

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

function PageLoader() {
  return <div className="flex min-h-[45vh] items-center justify-center bg-background" role="status" aria-live="polite"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Loading archive…</span></div>;
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
