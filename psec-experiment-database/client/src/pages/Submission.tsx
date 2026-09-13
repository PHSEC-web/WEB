import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileUp,
  Image as ImageIcon,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  FormSection,
  PageHero,
  PsecField,
  StatusBanner,
} from "@/components/PsecPrimitives";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { LEGAL_VERSIONS } from "../../../shared/legal";

type Lifecycle = "idea" | "design" | "in_progress" | "completed";
type UploadKind = "photo" | "data" | "report" | "protocol" | "other";

const initialForm = {
  memberName: "",
  memberId: "",
  discipline: "Social Psychology",
  lifecycle: "idea" as Lifecycle,
  title: "",
  abstract: "",
  theoreticalBasis: "",
  historicalBackground: "",
  hypothesis: "",
  procedure: "",
  materials: "",
  expectedOutput: "",
  attachmentName: "",
  attachmentData: "",
  attachmentMimeType: "",
};

type FormState = typeof initialForm;
type UploadDraft = {
  fileName: string;
  data: string;
  mimeType: string;
  sizeBytes: number;
  kind: UploadKind;
};

const allowedTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/json",
  "application/zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const kindFor = (file: File): UploadKind =>
  file.type.startsWith("image/")
    ? "photo"
    : /csv|json|excel|spreadsheet|zip/.test(file.type)
      ? "data"
      : /pdf|word|document/.test(file.type)
        ? "report"
        : "other";

const uploadKindKeys = {
  photo: "photoFile",
  data: "dataFile",
  report: "reportFile",
  protocol: "protocolFile",
  other: "otherFile",
} as const;

const legalInitialState = {
  privacy: false,
  terms: false,
  researchSafety: false,
  contentRights: false,
};

