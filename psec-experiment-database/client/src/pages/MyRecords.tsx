import {
  CheckCircle2,
  FileUp,
  FolderOpen,
  History,
  LogIn,
  PlusCircle,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  EmptyState,
  LoadingState,
  PageHero,
  PsecField,
  SectionHeader,
  StatusBanner,
} from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

type Upload = {
  fileName: string;
  data: string;
  mimeType: string;
  sizeBytes: number;
  kind: "photo" | "data" | "report" | "protocol" | "other";
};
const allowed = new Set([
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
  "image/webp",
]);
const kindFor = (file: File): Upload["kind"] =>
  file.type.startsWith("image/")
    ? "photo"
    : /csv|json|excel|spreadsheet|zip/.test(file.type)
      ? "data"
      : /pdf|word|document/.test(file.type)
        ? "report"
        : "other";
const uploadKindKeys = { photo: "photoFile", data: "dataFile", report: "reportFile", protocol: "protocolFile", other: "otherFile" } as const;
const lifecycleKeys = { idea: "ideaStage", design: "designStage", in_progress: "inProgressStage", completed: "completedStage" } as const;
const statusKeys = { approved: "statusPublished", published: "statusPublished", pending: "statusPending", needs_revision: "statusNeedsRevision", rejected: "statusRejected", hidden: "statusHidden", archived: "statusArchived" } as const;

// Member-facing wording for outcomes the shared translation table does not cover yet.
// Server errors are never printed verbatim: members only see what they can act on.
const noticeCopy = {
  loadFailed: {
    zh: "无法加载你的记录，请检查网络后重试。",
    en: "We couldn’t load your records. Check your connection and try again.",
  },
  retry: { zh: "重新加载", en: "Try again" },
  removeFailed: {
    zh: "暂时无法移除这条记录，请稍后重试。",
    en: "We couldn’t remove this record right now. Please try again.",
  },
  appendFailed: {
    zh: "暂时无法追加结果，请稍后重试。",
    en: "We couldn’t append the results right now. Please try again.",
  },
} as const;

type Notice = { tone: "success" | "error"; text: string } | null;

