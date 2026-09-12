import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const schoolDomain = "@shphschool.com";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [destination, setDestination] = useState("/");
  const requestCode = trpc.auth.requestCode.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("A six-digit code was sent to your school email.");
    },
    onError: (error) => setMessage(error.message),
  });
  const verifyCode = trpc.auth.verifyCode.useMutation({
    onSuccess: () => {
      const target = destination.startsWith("/") && !destination.startsWith("//") ? destination : "/";
      localStorage.removeItem("psec-after-login");
      navigate(target);
    },
    onError: (error) => setMessage(error.message),
  });

  useEffect(() => {
    const saved = localStorage.getItem("psec-after-login");
    if (saved?.startsWith("/") && !saved.startsWith("//") && saved !== "/login") setDestination(saved);
  }, []);

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    requestCode.mutate({ email });
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    verifyCode.mutate({ email, code });
  };

  return <div className="min-h-[calc(100vh-74px)] bg-[#f5f2eb] px-5 py-16 lg:px-10 lg:py-24">
    <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">PSEC member access</div>
        <h1 className="mt-4 max-w-xl font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-.06em]">Sign in with your<br /><span className="text-[#0b4ea2]">school email.</span></h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">Use your verified `@shphschool.com` address to access submissions, project records, and member-only evidence.</p>
        <div className="mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.14em] text-[#3f7b44]"><ShieldCheck size={16} /> One-time verification code</div>
      </div>
      <div className="border border-border bg-card p-7 md:p-9">
        <div className="flex h-11 w-11 items-center justify-center bg-[#e7eef6] text-primary"><Mail size={20} /></div>
        {!sent ? <form onSubmit={submitEmail} className="mt-7">
          <h2 className="font-display text-2xl">Get a sign-in code</h2>
          <label className="mt-6 block"><span className="form-label">School email</span><input autoFocus type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={`name${schoolDomain}`} className="form-control mt-2" /></label>
          <button type="submit" disabled={requestCode.isPending} className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 bg-primary font-mono text-[10px] uppercase tracking-[.14em] text-white hover:bg-[#083d80]">{requestCode.isPending ? "Sending code…" : "Send sign-in code"}<ArrowRight size={15} /></button>
        </form> : <form onSubmit={submitCode} className="mt-7">
          <h2 className="font-display text-2xl">Enter your code</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Check <strong className="font-medium text-ink">{email}</strong>. The code expires in 10 minutes.</p>
          <label className="mt-6 block"><span className="form-label">Six-digit code</span><input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="form-control mt-2 font-mono tracking-[.4em]" /></label>
          <button type="submit" disabled={verifyCode.isPending} className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 bg-primary font-mono text-[10px] uppercase tracking-[.14em] text-white hover:bg-[#083d80]">{verifyCode.isPending ? "Verifying…" : "Verify and continue"}<ArrowRight size={15} /></button>
          <button type="button" onClick={() => { setSent(false); setCode(""); setMessage(""); }} className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-primary">Use a different email</button>
        </form>}
        {message && <div role="alert" className={`mt-5 flex items-start gap-2 border px-3 py-3 text-sm leading-5 ${requestCode.isSuccess && !verifyCode.isError ? "border-[#b8ccb5] bg-[#edf5eb] text-[#315736]" : "border-[#d9a7a7] bg-[#fff1f1] text-[#8a2c2c]"}`}><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message}</div>}
        <Link href="/" className="mt-7 block text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-primary">Return to archive</Link>
      </div>
    </div>
  </div>;
}