export default function Submission() {
  const { language, t } = useLanguage();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [uploads, setUploads] = useState<UploadDraft[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [fileError, setFileError] = useState("");
  const [attachmentPreparing, setAttachmentPreparing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [legalConfirmed, setLegalConfirmed] = useState(legalInitialState);
  const submission = trpc.records.create.useMutation({
    onSuccess: () => {
      localStorage.removeItem("psec-submission-draft");
      setSubmitted(true);
    },
  });

  const update = (key: keyof FormState, value: string) =>
    setForm(current => ({ ...current, [key]: value }));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("psec-submission-draft");
      if (saved) {
        setForm(current => ({ ...current, ...JSON.parse(saved) }));
      }
    } catch {
      localStorage.removeItem("psec-submission-draft");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("psec-submission-draft", JSON.stringify(form));
    } catch {
      return;
    }
  }, [form]);

  useEffect(() => {
    if (user?.name) {
      setForm(current =>
        current.memberName ? current : { ...current, memberName: user.name || "" },
      );
    }
  }, [user?.name]);

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setFileError("");
    const remaining = 8 - uploads.length;
    if (files.length > remaining) {
      setFileError(
        language === "zh"
          ? `最多可附加 8 个文件。请再选择 ${remaining || "更少"} 个。`
          : `You can attach up to 8 files. Choose ${remaining || "fewer"} more.`,
      );
      return;
    }
    const invalid = files.find(
      file => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setFileError(
        language === "zh"
          ? `${invalid.name} 不支持或超过 8 MB。请使用图片、CSV/JSON/XLSX 数据、PDF/DOC 报告或 TXT 文件。`
          : `${invalid.name} is not supported or is larger than 8 MB. Use images, CSV/JSON/XLSX data, PDF/DOC reports, or TXT files.`,
      );
      return;
    }
    setAttachmentPreparing(true);
    Promise.all(
      files.map(
        file =>
          new Promise<UploadDraft>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                fileName: file.name,
                data: typeof reader.result === "string" ? reader.result : "",
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                kind: kindFor(file),
              });
            reader.onerror = () =>
              reject(new Error(`${t("couldNotReadFile")} ${file.name}`));
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then(next => setUploads(current => [...current, ...next]))
      .catch((error: Error) => setFileError(error.message))
      .finally(() => setAttachmentPreparing(false));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    submission.reset();
    if (attachmentPreparing) {
      setValidationError(t("pleaseWaitFiles"));
      return;
    }
    if (!form.memberName.trim()) {
      setValidationError(t("enterSubmitter"));
      return;
    }
    if (!form.title.trim()) {
      setValidationError(t("enterTitle"));
      return;
    }
    if (!form.abstract.trim()) {
      setValidationError(t("enterSummary"));
      return;
    }
    if (!Object.values(legalConfirmed).every(Boolean)) {
      setValidationError(t("legalConsentRequired"));
      return;
    }
    if (!isAuthenticated) {
      setValidationError(t("signInBeforeSubmitting"));
      localStorage.setItem("psec-after-login", "/submit");
      startLogin();
      return;
    }
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

  const reset = () => {
    setForm(initialForm);
    setUploads([]);
    setFileError("");
    setAttachmentPreparing(false);
    setValidationError("");
    setLegalConfirmed(legalInitialState);
    setSubmitted(false);
    submission.reset();
    localStorage.removeItem("psec-submission-draft");
  };

  if (submitted) {
    return (
      <div className="page-container py-14 lg:py-20">
        <div className="mx-auto max-w-2xl surface-card p-8 text-center md:p-14">
          <CheckCircle2 className="mx-auto text-success" size={38} strokeWidth={1.7} />
          <div className="section-kicker mt-5 text-success">{t("submissionReceived")}</div>
          <h1 className="mt-4 font-display text-4xl tracking-[-.04em]">
            {t("submissionPendingTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            {t("submissionSavedDetails")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/my-records"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              {t("openMyRecords")}
            </Link>
            <button
              type="button"
              onClick={reset}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-ink"
            >
              {t("submitAnother")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mutationError = submission.error
    ? /database migration/i.test(submission.error.message)
      ? submission.error.message
      : t("saveRecordError")
    : "";

  return (
    <div className="page-submission">
      <PageHero
        backHref="/"
        backLabel={t("backToOverview")}
        eyebrow={`06 / ${t("memberSubmissionPage")}`}
        title={
          <>
            {t("putQuestion")}
            <br />
            <span className="text-[#9dc4f4]">{t("onRecord")}</span>
          </>
        }
        description={t("submissionHeroDescription")}
        aside={
          <div className="max-w-xs rounded-2xl border border-white/15 bg-white/8 p-4 text-sm leading-6 text-white/70">
            <div className="section-kicker text-signal">PSEC / {t("submissionProtocol")}</div>
            <p className="mt-3">{t("startSmallText")}</p>
          </div>
        }
      />

      <div className="page-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-14">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <FormSection
            number="01"
            title={t("startProjectRecord")}
            description={t("startProjectRecordText")}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <PsecField label={t("submitterName")} required>
                <input
                  id="submission-member-name"
                  value={form.memberName}
                  onChange={event => update("memberName", event.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="form-control"
                  required
                  autoComplete="name"
                  aria-invalid={Boolean(validationError && !form.memberName.trim())}
                />
              </PsecField>
              <PsecField label={t("experimentProjectTitle")} required>
                <input
                  id="submission-title"
                  value={form.title}
                  onChange={event => update("title", event.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="form-control"
                  required
                  aria-invalid={Boolean(validationError && !form.title.trim())}
                />
              </PsecField>
              <div className="md:col-span-2">
                <PsecField label={t("oneSentenceSummary")} hint={t("usedInArchive")} required>
                  <textarea
                    id="submission-abstract"
                    value={form.abstract}
                    onChange={event => update("abstract", event.target.value)}
                    placeholder={t("experimentSummaryPlaceholder")}
                    className="form-control min-h-24 resize-y"
                    required
                    aria-invalid={Boolean(validationError && !form.abstract.trim())}
                  />
                </PsecField>
              </div>
              <PsecField label={t("disciplineLabel")} hint={t("optional")}>
                <select
                  value={form.discipline}
                  onChange={event => update("discipline", event.target.value)}
                  className="form-control"
                >
                  <option value="Social Psychology">{t("socialPsychology")}</option>
                  <option value="Behavioral Economics">{t("behavioralEconomics")}</option>
                  <option value="Sociology">{t("sociology")}</option>
                  <option value="Moral & Political Philosophy">{t("philosophy")}</option>
                </select>
              </PsecField>
              <PsecField label={t("researchStage")} hint={t("optional")}>
                <select
                  value={form.lifecycle}
                  onChange={event => update("lifecycle", event.target.value)}
                  className="form-control"
                >
                  <option value="idea">{t("ideaStage")}</option>
                  <option value="design">{t("designStage")}</option>
                  <option value="in_progress">{t("inProgressStage")}</option>
                  <option value="completed">{t("completedStage")}</option>
                </select>
              </PsecField>
              <PsecField label={t("memberIdHandle")} hint={t("optional")}>
                <input
                  value={form.memberId}
                  onChange={event => update("memberId", event.target.value)}
                  placeholder={t("memberIdPlaceholder")}
                  className="form-control"
                />
              </PsecField>
            </div>
          </FormSection>

          <FormSection
            number="02"
            title={t("makeIdeaLegible")}
            description={t("makeIdeaLegibleText")}
          >
            <div className="space-y-5">
              <PsecField label={t("theoreticalBasis")} hint={t("optional")}>
                <textarea
                  value={form.theoreticalBasis}
                  onChange={event => update("theoreticalBasis", event.target.value)}
                  placeholder={t("theoryPlaceholder")}
                  className="form-control min-h-32 resize-y"
                />
              </PsecField>
              <PsecField label={t("creatorHistory")} hint={t("optional")}>
                <textarea
                  value={form.historicalBackground}
                  onChange={event => update("historicalBackground", event.target.value)}
                  placeholder={t("historyPlaceholder")}
                  className="form-control min-h-32 resize-y"
                />
              </PsecField>
              <PsecField label={t("researchHypothesis")} hint={t("optional")}>
                <textarea
                  value={form.hypothesis}
                  onChange={event => update("hypothesis", event.target.value)}
                  placeholder={t("hypothesisPlaceholder")}
                  className="form-control min-h-28 resize-y"
                />
              </PsecField>
            </div>
          </FormSection>

          <FormSection
            number="03"
            title={t("makeItRunnable")}
            description={t("makeItRunnableText")}
          >
            <div className="space-y-5">
              <PsecField label={t("proposedProcedure")} hint={t("optional")}>
                <textarea
                  value={form.procedure}
                  onChange={event => update("procedure", event.target.value)}
                  placeholder={t("procedurePlaceholder")}
                  className="form-control min-h-40 resize-y"
                />
              </PsecField>
              <PsecField label={t("requiredMaterials")} hint={t("optional")}>
                <textarea
                  value={form.materials}
                  onChange={event => update("materials", event.target.value)}
                  placeholder={t("materialsPlaceholder")}
                  className="form-control min-h-24 resize-y"
                />
              </PsecField>
              <PsecField label={t("expectedAcademicOutput")} hint={t("optional")}>
                <select
                  value={form.expectedOutput}
                  onChange={event => update("expectedOutput", event.target.value)}
                  className="form-control"
                >
                  <option value="">{t("notAssignedYet")}</option>
                  <option value="IB Extended Essay">{t("ibExtendedEssay")}</option>
                  <option value="Academic competition">{t("academicCompetition")}</option>
                  <option value="CAS activity">{t("casActivity")}</option>
                  <option value="Club research">{t("clubResearch")}</option>
                  <option value="Unassigned / exploratory">{t("unassignedExploratory")}</option>
                </select>
              </PsecField>
            </div>
          </FormSection>

          <FormSection
            number="04"
            title={t("experimentalEvidence")}
            description={t("experimentalEvidenceText")}
            tone="quiet"
          >
            <label className="focus-ring flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#7897b8] bg-white/80 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <FileUp size={18} className="shrink-0" />
              <span className="min-w-0">
                <strong className="block font-medium text-ink">{t("addPhotosProcessData")}</strong>
                <span className="text-xs">{t("supportedFileTypes")}</span>
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.csv,.json,.xlsx,.xls,.zip,.pdf,.doc,.docx,.txt"
                onChange={onFilesChange}
                className="sr-only"
              />
            </label>
            {uploads.length > 0 && (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {uploads.map((file, index) => (
                  <div
                    key={`${file.fileName}-${index}`}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white/80 p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      {file.kind === "photo" ? <ImageIcon size={15} /> : <Database size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-ink">{file.fileName}</strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t(uploadKindKeys[file.kind])} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`${t("removeFile")} ${file.fileName}`}
                      onClick={() =>
                        setUploads(current => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="focus-ring shrink-0 rounded-md p-1 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection number="05" title={t("legalConsentTitle")} description={t("legalConsentDescription")} tone="quiet">
            <div className="space-y-3 text-sm leading-6 text-ink">
              <ConsentRow
                checked={legalConfirmed.privacy}
                onChange={checked => setLegalConfirmed(current => ({ ...current, privacy: checked }))}
                text={t("acceptPrivacy")}
                href="/privacy"
                linkText={t("privacyPolicy")}
              />
              <ConsentRow
                checked={legalConfirmed.terms}
                onChange={checked => setLegalConfirmed(current => ({ ...current, terms: checked }))}
                text={t("acceptTerms")}
                href="/terms"
                linkText={t("termsOfUse")}
              />
              <ConsentRow
                checked={legalConfirmed.researchSafety}
                onChange={checked => setLegalConfirmed(current => ({ ...current, researchSafety: checked }))}
                text={t("acceptResearchSafety")}
                href="/research-ethics"
                linkText={t("researchEthics")}
              />
              <ConsentRow
                checked={legalConfirmed.contentRights}
                onChange={checked => setLegalConfirmed(current => ({ ...current, contentRights: checked }))}
                text={t("acceptContentRights")}
                href="/content-policy"
                linkText={t("contentPolicy")}
              />
            </div>
          </FormSection>

          {(validationError || fileError || mutationError) && (
            <StatusBanner tone="error">
              {validationError || fileError || mutationError}
            </StatusBanner>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={15} className="text-success" />
              {t("autoTimestamped")}
            </div>
            <Button
              type="submit"
              disabled={submission.isPending || attachmentPreparing || authLoading}
              className="focus-ring h-12 gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-[#083d80]"
            >
              {attachmentPreparing
                ? t("preparingFiles")
                : submission.isPending
                  ? t("savingRecord")
                  : t("submitToArchive")}
              <Send size={14} />
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-[var(--radius-card)] border border-border bg-white/55 p-5 lg:sticky lg:top-24">
          <div className="section-kicker text-primary">{t("submissionProtocol")}</div>
          <div className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
            <ProtocolItem title={t("startSmall")} text={t("startSmallText")} />
            <ProtocolItem title={t("preserveEvidence")} text={t("preserveEvidenceText")} />
            <ProtocolItem title={t("protectParticipants")} text={t("protectParticipantsText")} />
          </div>
          <div className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            {t("uploadsPrivate")}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  text,
  href,
  linkText,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  text: string;
  href: string;
  linkText: string;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span>
        {text} ·{" "}
        <Link href={href} target="_blank" className="text-primary underline underline-offset-2">
          {linkText}
        </Link>
      </span>
    </label>
  );
}

function ProtocolItem({ title, text }: { title: string; text: string }) {
  return (
    <p>
      <strong className="font-semibold text-ink">{title}</strong>
      <br />
      {text}
    </p>
  );
}
