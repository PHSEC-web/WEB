import {
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
import {
  FormSection,
  PageHero,
  PsecField,
  StatusBanner,
} from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { LEGAL_VERSIONS } from "../../../shared/legal";

type UploadKind = "photo" | "data" | "report" | "protocol" | "other";
type UploadDraft = {
  fileName: string;
  data: string;
  mimeType: string;
  sizeBytes: number;
  kind: UploadKind;
};

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const kindFor = (file: File): UploadKind =>
  file.type.startsWith("image/")
    ? "photo"
    : /csv|excel|spreadsheet/.test(file.type)
      ? "data"
      : "report";

const uploadKindKeys = {
  photo: "photoFile",
  data: "dataFile",
  report: "reportFile",
  protocol: "protocolFile",
  other: "otherFile",
} as const;

const disciplineKeys = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
} as const;

const legalInitialState = {
  privacy: false,
  terms: false,
  researchSafety: false,
  contentRights: false,
};

export default function EvidenceSubmission() {
  const { language, t } = useLanguage();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const targets = trpc.experiments.completed.useQuery();
  const [submitterName, setSubmitterName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [observationNotes, setObservationNotes] = useState("");
  const [uploads, setUploads] = useState<UploadDraft[]>([]);
  const [fileError, setFileError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [legalConfirmed, setLegalConfirmed] = useState(legalInitialState);
  const submit = trpc.submissions.evidence.useMutation();

  useEffect(() => {
    if (user?.name && !submitterName) setSubmitterName(user.name);
  }, [submitterName, user?.name]);

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setFileError("");
    if (files.length + uploads.length > 8) {
      setFileError(t("uploadLimit"));
      return;
    }
    const invalid = files.find(
      file => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setFileError(
        language === "zh"
          ? `${invalid.name} 不是 8 MB 以内的 JPG、PNG、CSV、XLSX 或 PDF 文件。`
          : `${invalid.name} is not a JPG, PNG, CSV, XLSX, or PDF file under 8 MB.`,
      );
      return;
    }
    setPreparing(true);
    Promise.all(
      files.map(
        file =>
          new Promise<UploadDraft>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                fileName: file.name,
                data: typeof reader.result === "string" ? reader.result : "",
                mimeType: file.type,
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
      .finally(() => setPreparing(false));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    submit.reset();
    if (!submitterName.trim() || !recordId) {
      setValidationError(t("evidenceRequiredFields"));
      return;
    }
    if (!isAuthenticated) {
      setValidationError(t("signInBeforeSubmitting"));
      localStorage.setItem("psec-after-login", "/submit-evidence");
      startLogin();
      return;
    }
    if (!Object.values(legalConfirmed).every(Boolean)) {
      setValidationError(t("legalConsentRequired"));
      return;
    }
    if (preparing) {
      setValidationError(t("pleaseWaitFiles"));
      return;
    }
    submit.mutate({
      submitterName,
      recordId: Number(recordId),
      observationNotes,
      files: uploads,
      legalConsent: {
        privacyVersion: LEGAL_VERSIONS.privacy,
        termsVersion: LEGAL_VERSIONS.terms,
        researchSafetyVersion: LEGAL_VERSIONS.researchSafety,
        contentRightsVersion: LEGAL_VERSIONS.contentRights,
      },
    });
  };

  if (submit.isSuccess) {
    return (
      <div className="page-container py-14 lg:py-20">
        <div className="mx-auto max-w-2xl surface-card p-8 text-center md:p-14">
          <CheckCircle2 className="mx-auto text-success" size={38} strokeWidth={1.7} />
          <div className="section-kicker mt-5 text-success">
            {t("evidenceSupplementReceived")}
          </div>
          <h1 className="mt-4 font-display text-4xl tracking-[-.04em]">
            {t("evidenceAwaitingReview")}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            {t("evidenceReviewDescription")}
          </p>
          <Link
            href="/my-records"
            className="focus-ring mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {t("openMyRecords")}
          </Link>
        </div>
      </div>
    );
  }

  const mutationError = submit.error
    ? /database migration/i.test(submit.error.message)
      ? submit.error.message
      : t("saveRecordError")
    : "";
  const noTargets = !targets.isLoading && !targets.error && targets.data?.length === 0;

  return (
    <div className="page-evidence">
      <PageHero
        backHref="/"
        backLabel={t("backToOverview")}
        eyebrow={t("completedProjectEvidenceSupplement")}
        title={
          <>
            {t("addWhat")}
            <br />
            <span className="text-[#9dc4f4]">{t("actuallyHappened")}</span>
          </>
        }
        description={t("evidenceHeroDescription")}
        aside={
          <div className="max-w-xs rounded-2xl border border-white/15 bg-white/8 p-4 text-sm leading-6 text-white/70">
            <div className="section-kicker text-signal">PSEC / {t("evidenceProtocol")}</div>
            <p className="mt-3">{t("chooseExistingCompleted")}</p>
          </div>
        }
      />

      <div className="page-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-14">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <FormSection
            number="01"
            title={t("identifySupplement")}
            description={t("mandatoryFields")}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <PsecField label={t("submitterName")} required>
                <input
                  value={submitterName}
                  onChange={event => setSubmitterName(event.target.value)}
                  className="form-control"
                  placeholder={t("namePlaceholder")}
                  required
                  autoComplete="name"
                  aria-invalid={Boolean(validationError && !submitterName.trim())}
                />
              </PsecField>
              <PsecField label={t("targetArchivedExperiment")} required>
                <select
                  value={recordId}
                  onChange={event => setRecordId(event.target.value)}
                  className="form-control"
                  disabled={targets.isLoading || Boolean(targets.error) || noTargets}
                  required
                  aria-invalid={Boolean(validationError && !recordId)}
                >
                  <option value="">
                    {targets.isLoading
                      ? t("loadingCompletedProjects")
                      : t("selectCompletedExperiment")}
                  </option>
                  {(targets.data ?? []).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title} ·{" "}
                      {item.discipline in disciplineKeys
                        ? t(disciplineKeys[item.discipline as keyof typeof disciplineKeys])
                        : item.discipline}
                    </option>
                  ))}
                </select>
              </PsecField>
            </div>
            {noTargets && (
              <p className="mt-4 text-sm text-muted-foreground">{t("noPublishedCompleted")}</p>
            )}
            {targets.error && (
              <div className="mt-4">
                <StatusBanner tone="error">{t("completedProjectsLoadError")}</StatusBanner>
              </div>
            )}
          </FormSection>

          <FormSection
            number="02"
            title={t("executionObservationNotes")}
            description={t("optionalQualitativeNotes")}
          >
            <PsecField label={t("executionObservationNotes")} hint={t("optional")}>
              <textarea
                value={observationNotes}
                onChange={event => setObservationNotes(event.target.value)}
                className="form-control min-h-40 resize-y"
                placeholder={t("observationPlaceholder")}
              />
            </PsecField>
          </FormSection>

          <FormSection
            number="03"
            title={t("sessionEvidence")}
            description={t("sessionEvidenceDescription")}
            tone="quiet"
          >
            <label className="focus-ring flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#7897b8] bg-white/80 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <FileUp size={18} className="shrink-0" />
              <span className="min-w-0">
                <strong className="block font-medium text-ink">
                  {t("addMultiplePhotosData")}
                </strong>
                <span className="text-xs">{t("selectSeveralFiles")}</span>
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,.csv,.xlsx,.xls,.pdf"
                className="sr-only"
                onChange={onFilesChange}
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
                      onClick={() =>
                        setUploads(current => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="focus-ring shrink-0 rounded-md p-1 text-muted-foreground hover:text-danger"
                      aria-label={`${t("removeFile")} ${file.fileName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection number="04" title={t("legalConsentTitle")} description={t("legalConsentDescription")} tone="quiet">
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
              {t("savedPrivately")}
            </div>
            <button
              type="submit"
              disabled={submit.isPending || preparing || authLoading || noTargets}
              className="focus-ring flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-[#083d80] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {preparing
                ? t("preparingFiles")
                : submit.isPending
                  ? t("sending")
                  : t("submitEvidence")}
              <Send size={14} />
            </button>
          </div>
        </form>

        <aside className="h-fit rounded-[var(--radius-card)] border border-border bg-white/55 p-5 lg:sticky lg:top-24">
          <div className="section-kicker text-primary">{t("evidenceProtocol")}</div>
          <div className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
            <ProtocolItem title={t("notNewExperiment")} text={t("chooseExistingCompleted")} />
            <ProtocolItem title={t("adminReviewFirst")} text={t("approvedEvidenceAppended")} />
            <ProtocolItem title={t("rejectedEvidencePrivate")} text={t("retainedAdminHistory")} />
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