export default function MyRecords() {
  const { language, t } = useLanguage();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const mine = trpc.records.mine.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [results, setResults] = useState("");
  const [limitations, setLimitations] = useState("");
  const [nextQuestion, setNextQuestion] = useState("");
  const [ethicsNotes, setEthicsNotes] = useState("");
  const [summary, setSummary] = useState(() => t("addedResultsEvidence"));
  const [files, setFiles] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [evidenceRequest, setEvidenceRequest] = useState(0);
  const evidenceInput = useRef<HTMLInputElement>(null);
  const remove = trpc.records.deleteOwn.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      setConfirmTitle("");
      setNotice({ tone: "success", text: t("projectRemoved") });
      void utils.records.mine.invalidate();
      void utils.records.list.invalidate();
      void utils.experiments.list.invalidate();
      void utils.experiments.completed.invalidate();
    },
    onError: () =>
      setNotice({ tone: "error", text: noticeCopy.removeFailed[language] }),
  });
  const append = trpc.records.appendResult.useMutation({
    onSuccess: () => {
      setNotice({ tone: "success", text: t("newCompletedVersion") });
      setActiveId(null);
      setResults("");
      setLimitations("");
      setNextQuestion("");
      setEthicsNotes("");
      setFiles([]);
      void utils.records.mine.invalidate();
      void utils.records.list.invalidate();
    },
    onError: () =>
      setNotice({ tone: "error", text: noticeCopy.appendFailed[language] }),
  });
  const records = mine.data ?? [];
  // A failed query must never be presented as an empty archive, while stale rows stay visible.
  const showEmpty = !mine.isError && mine.data !== undefined && records.length === 0;
  const showList = records.length > 0;
  const displayLifecycle = (value?: string | null) => value && value in lifecycleKeys ? t(lifecycleKeys[value as keyof typeof lifecycleKeys]) : value || t("referenceLabel");
  const displayStatus = (value?: string | null) => value && value in statusKeys ? t(statusKeys[value as keyof typeof statusKeys]) : value || "";
  const displayFileKind = (value?: string | null) => value && value in uploadKindKeys ? t(uploadKindKeys[value as keyof typeof uploadKindKeys]) : value || t("fileLabel");
  const pending = useMemo(
    () => records.filter(record => record.status !== "published"),
    [records]
  );

  // The evidence entry point opens the append panel and lands on the upload control.
  useEffect(() => {
    if (!evidenceRequest) return;
    const input = evidenceInput.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.closest("label")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [evidenceRequest]);

  const toggleAppend = (id: number) => {
    setActiveId(current => (current === id ? null : id));
    setNotice(null);
  };
  const toggleDelete = (id: number) => {
    setDeleteId(current => (current === id ? null : id));
    setConfirmTitle("");
    setNotice(null);
  };
  const requestEvidence = (id: number) => {
    setActiveId(id);
    setNotice(null);
    setEvidenceRequest(count => count + 1);
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const selected = Array.from(input.files ?? []);
    if (!selected.length) return;
    if (files.length + selected.length > 8) {
      setNotice({ tone: "error", text: t("uploadLimit") });
      input.value = "";
      return;
    }
    const bad = selected.find(
      file => !allowed.has(file.type) || file.size > 8 * 1024 * 1024
    );
    if (bad) {
      setNotice({
        tone: "error",
        text: language === "zh" ? bad.name + " 不支持或超过 8 MB。" : bad.name + " " + t("unsupportedFile"),
      });
      input.value = "";
      return;
    }
    setNotice(null);
    Promise.all(
      selected.map(
        file =>
          new Promise<Upload>((resolve, reject) => {
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
              reject(new Error(t("couldNotReadFile") + " " + file.name));
            reader.readAsDataURL(file);
          })
      )
    )
      .then(prepared => setFiles(current => [...current, ...prepared]))
      // The only rejection here is this browser-side read failure we composed above.
      .catch((error: Error) =>
        setNotice({ tone: "error", text: error.message })
      );
    input.value = "";
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeId) return;
    setNotice(null);
    append.mutate({
      id: activeId,
      results,
      limitations,
      nextQuestion,
      ethicsNotes,
      summary,
      attachments: files,
    });
  };

  if (loading)
    return (
      <div className="page-records">
        <div className="page-container py-24">
          <LoadingState label={t("checkingMemberSession")} />
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="page-records">
        <div className="page-container py-16 lg:py-24">
          <div className="surface-card mx-auto max-w-2xl p-8 md:p-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <LogIn size={19} aria-hidden="true" />
            </div>
            <div className="section-kicker mt-7">{t("memberWorkspace")}</div>
            <h1 className="mt-3 font-display text-4xl tracking-[-.04em]">
              {t("yourResearchRecord")}
            </h1>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              {t("signInMemberDescription")}
            </p>
            <button
              type="button"
              onClick={() => startLogin()}
              className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98]"
            >
              <LogIn size={14} aria-hidden="true" /> {t("signInContinue")}
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="page-records">
      <PageHero
        compact
        eyebrow={t("memberWorkspace") + " / " + (user.name || t("psecMember"))}
        title={
          <>
            {t("myResearch")}
            <br />
            <span className="text-signal">{t("myRecordsTitle")}</span>
          </>
        }
        description={t("trackRecordStatus")}
      />
      <section className="page-container py-10 lg:py-14">
        <SectionHeader
          eyebrow={mine.data ? records.length + " " + (records.length === 1 ? t("ownedRecordSingular") : t("ownedRecordPlural")) : undefined}
          title={t("researchLifecycle")}
          action={
            <Link
              href="/submit"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98]"
            >
              <PlusCircle size={14} aria-hidden="true" /> {t("newProject")}
            </Link>
          }
        />
        {notice && (
          <div className="mt-6">
            <StatusBanner tone={notice.tone}>
              <span className="break-words">{notice.text}</span>
            </StatusBanner>
          </div>
        )}
        {mine.isError && (
          <div className="mt-6">
            <StatusBanner tone="error">
              <span className="block break-words">
                {noticeCopy.loadFailed[language]}
              </span>
              <button
                type="button"
                onClick={() => void mine.refetch()}
                disabled={mine.isFetching}
                className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-danger/35 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-danger transition-colors hover:border-danger disabled:opacity-60"
              >
                <RefreshCw
                  size={13}
                  aria-hidden="true"
                  className={mine.isFetching ? "animate-spin" : undefined}
                />
                {noticeCopy.retry[language]}
              </button>
            </StatusBanner>
          </div>
        )}
        {mine.isLoading && (
          <div className="mt-8">
            <LoadingState label={t("loadingYourRecords")} />
          </div>
        )}
        {showEmpty && (
          <div className="mt-8">
            <EmptyState
              icon={<FolderOpen size={20} aria-hidden="true" />}
              title={t("noRecordsYet")}
              description={t("noRecordsYetText")}
              action={
                <Link
                  href="/submit"
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98]"
                >
                  {t("createRecord")}
                </Link>
              }
            />
          </div>
        )}
        {showList && (
          <div className="mt-8 space-y-5">
            {records.map(record => {
              const appendOpen = activeId === record.id;
              const deleteOpen = deleteId === record.id;
              const appendPanelId = "record-" + record.id + "-append";
              const deletePanelId = "record-" + record.id + "-delete";
              return (
                <article
                  key={record.id}
                  className="border border-border bg-card p-5 md:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] uppercase tracking-[.14em] text-primary">
                        {displayStatus(record.status)} ·{" "}
                        {displayLifecycle(record.lifecycle)} · v
                        {record.revisionCount}
                      </div>
                      <h2 className="mt-2 break-words font-display text-2xl">
                        {record.title}
                      </h2>
                      <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                        {record.abstract}
                      </p>
                      {record.reviewComment && (
                        <p className="mt-4 break-words border-l-2 border-danger/40 pl-3 text-sm text-danger">
                          {t("reviewNote")} {record.reviewComment}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {record.status === "published" && (
                        <Link
                          href={"/records/" + record.slug}
                          className="focus-ring inline-flex items-center rounded-full border border-border bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-primary transition-colors hover:border-primary"
                        >
                          {t("publicRecord")}
                        </Link>
                      )}
                      <button
                        type="button"
                        aria-expanded={appendOpen}
                        aria-controls={appendPanelId}
                        onClick={() => toggleAppend(record.id)}
                        className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--success)] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-white transition-opacity hover:opacity-90"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" /> {t("addResults")}
                      </button>
                      <button
                        type="button"
                        aria-expanded={appendOpen}
                        aria-controls={appendPanelId}
                        onClick={() => requestEvidence(record.id)}
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#b8d6bd] bg-[var(--success-surface)] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#315f3a] transition-colors hover:bg-white"
                      >
                        <FileUp size={14} aria-hidden="true" /> {t("addEvidence")}
                      </button>
                      {record.recordKind === "project" && (
                        <button
                          type="button"
                          aria-expanded={deleteOpen}
                          aria-controls={deletePanelId}
                          onClick={() => toggleDelete(record.id)}
                          className="focus-ring inline-flex items-center gap-2 rounded-full border border-danger/35 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-danger transition-colors hover:border-danger"
                        >
                          <Trash2 size={14} aria-hidden="true" /> {t("remove")}
                        </button>
                      )}
                    </div>
                  </div>
                  {deleteOpen && (
                    <div
                      id={deletePanelId}
                      className="mt-6 border-t border-danger/25 pt-5"
                    >
                      <label className="block text-sm text-danger">
                        {t("typeExactTitle")}
                        <input
                          value={confirmTitle}
                          onChange={event => setConfirmTitle(event.target.value)}
                          className="form-control mt-2"
                          placeholder={record.title}
                        />
                      </label>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            confirmTitle !== record.title || remove.isPending
                          }
                          onClick={() =>
                            remove.mutate({ id: record.id, confirmTitle })
                          }
                          className="focus-ring rounded-full bg-danger px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {remove.isPending ? t("removing") : t("confirmRemoval")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(null);
                            setConfirmTitle("");
                          }}
                          className="focus-ring rounded-full border border-border bg-white px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink transition-colors hover:border-primary hover:text-primary"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                  {appendOpen && (
                    <form
                      id={appendPanelId}
                      onSubmit={submit}
                      className="mt-6 border-t border-border pt-6"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[.15em] text-[#315f3a]">
                        {t("appendCompletedResults")}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <TextArea
                          label={t("resultsConclusions")}
                          value={results}
                          onChange={setResults}
                          required={files.length === 0}
                        />
                        <TextArea
                          label={t("limitationsReflection")}
                          value={limitations}
                          onChange={setLimitations}
                        />
                        <TextArea
                          label={t("nextQuestion")}
                          value={nextQuestion}
                          onChange={setNextQuestion}
                        />
                        <TextArea
                          label={t("ethicsConsentNotes")}
                          value={ethicsNotes}
                          onChange={setEthicsNotes}
                        />
                        <div className="md:col-span-2">
                          <PsecField label={t("revisionSummary")} required>
                            <input
                              value={summary}
                              onChange={event => setSummary(event.target.value)}
                              className="form-control"
                              required
                            />
                          </PsecField>
                        </div>
                      </div>
                      <label className="focus-ring mt-5 flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[#7aa67d] bg-[var(--success-surface)] px-4 py-4 text-sm text-muted-foreground transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary">
                        <FileUp size={17} className="shrink-0 text-[#315f3a]" aria-hidden="true" />
                        <span className="min-w-0">
                          <strong className="block text-ink">
                            {t("attachReportImageDataset")}
                          </strong>
                          <span className="block text-xs">
                            {t("reportsPhotosPublic")}
                          </span>
                        </span>
                        <input
                          ref={evidenceInput}
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.txt,.csv,.json,.xlsx,.xls,.zip"
                          className="sr-only"
                          onChange={onFiles}
                        />
                      </label>
                      {files.length > 0 && (
                        <ul
                          aria-label={t("attachReportImageDataset")}
                          className="mt-3 flex flex-wrap gap-2"
                        >
                          {files.map((file, index) => (
                            <li
                              key={file.fileName + "-" + index}
                              title={file.fileName}
                              className="flex min-w-0 max-w-full items-center border border-[#b8d6bd] bg-white px-3 py-2 text-xs text-ink"
                            >
                              <span className="min-w-0 truncate">
                                {file.fileName}
                              </span>
                              <span className="sr-only">
                                {displayFileKind(file.kind)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="submit"
                        disabled={
                          append.isPending ||
                          (!results.trim() && files.length === 0)
                        }
                        className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--success)] px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Send size={14} aria-hidden="true" />{" "}
                        {append.isPending
                          ? t("appending")
                          : t("appendCompletedResult")}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {pending.length > 0 && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <History size={15} aria-hidden="true" /> {pending.length}{" "}
            {pending.length === 1
              ? t("awaitingReviewSingular")
              : t("awaitingReviewPlural")}
          </p>
        )}
      </section>
    </div>
  );
}
function TextArea({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <PsecField label={label} required={required}>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        className="form-control min-h-28 resize-y"
        required={required}
      />
    </PsecField>
  );
}
