import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { PageHero, PsecField, StatusBanner } from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const schoolDomain = "@shphschool.com";

// Server replies are technical strings; members only need to know what to do next.
const noticeCopy = {
  sendFailed: {
    zh: "验证码暂时无法发送，请确认邮箱地址后重试。",
    en: "We couldn’t send the code right now. Check the address and try again.",
  },
  verifyFailed: {
    zh: "验证码不正确或已过期，请重新输入，或返回上一步获取新的验证码。",
    en: "That code is incorrect or has expired. Enter it again, or go back and request a new one.",
  },
} as const;

type Notice = { tone: "success" | "error"; text: string } | null;

export default function Login() {
  const { language, t } = useLanguage();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [destination, setDestination] = useState("/");
  const requestCode = trpc.auth.requestCode.useMutation({
    onSuccess: () => {
      setSent(true);
      setNotice({ tone: "success", text: t("codeSent") });
    },
    onError: () => setNotice({ tone: "error", text: noticeCopy.sendFailed[language] }),
  });
  const verifyCode = trpc.auth.verifyCode.useMutation({
    onSuccess: () => {
      const target = destination.startsWith("/") && !destination.startsWith("//") ? destination : "/";
      localStorage.removeItem("psec-after-login");
      navigate(target);
    },
    onError: () => setNotice({ tone: "error", text: noticeCopy.verifyFailed[language] }),
  });

  useEffect(() => {
    const saved = localStorage.getItem("psec-after-login");
    if (saved?.startsWith("/") && !saved.startsWith("//") && saved !== "/login") setDestination(saved);
  }, []);

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    requestCode.mutate({ email });
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    verifyCode.mutate({ email, code });
  };

  return (
    <div className="page-login">
      <PageHero
        compact
        backHref="/"
        backLabel={t("returnToArchive")}
        eyebrow={t("memberAccess")}
        title={t("signInSchoolEmail")}
        description={t("schoolEmailDescription")}
      />

      <section className="page-container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-3 rounded-full border border-[#b8d6bd] bg-[var(--success-surface)] px-4 py-2 text-sm font-medium text-[#315f3a]">
              <ShieldCheck size={16} aria-hidden="true" /> {t("oneTimeCode")}
            </p>
            <p className="mt-7 max-w-lg text-sm leading-7 text-muted-foreground">{t("legalConsentDescription")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Link href="/privacy" className="focus-ring rounded text-primary underline underline-offset-4 transition-opacity hover:opacity-80">{t("privacyPolicy")}</Link>
              <Link href="/terms" className="focus-ring rounded text-primary underline underline-offset-4 transition-opacity hover:opacity-80">{t("termsOfUse")}</Link>
            </div>
          </div>

          <div className="surface-card p-6 md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Mail size={20} aria-hidden="true" />
            </div>

            {!sent ? (
              <form onSubmit={submitEmail} className="mt-7">
                <h2 className="font-display text-2xl tracking-[-.02em]">{t("getSignInCode")}</h2>
                <div className="mt-6">
                  <PsecField label={t("schoolEmail")} required>
                    <input autoFocus type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={`name${schoolDomain}`} className="form-control" />
                  </PsecField>
                </div>
                <button type="submit" disabled={requestCode.isPending} className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98] disabled:opacity-60">
                  {requestCode.isPending ? t("sendingCode") : t("sendSignInCode")}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode} className="mt-7">
                <h2 className="font-display text-2xl tracking-[-.02em]">{t("enterYourCode")}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("checkEmail")} <strong className="break-all font-medium text-ink">{email}</strong>. {t("codeExpires")}</p>
                <div className="mt-6">
                  <PsecField label={t("sixDigitCode")} required>
                    <input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="form-control font-mono tracking-[.4em]" />
                  </PsecField>
                </div>
                <button type="submit" disabled={verifyCode.isPending} className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98] disabled:opacity-60">
                  {verifyCode.isPending ? t("verifying") : t("verifyContinue")}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => { setSent(false); setCode(""); setNotice(null); }} className="focus-ring mt-4 w-full rounded-full py-2 text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground transition-colors hover:text-primary">
                  {t("useDifferentEmail")}
                </button>
              </form>
            )}

            {notice && (
              <div className="mt-5">
                <StatusBanner tone={notice.tone}>
                  <span className="break-words">{notice.text}</span>
                </StatusBanner>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
