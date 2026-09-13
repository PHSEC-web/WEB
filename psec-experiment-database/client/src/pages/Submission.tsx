import { ArrowLeft, CheckCircle2, Database, FileUp, Image as ImageIcon, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { LEGAL_VERSIONS } from "../../../shared/legal";

type Lifecycle = "idea" | "design" | "in_progress" | "completed";
const initialForm = { memberName: "", memberId: "", discipline: "Social Psychology", lifecycle: "idea" as Lifecycle, title: "", abstract: "", theoreticalBasis: "", historicalBackground: "", hypothesis: "", procedure: "", materials: "", expectedOutput: "", attachmentName: "", attachmentData: "", attachmentMimeType: "" };
type FormState = typeof initialForm;
type UploadKind = "photo" | "data" | "report" | "protocol" | "other";
type UploadDraft = { fileName: string; data: string; mimeType: string; sizeBytes: number; kind: UploadKind };

const allowedTypes = new Set(["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/csv", "application/json", "application/zip", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png", "image/gif", "image/webp"]);
const kindFor = (file: File): UploadKind => file.type.startsWith("image/") ? "photo" : /csv|json|excel|spreadsheet|zip/.test(file.type) ? "data" : /pdf|word|document/.test(file.type) ? "report" : "other";
const uploadKindKeys = { photo: "photoFile", data: "dataFile", report: "reportFile", protocol: "protocolFile", other: "otherFile" } as const;

export default function Submission() {
  const { language, t } = useLanguage();
  const [form, setForm] = useState<FormState>(initialForm);
  const [uploads, setUploads] = useState<UploadDraft[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [fileError, setFileError] = useState("");
  const [attachmentPreparing, setAttachmentPreparing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [legalConfirmed, setLegalConfirmed] = useState({
    privacy: false,
    terms: false,
    researchSafety: false,
    contentRights: false,
  });
  const { user, loading, isAuthenticated } = useAuth();
  const submission = trpc.records.create.useMutation({ onSuccess: () => { localStorage.removeItem("psec-submission-draft"); setSubmitted(true); } });
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("psec-submission-draft");
      if (saved) setForm((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("psec-submission-draft", JSON.stringify(form)); } catch {}
  }, [form]);
  useEffect(() => {
    if (user?.name) setForm((current) => current.memberName ? current : { ...current, memberName: user.name || "" });
  }, [user?.name]);

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setFileError("");
    const remaining = 8 - uploads.length;
    if (files.length > remaining) { setFileError(language === "zh" ? `最多可附加 8 个文件。请再选择 ${remaining || "更少"} 个。` : `You can attach up to 8 files. Choose ${remaining || "fewer"} more.`); event.target.value = ""; return; }
    const invalid = files.find((file) => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) { setFileError(language === "zh" ? `${invalid.name} 不支持或超过 8 MB。请使用图片、CSV/JSON/XLSX 数据、PDF/DOC 报告或 TXT 文件。` : `${invalid.name} is not supported or is larger than 8 MB. Use images, CSV/JSON/XLSX data, PDF/DOC reports, or TXT files.`); event.target.value = ""; return; }
    setAttachmentPreparing(true);
    Promise.all(files.map((file) => new Promise<UploadDraft>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, data: typeof reader.result === "string" ? reader.result : "", mimeType: file.type || "application/octet-stream", sizeBytes: file.size, kind: kindFor(file) });
      reader.onerror = () => reject(new Error(`${t("couldNotReadFile")} ${file.name}`));
      reader.readAsDataURL(file);
    }))).then((next) => setUploads((current) => [...current, ...next])).catch((error: Error) => setFileError(error.message)).finally(() => setAttachmentPreparing(false));
    event.target.value = "";
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setValidationError("");
    if (attachmentPreparing) return setValidationError(t("pleaseWaitFiles"));
    if (!form.memberName.trim()) return setValidationError(t("enterSubmitter"));
    if (!form.title.trim()) return setValidationError(t("enterTitle"));
    if (!form.abstract.trim()) return setValidationError(t("enterSummary"));
    if (!Object.values(legalConfirmed).every(Boolean)) return setValidationError(t("legalConsentRequired"));
    if (!isAuthenticated) { setValidationError(t("signInBeforeSubmitting")); localStorage.setItem("psec-after-login", "/submit"); startLogin(); return; }
    submission.mutate({
      ...form,
      attachments: uploads,
      legalConsent: {
        privacyVersion: LEGAL_VERSIONS.privacy,
        termsVersion: LEGAL_VERSIONS.terms,
        researchSafetyVersion: LEGAL_VERSIONS.researchSafety,
        contentRightsVersion: LEGAL_VERSIONS.contentRights,
      },
    });
  };
  const reset = () => { setForm(initialForm); setUploads([]); setFileError(""); setAttachmentPreparing(false); setValidationError(""); setLegalConfirmed({ privacy: false, terms: false, researchSafety: false, contentRights: false }); setSubmitted(false); localStorage.removeItem("psec-submission-draft"); };

  if (submitted) return <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24"><div className="mx-auto max-w-2xl border border-[#b8ccb5] bg-[#edf5eb] p-8 text-center md:p-14"><CheckCircle2 className="mx-auto text-[#3f7b44]" size={36} strokeWidth={1.5} /><div className="mt-5 font-mono text-[10px] uppercase tracking-[.2em] text-[#3f7b44]">{t("submissionReceived")}</div><h1 className="mt-4 font-display text-4xl tracking-[-.04em]">{t("submissionPendingTitle")}</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground">{t("submissionSavedDetails")}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/my-records" className="focus-ring flex items-center gap-2 bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white">{t("openMyRecords")}</Link><button onClick={reset} className="focus-ring flex items-center gap-2 border border-border bg-white px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-ink">{t("submitAnother")}</button></div></div></div>;

  return <div><section className="navy-grid text-white"><div className="mx-auto max-w-[1440px] px-5 pb-14 pt-14 lg:px-10 lg:pb-18 lg:pt-20"><Link href="/" className="focus-ring inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/45 hover:text-signal"><ArrowLeft size={13} /> {t("backToOverview")}</Link><div className="mt-10 font-mono text-[10px] uppercase tracking-[.2em] text-signal">06 / {t("memberSubmissionPage")}</div><h1 className="mt-4 max-w-3xl font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-.06em]">{t("putQuestion")}<br /><span className="text-[#9dc4f4]">{t("onRecord")}</span></h1><p className="mt-6 max-w-2xl text-[16px] leading-7 text-white/60">{t("submissionHeroDescription")}</p></div></section>
    <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 lg:grid-cols-[1fr_310px] lg:px-10 lg:py-16"><form onSubmit={onSubmit} className="space-y-8">
      <section className="border border-border bg-card p-5 md:p-7"><SectionHead number="01" title={t("startProjectRecord")} text={t("startProjectRecordText")} /><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label={t("submitterName")} required><input value={form.memberName} onChange={(e) => update("memberName", e.target.value)} placeholder={t("namePlaceholder")} className="form-control" /></Field><Field label={t("experimentProjectTitle")} required><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={t("titlePlaceholder")} className="form-control" /></Field><div className="md:col-span-2"><Field label={t("oneSentenceSummary")} required hint={t("usedInArchive")}><textarea value={form.abstract} onChange={(e) => update("abstract", e.target.value)} placeholder={t("experimentSummaryPlaceholder")} className="form-control min-h-24 resize-y" /></Field></div><Field label={t("disciplineLabel")} hint={t("optional")}><select value={form.discipline} onChange={(e) => update("discipline", e.target.value)} className="form-control"><option value="Social Psychology">{t("socialPsychology")}</option><option value="Behavioral Economics">{t("behavioralEconomics")}</option><option value="Sociology">{t("sociology")}</option><option value="Moral & Political Philosophy">{t("philosophy")}</option></select></Field><Field label={t("researchStage")} hint={t("optional")}><select value={form.lifecycle} onChange={(e) => update("lifecycle", e.target.value)} className="form-control"><option value="idea">{t("ideaStage")}</option><option value="design">{t("designStage")}</option><option value="in_progress">{t("inProgressStage")}</option><option value="completed">{t("completedStage")}</option></select></Field><Field label={t("memberIdHandle")} hint={t("optional")}><input value={form.memberId} onChange={(e) => update("memberId", e.target.value)} placeholder={t("memberIdPlaceholder")} className="form-control" /></Field></div></section>
      <section className="border border-border bg-card p-5 md:p-7"><SectionHead number="02" title={t("makeIdeaLegible")} text={t("makeIdeaLegibleText")} /><div className="mt-6 space-y-5"><Field label={t("theoreticalBasis")} hint={t("optional")}><textarea value={form.theoreticalBasis} onChange={(e) => update("theoreticalBasis", e.target.value)} placeholder={t("theoryPlaceholder")} className="form-control min-h-32 resize-y" /></Field><Field label={t("creatorHistory")} hint={t("optional")}><textarea value={form.historicalBackground} onChange={(e) => update("historicalBackground", e.target.value)} placeholder={t("historyPlaceholder")} className="form-control min-h-32 resize-y" /></Field><Field label={t("researchHypothesis")} hint={t("optional")}><textarea value={form.hypothesis} onChange={(e) => update("hypothesis", e.target.value)} placeholder={t("hypothesisPlaceholder")} className="form-control min-h-28 resize-y" /></Field></div></section>
      <section className="border border-border bg-card p-5 md:p-7"><SectionHead number="03" title={t("makeItRunnable")} text={t("makeItRunnableText")} /><div className="mt-6 space-y-5"><Field label={t("proposedProcedure")} hint={t("optional")}><textarea value={form.procedure} onChange={(e) => update("procedure", e.target.value)} placeholder={t("procedurePlaceholder")} className="form-control min-h-40 resize-y" /></Field><Field label={t("requiredMaterials")} hint={t("optional")}><textarea value={form.materials} onChange={(e) => update("materials", e.target.value)} placeholder={t("materialsPlaceholder")} className="form-control min-h-24 resize-y" /></Field><Field label={t("expectedAcademicOutput")} hint={t("optional")}><select value={form.expectedOutput} onChange={(e) => update("expectedOutput", e.target.value)} className="form-control"><option value="">{t("notAssignedYet")}</option><option value="IB Extended Essay">{t("ibExtendedEssay")}</option><option value="Academic competition">{t("academicCompetition")}</option><option value="CAS activity">{t("casActivity")}</option><option value="Club research">{t("clubResearch")}</option><option value="Unassigned / exploratory">{t("unassignedExploratory")}</option></select></Field></div></section>
      <section className="border border-[#9fb0c4] bg-[#eef4f9] p-5 md:p-7"><div className="flex items-start gap-4 border-b border-[#c7d4e1] pb-5"><div className="flex h-8 w-8 items-center justify-center bg-white font-mono text-[10px] text-primary">04</div><div><h2 className="font-display text-xl">{t("experimentalEvidence")}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("experimentalEvidenceText")}</p></div></div><label className="focus-ring mt-6 flex min-h-16 cursor-pointer items-center gap-3 border border-dashed border-[#7897b8] bg-white px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"><FileUp size={18} /><span><strong className="block font-medium text-ink">{t("addPhotosProcessData")}</strong><span className="text-xs">{t("supportedFileTypes")}</span></span><input type="file" multiple accept="image/*,.csv,.json,.xlsx,.xls,.zip,.pdf,.doc,.docx,.txt" onChange={onFilesChange} className="sr-only" /></label>{uploads.length > 0 && <div className="mt-4 grid gap-2 md:grid-cols-2">{uploads.map((file, index) => <div key={`${file.fileName}-${index}`} className="flex items-center gap-3 border border-[#c7d4e1] bg-white p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#e7eef6] text-primary">{file.kind === "photo" ? <ImageIcon size={15} /> : <Database size={15} />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{file.fileName}</strong><span className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">{t(uploadKindKeys[file.kind])} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</span></span><button type="button" aria-label={`${t("removeFile")} ${file.fileName}`} onClick={() => setUploads((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-muted-foreground hover:text-[#8a2c2c]"><Trash2 size={15} /></button></div>)}</div>}</section>
      {(validationError || fileError || submission.error) && <div role="alert" className="border border-[#d9a7a7] bg-[#fff1f1] px-4 py-3 text-sm text-[#8a2c2c]">{validationError || fileError || submission.error?.message || t("saveRecordError")}</div>}
      <section className="border border-[#9fb0c4] bg-[#eef4f9] p-5 md:p-7">
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">{t("legalConsentTitle")}</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("legalConsentDescription")}</p>
        <div className="mt-5 space-y-3 text-sm leading-6 text-ink">
          <label className="flex items-start gap-3"><input type="checkbox" checked={legalConfirmed.privacy} onChange={event => setLegalConfirmed(current => ({ ...current, privacy: event.target.checked }))} className="mt-1" /><span>{t("acceptPrivacy")} · <Link href="/privacy" target="_blank" className="text-primary underline">{t("privacyPolicy")}</Link></span></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={legalConfirmed.terms} onChange={event => setLegalConfirmed(current => ({ ...current, terms: event.target.checked }))} className="mt-1" /><span>{t("acceptTerms")} · <Link href="/terms" target="_blank" className="text-primary underline">{t("termsOfUse")}</Link></span></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={legalConfirmed.researchSafety} onChange={event => setLegalConfirmed(current => ({ ...current, researchSafety: event.target.checked }))} className="mt-1" /><span>{t("acceptResearchSafety")} · <Link href="/research-ethics" target="_blank" className="text-primary underline">{t("researchEthics")}</Link></span></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={legalConfirmed.contentRights} onChange={event => setLegalConfirmed(current => ({ ...current, contentRights: event.target.checked }))} className="mt-1" /><span>{t("acceptContentRights")} · <Link href="/content-policy" target="_blank" className="text-primary underline">{t("contentPolicy")}</Link></span></label>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground"><ShieldCheck size={14} className="text-[#3f7b44]" /> {t("autoTimestamped")}</div><Button type="submit" disabled={submission.isPending || attachmentPreparing} className="focus-ring h-12 gap-2 bg-primary px-6 font-mono text-[10px] uppercase tracking-[.14em] text-white hover:bg-[#083d80]">{attachmentPreparing ? t("preparingFiles") : submission.isPending ? t("savingRecord") : t("submitToArchive")} <Send size={14} /></Button></div>
    </form><aside className="h-fit border border-border bg-[#ece9e2] p-6 lg:sticky lg:top-24"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">{t("submissionProtocol")}</div><div className="mt-6 space-y-5 text-sm leading-6 text-muted-foreground"><p><strong className="font-medium text-ink">{t("startSmall")}</strong><br />{t("startSmallText")}</p><p><strong className="font-medium text-ink">{t("preserveEvidence")}</strong><br />{t("preserveEvidenceText")}</p><p><strong className="font-medium text-ink">{t("protectParticipants")}</strong><br />{t("protectParticipantsText")}</p></div><div className="mt-7 border-t border-[#d2cec4] pt-5 font-mono text-[9px] uppercase tracking-[.13em] leading-5 text-muted-foreground">{t("uploadsPrivate")}</div></aside></div>
  </div>;
}

function SectionHead({ number, title, text }: { number: string; title: string; text: string }) { return <div className="flex items-start gap-4 border-b border-border pb-5"><div className="flex h-8 w-8 items-center justify-center bg-[#e7eef6] font-mono text-[10px] text-primary">{number}</div><div><h2 className="font-display text-xl">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div></div>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[.13em] text-ink"><span>{label} {required && <span className="text-primary">*</span>}</span>{hint && <span className="text-[9px] normal-case tracking-normal text-muted-foreground">{hint}</span>}</span>{children}</label>; }
