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
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

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
const uploadKindKeys = { photo: "photoFile", data: "dataFile", report: "reportFile", protocol: "protocolFile", other: "otherFile" } as const;
const disciplineKeys = { "Social Psychology": "socialPsychology", "Behavioral Economics": "behavioralEconomics", Sociology: "sociology", "Moral & Political Philosophy": "philosophy" } as const;

export default function EvidenceSubmission() {
  const { language, t } = useLanguage();
  const targets = trpc.experiments.completed.useQuery();
  const [submitterName, setSubmitterName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [observationNotes, setObservationNotes] = useState("");
  const [uploads, setUploads] = useState<UploadDraft[]>([]);
  const [fileError, setFileError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const submit = trpc.submissions.evidence.useMutation();

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setFileError("");
    if (files.length + uploads.length > 8) {
      setFileError(t("uploadLimit"));
      return;
    }
    const invalid = files.find(
      file => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024
    );
    if (invalid) {
      setFileError(
        language === "zh" ? `${invalid.name} 不是 8 MB 以内的 JPG、PNG、CSV、XLSX 或 PDF 文件。` : `${invalid.name} is not a JPG, PNG, CSV, XLSX, or PDF file under 8 MB.`
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
          })
      )
    )
      .then(next => setUploads(current => [...current, ...next]))
      .catch((error: Error) => setFileError(error.message))
      .finally(() => {
        setPreparing(false);
        event.target.value = "";
      });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    if (!submitterName.trim() || !recordId) {
      setValidationError(
        t("evidenceRequiredFields")
      );
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
    });
  };
  if (submit.isSuccess)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-2xl border border-[#b8ccb5] bg-[#edf5eb] p-8 text-center md:p-14">
          <CheckCircle2 className="mx-auto text-[#3f7b44]" size={36} />
          <div className="mt-5 font-mono text-[10px] uppercase tracking-[.2em] text-[#3f7b44]">
            {t("evidenceSupplementReceived")}
          </div>
          <h1 className="mt-4 font-display text-4xl tracking-[-.04em]">
            {t("evidenceAwaitingReview")}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            {t("evidenceReviewDescription")}
          </p>
          <Link
            href="/"
            className="focus-ring mt-8 inline-flex bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
          >
            {t("returnToOverview")}
          </Link>
        </div>
      </div>
    );
  return (
    <div className="page-evidence">
      <section className="navy-grid text-white">
        <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-14 lg:px-10 lg:pb-18 lg:pt-20">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/45 hover:text-signal"
          >
            <ArrowLeft size={13} /> {t("backToOverview")}
          </Link>
          <div className="mt-10 font-mono text-[10px] uppercase tracking-[.2em] text-signal">
            {t("completedProjectEvidenceSupplement")}
          </div>
          <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-.06em]">
            {t("addWhat")}
            <br />
            <span className="text-[#9dc4f4]">{t("actuallyHappened")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-7 text-white/60">
            {t("evidenceHeroDescription")}
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 lg:grid-cols-[1fr_310px] lg:px-10 lg:py-16">
        <form onSubmit={onSubmit} className="space-y-8">
          <section className="border border-border bg-card p-5 md:p-7">
            <div className="flex items-start gap-4 border-b border-border pb-5">
              <div className="flex h-8 w-8 items-center justify-center bg-[#e7eef6] font-mono text-[10px] text-primary">
                01
              </div>
              <div>
                <h2 className="font-display text-xl">{t("identifySupplement")}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("mandatoryFields")}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label>
                <span className="form-label">{t("submitterName")} *</span>
                <input
                  value={submitterName}
                  onChange={e => setSubmitterName(e.target.value)}
                  className="form-control mt-2"
                  placeholder={t("namePlaceholder")}
                />
              </label>
              <label>
                <span className="form-label">{t("targetArchivedExperiment")} *</span>
                <select
                  value={recordId}
                  onChange={e => setRecordId(e.target.value)}
                  className="form-control mt-2"
                  disabled={targets.isLoading}
                >
                  <option value="">
                    {targets.isLoading
                      ? t("loadingCompletedProjects")
                      : t("selectCompletedExperiment")}
                  </option>
                  {(targets.data ?? []).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.discipline in disciplineKeys ? t(disciplineKeys[item.discipline as keyof typeof disciplineKeys]) : item.discipline}
                    </option>
                  ))}
                </select>
                {!targets.isLoading &&
                  !targets.error &&
                  targets.data?.length === 0 && (
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {t("noPublishedCompleted")}
                    </span>
                  )}
              </label>
            </div>
            {targets.error && (
              <p className="mt-4 text-sm text-[#8a2c2c]">
                {t("completedProjectsLoadError")}
              </p>
            )}
          </section>
          <section className="border border-border bg-card p-5 md:p-7">
            <div className="flex items-start gap-4 border-b border-border pb-5">
              <div className="flex h-8 w-8 items-center justify-center bg-[#e7eef6] font-mono text-[10px] text-primary">
                02
              </div>
              <div>
                <h2 className="font-display text-xl">{t("executionObservationNotes")}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("optionalQualitativeNotes")}
                </p>
              </div>
            </div>
            <textarea
              value={observationNotes}
              onChange={e => setObservationNotes(e.target.value)}
              className="form-control mt-6 min-h-40 resize-y"
              placeholder={t("observationPlaceholder")}
            />
          </section>
          <section className="border border-[#9fb0c4] bg-[#eef4f9] p-5 md:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center bg-white text-primary">
                03
              </div>
              <div>
                <h2 className="font-display text-xl">{t("sessionEvidence")}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("sessionEvidenceDescription")}
                </p>
              </div>
            </div>
            <label className="focus-ring mt-6 flex min-h-16 cursor-pointer items-center gap-3 border border-dashed border-[#7897b8] bg-white px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <FileUp size={18} />
              <span>
                <strong className="block font-medium text-ink">{t("addMultiplePhotosData")}</strong>
                <span className="text-xs">
                  {t("selectSeveralFiles")}
                </span>
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
                    className="flex items-center gap-3 border border-[#c7d4e1] bg-white p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#e7eef6] text-primary">
                      {file.kind === "photo" ? (
                        <ImageIcon size={15} />
                      ) : (
                        <Database size={15} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-ink">
                        {file.fileName}
                      </strong>
                      <span className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                        {t(uploadKindKeys[file.kind])} ·{" "}
                        {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUploads(current =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      className="text-muted-foreground hover:text-[#8a2c2c]"
                      aria-label={`${t("removeFile")} ${file.fileName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {(validationError || fileError || submit.error) && (
            <div
              role="alert"
              className="border border-[#d9a7a7] bg-[#fff1f1] px-4 py-3 text-sm text-[#8a2c2c]"
            >
              {validationError || fileError || submit.error?.message}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
              <ShieldCheck size={14} className="text-[#3f7b44]" /> {t("savedPrivately")}
            </div>
            <button
              type="submit"
              disabled={submit.isPending || preparing}
              className="focus-ring flex h-12 items-center gap-2 bg-primary px-6 font-mono text-[10px] uppercase tracking-[.14em] text-white hover:bg-[#083d80]"
            >
              {preparing
                ? t("preparingFiles")
                : submit.isPending
                  ? t("sending")
                  : t("submitEvidence")}{" "}
              <Send size={14} />
            </button>
          </div>
        </form>
        <aside className="h-fit border border-border bg-[#ece9e2] p-6 lg:sticky lg:top-24">
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
            {t("evidenceProtocol")}
          </div>
          <div className="mt-6 space-y-5 text-sm leading-6 text-muted-foreground">
            <p>
              <strong className="font-medium text-ink">
                {t("notNewExperiment")}
              </strong>
              <br />
              {t("chooseExistingCompleted")}
            </p>
            <p>
              <strong className="font-medium text-ink">
                {t("adminReviewFirst")}
              </strong>
              <br />
              {t("approvedEvidenceAppended")}
            </p>
            <p>
              <strong className="font-medium text-ink">
                {t("rejectedEvidencePrivate")}
              </strong>
              <br />
              {t("retainedAdminHistory")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
