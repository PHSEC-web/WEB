import {
  Check,
  ChevronDown,
  Clock3,
  Download,
  Edit3,
  FileUp,
  History,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  EmptyState,
  LoadingState,
  PageHero,
  StatusBanner,
} from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import {
  PROJECT_CATEGORIES,
  projectCategoryForLifecycle,
  type ProjectCategory,
} from "../../../shared/recordCategories";

const libraryDisciplines = [
  "Social Psychology",
  "Behavioral Economics",
  "Sociology",
  "Moral & Political Philosophy",
];
const libraryFolders = PROJECT_CATEGORIES;

const disciplineKeys = {
  "Social Psychology": "socialPsychology",
  "Behavioral Economics": "behavioralEconomics",
  Sociology: "sociology",
  "Moral & Political Philosophy": "philosophy",
} as const;
const folderKeys = {
  "Idea Pool": "ideaPool",
  "Formal Experimental Designs": "formalExperimentalDesigns",
  "Completed Experimental Projects": "completedExperimentalProjects",
} as const;
const lifecycleKeys = {
  idea: "ideaStage",
  design: "designStage",
  in_progress: "inProgressStage",
  completed: "completedStage",
} as const;
const fileKindKeys = {
  photo: "photoFile",
  data: "dataFile",
  report: "reportFile",
  protocol: "protocolFile",
  other: "otherFile",
} as const;
const actionKeys = {
  created: "actionCreated",
  submitted: "actionSubmitted",
  edited: "actionEdited",
  attachment_added: "actionAttachmentAdded",
  edited_by_admin: "actionEditedByAdmin",
  review_passed: "actionReviewPassed",
  review_rejected: "actionReviewRejected",
  approved: "actionReviewPassed",
  rejected: "actionReviewRejected",
  hidden: "actionHidden",
  deleted_by_owner: "actionDeletedByOwner",
  appended_result: "actionAppendedResult",
} as const;

type AdminNotice = {
  tone: "success" | "error" | "info";
  message: string;
};

const emptyEdit = {
  memberName: "",
  memberId: "",
  discipline: "Social Psychology",
  title: "",
  abstract: "",
  lifecycle: "idea",
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

type EditState = typeof emptyEdit;

export default function AdminReview() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const status = trpc.admin.status.useQuery();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComments, setRejectComments] = useState<Record<number, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditState>(emptyEdit);
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const utils = trpc.useUtils();

  const filters = useMemo(
    () => ({
      discipline: disciplineFilter || undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
    }),
    [disciplineFilter, fromFilter, toFilter]
  );
  const queue = trpc.admin.pending.useQuery(filters, {
    enabled: status.data?.authenticated === true,
  });
  const history = trpc.admin.history.useQuery(
    { submissionId: openId ?? -1 },
    { enabled: status.data?.authenticated === true && openId !== null }
  );
  const login = trpc.admin.login.useMutation({
    onSuccess: result => {
      if (result.success) {
        setLoginError("");
        void utils.admin.status.invalidate();
      } else setLoginError(t("passwordNotRecognized"));
    },
    onError: () => setLoginError(t("passwordNotRecognized")),
  });
  const logout = trpc.admin.logout.useMutation({
    onSuccess: () => navigate("/"),
  });
  const approve = trpc.admin.approve.useMutation({
    onSuccess: () => {
      setNotice({ tone: "success", message: t("submissionApprovedNotice") });
      void utils.admin.pending.invalidate();
      void utils.experiments.list.invalidate();
    },
    onError: () => setNotice({ tone: "error", message: t("adminActionFailed") }),
  });
  const reject = trpc.admin.reject.useMutation({
    onSuccess: (_result, variables) => {
      setRejectId(null);
      setRejectComments(current => {
        const next = { ...current };
        if (variables?.id !== undefined) delete next[variables.id];
        return next;
      });
      setNotice({ tone: "success", message: t("submissionRejectedNotice") });
      void utils.admin.pending.invalidate();
    },
    onError: () => setNotice({ tone: "error", message: t("adminActionFailed") }),
  });
  const edit = trpc.admin.edit.useMutation({
    onSuccess: () => {
      setEditId(null);
      setNotice({ tone: "success", message: t("editAppendedNotice") });
      void utils.admin.pending.invalidate();
      void utils.admin.history.invalidate();
    },
    onError: () => setNotice({ tone: "error", message: t("adminActionFailed") }),
  });

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    login.mutate({ password });
  };
  const setEditValue = (key: keyof EditState, value: string) =>
    setEditForm(current => ({ ...current, [key]: value }));
  const beginEdit = (item: QueueItem) => {
    setEditId(item.id);
    setEditForm({
      memberName: item.memberName || "",
      memberId: item.memberId || "",
      discipline: item.discipline || "",
      title: item.title || "",
      abstract: item.abstract || "",
      lifecycle: item.lifecycle || "idea",
      theoreticalBasis: item.theoreticalBasis || "",
      historicalBackground: item.historicalBackground || "",
      hypothesis: item.hypothesis || "",
      procedure: item.procedure || "",
      materials: item.materials || "",
      expectedOutput: item.expectedOutput || "",
      attachmentName: item.attachmentName || "",
      attachmentData: "",
      attachmentMimeType: "",
    });
  };
  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    edit.mutate({
      id: editId || 0,
      values: {
        ...editForm,
        lifecycle: editForm.lifecycle as
          | "idea"
          | "design"
          | "in_progress"
          | "completed",
      },
      note: t("adminEditNote"),
    });
  };

  if (status.isLoading) {
    return (
      <main
        className="page-admin flex min-h-[60vh] items-center justify-center px-5"
        role="status"
      >
        <span className="meta-label">
          {t("checkingProtectedSession")}
        </span>
      </main>
    );
  }

  if (!status.data?.authenticated) {
    return (
      <main className="page-admin min-h-[60vh] px-5 py-16 lg:px-10 lg:py-24">
        <div className="surface-card mx-auto max-w-md p-6 md:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <LockKeyhole size={20} aria-hidden="true" />
          </div>
          <div className="mt-8 section-kicker">
            {t("adminRestrictedRoute")}
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-[-.04em]">
            {t("adminReviewQueue")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {t("adminLoginDescription")}
          </p>
          <form onSubmit={submitPassword} className="mt-7">
            <label className="block text-sm font-medium text-ink">
              <span>{t("adminPassword")}</span>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                className="form-control mt-2"
                placeholder={t("enterPassword")}
              />
            </label>
            {loginError && (
              <div className="mt-4">
                <StatusBanner tone="error">
                  <span className="break-words">{loginError}</span>
                </StatusBanner>
              </div>
            )}
            <button
              type="submit"
              disabled={login.isPending}
              className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-60"
            >
              {login.isPending ? t("checking") : t("openQueue")} {" "}
              <LockKeyhole size={14} aria-hidden="true" />
            </button>
          </form>
          <Link
            href="/"
            className="focus-ring mt-6 block rounded-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {t("returnPublicHomepage")}
          </Link>
        </div>
      </main>
    );
  }

  const items = (queue.data ?? []) as QueueItem[];
  return (
    <main className="page-admin min-h-screen">
      <div className="no-print border-b border-white/10 bg-navy text-white/75">
        <div className="page-container flex min-h-12 items-center justify-between gap-4 text-sm">
          <Link href="/" className="focus-ring rounded-full px-3 py-2 hover:text-signal">PSEC / {t("archive")}</Link>
          <div className="flex items-center gap-3">
            <span className="meta-label text-signal">{t("restrictedWorkspace")}</span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.15em] text-white/75 transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
            >
              <LogOut size={13} aria-hidden="true" /> {t("logout")}
            </button>
          </div>
        </div>
      </div>
      <PageHero
        compact
        eyebrow={t("restrictedWorkspace")}
        title={t("adminReviewQueue")}
        description={t("adminQueueDescription")}
      />
      <div className="page-container py-10 lg:py-14">
        <ExperimentAdminPanel />
        <EvidenceQueue />
        {notice && (
          <div className="mb-6 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <StatusBanner tone={notice.tone}>
                <span className="break-words">{notice.message}</span>
              </StatusBanner>
            </div>
            <button className="focus-ring mt-2 shrink-0 rounded-full p-1 text-muted-foreground hover:text-primary" onClick={() => setNotice(null)} aria-label={t("dismissNotice")}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        <section className="admin-panel p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-kicker">
                {t("pendingOnly")}
              </div>
              <h2 className="mt-2 font-display text-2xl">
                {items.length} {t("recordsAwaitingDecision")}
              </h2>
            </div>
            <div className="meta-label text-muted-foreground">
              <Clock3 aria-hidden="true" size={14} className="mr-1 inline" /> {t("noAutomaticPublishing")}
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="block text-sm font-medium text-ink">
              {t("academicCategory")}
              <select
                value={disciplineFilter}
                onChange={event => setDisciplineFilter(event.target.value)}
                className="form-control mt-1"
              >
                <option value="">{t("allCategories")}</option>
                {libraryDisciplines.map(item => (
                  <option key={item} value={item}>{t(disciplineKeys[item as keyof typeof disciplineKeys])}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">
              {t("submittedFrom")}
              <input
                type="date"
                value={fromFilter}
                onChange={event => setFromFilter(event.target.value)}
                className="form-control mt-1"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              {t("submittedTo")}
              <input
                type="date"
                value={toFilter}
                onChange={event => setToFilter(event.target.value)}
                className="form-control mt-1"
              />
            </label>
            <button
              onClick={() => {
                setDisciplineFilter("");
                setFromFilter("");
                setToFilter("");
              }}
              className="focus-ring self-end rounded-full border border-border bg-white/80 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw aria-hidden="true" size={13} className="mr-1 inline" /> {t("reset")}
            </button>
          </div>
        </section>
        <section className="mt-7 space-y-5">
          {queue.isLoading && (
            <LoadingState label={t("loadingPendingSubmissions")} />
          )}
          {!queue.isLoading && items.length === 0 && (
            <EmptyState
              title={t("nothingWaitingQueue")}
              description={t("newSubmissionsAppear")}
              icon={<Search aria-hidden="true" size={22} />}
            />
          )}
          {items.map(item => (
              <SubmissionCard
              key={item.id}
              item={item}
              openId={openId}
              setOpenId={setOpenId}
              rejectId={rejectId}
              setRejectId={setRejectId}
              rejectComment={rejectComments[item.id] ?? ""}
              setRejectComment={value => setRejectComments(current => ({ ...current, [item.id]: value }))}
              editId={editId}
              setEditId={setEditId}
              editForm={editForm}
              setEditValue={setEditValue}
              submitEdit={submitEdit}
              beginEdit={beginEdit}
              history={history.data ?? []}
              onApprove={(discipline, category, publicationReviewConfirmed) =>
                approve.mutate({ id: item.id, discipline, category, publicationReviewConfirmed })
              }
              onReject={() =>
                reject.mutate({ id: item.id, comment: rejectComments[item.id] ?? "" })
              }
              approving={approve.isPending}
              rejecting={reject.isPending}
              editing={edit.isPending}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function EvidenceQueue() {
  const { language, t } = useLanguage();
  const utils = trpc.useUtils();
  const queue = trpc.admin.pendingEvidence.useQuery();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<AdminNotice | null>(null);
  const approve = trpc.admin.approveEvidence.useMutation({
    onSuccess: () => {
      setMessage({ tone: "success", message: t("evidenceApprovedNotice") });
      void utils.admin.pendingEvidence.invalidate();
      void utils.experiments.executionRecords.invalidate();
      void utils.experiments.attachments.invalidate();
    },
    onError: () => setMessage({ tone: "error", message: t("adminActionFailed") }),
  });
  const reject = trpc.admin.rejectEvidence.useMutation({
    onSuccess: (_result, variables) => {
      setRejectId(null);
      setComments(current => {
        const next = { ...current };
        if (variables?.id !== undefined) delete next[variables.id];
        return next;
      });
      setMessage({ tone: "success", message: t("evidenceRejectedNotice") });
      void utils.admin.pendingEvidence.invalidate();
    },
    onError: () => setMessage({ tone: "error", message: t("adminActionFailed") }),
  });
  return (
    <section className="admin-panel admin-panel-info mb-7 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">
            {t("evidenceSupplementsQueue")}
          </div>
          <h2 className="mt-2 font-display text-2xl">
            {t("completedExperimentEvidence")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("evidenceQueueDescription")}
          </p>
        </div>
        <div className="meta-label">
          {queue.data?.length ?? 0} {t("pending")}
        </div>
      </div>
      {message && (
        <div className="mt-4"><StatusBanner tone={message.tone}>{message.message}</StatusBanner></div>
      )}
      <div className="mt-5 space-y-3">
        {queue.isLoading ? (
          <div className="meta-label text-muted-foreground">
            {t("loadingEvidenceSupplements")}
          </div>
        ) : queue.data?.length === 0 ? (
          <div className="admin-subpanel admin-subpanel-info border-dashed p-5 text-sm text-muted-foreground">
            {t("noEvidenceSupplements")}
          </div>
        ) : (
          queue.data?.map(item => (
            <article
              key={item.id}
              className="admin-subpanel p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="meta-label inline-flex rounded-full bg-secondary px-2.5 py-1">
                    [{t("evidenceSupplementTag")}]
                  </span>
                  <h3 className="mt-2 font-display text-xl">
                    {item.experimentTitle || t("targetExperimentUnavailable")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("submitter")}:{" "}
                    <strong className="text-ink">{item.submitterName}</strong> ·{" "}
                    {formatDateTime(item.submittedAt, language)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve.mutate({ id: item.id })}
                    disabled={approve.isPending || !item.experimentTitle}
                    className="focus-ring rounded-full bg-success px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {approve.isPending ? t("attaching") : t("approveAttach")}
                  </button>
                  <button
                    onClick={() =>
                      setRejectId(rejectId === item.id ? null : item.id)
                    }
                    className="focus-ring rounded-full border border-danger/30 bg-danger-surface px-3 py-2 text-sm font-semibold text-danger"
                  >
                    {t("reject")}
                  </button>
                </div>
              </div>
              {item.observationNotes && (
                <div className="mt-4 border-l-2 border-primary pl-3 text-sm leading-6 text-muted-foreground">
                  <span className="font-mono text-[9px] uppercase tracking-[.13em] text-primary">
                    {t("observationNotes")}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">
                    {item.observationNotes}
                  </p>
                </div>
              )}
              {item.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.attachments.map(file => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white/65 px-2.5 py-1 text-xs text-primary underline transition-colors hover:border-primary"
                    >
                      <Download aria-hidden="true" size={12} /> {file.fileName}
                    </a>
                  ))}
                </div>
              )}
              {rejectId === item.id && (
                <div className="admin-subpanel admin-subpanel-danger mt-4 p-4">
                  <label htmlFor={`evidence-rejection-${item.id}`} className="block text-sm font-medium text-danger">
                    <span>{t("rejectionComment")}</span>
                    <textarea
                      id={`evidence-rejection-${item.id}`}
                      value={comments[item.id] ?? ""}
                      onChange={event => setComments(current => ({ ...current, [item.id]: event.target.value }))}
                      className="form-control mt-1 min-h-24 resize-y"
                      placeholder={t("rejectionPlaceholder")}
                    />
                  </label>
                  <button
                    onClick={() => reject.mutate({ id: item.id, comment: comments[item.id] ?? "" })}
                    disabled={!(comments[item.id] ?? "").trim() || reject.isPending}
                    className="focus-ring mt-3 rounded-full bg-danger px-3 py-2 text-sm font-semibold text-white"
                  >
                    {reject.isPending ? t("saving") : t("confirmRejection")}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

type QueueItem = {
  id: number;
  memberName: string;
  memberId: string;
  discipline: string;
  title: string;
  abstract: string | null;
  lifecycle: "idea" | "design" | "in_progress" | "completed" | null;
  theoreticalBasis: string | null;
  historicalBackground: string | null;
  hypothesis: string | null;
  procedure: string | null;
  materials: string | null;
  expectedOutput: string | null;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachments?: {
    id: number;
    fileName: string;
    url: string;
    mimeType: string;
    sizeBytes: number | null;
    kind: string;
  }[];
  submittedAt: string | Date;
  status: string;
};

type HistoryItem = {
  id: number;
  submissionId: number;
  action: string;
  editor: string;
  note: string | null;
  snapshotJson: string;
  createdAt: string | Date;
};

function SubmissionCard({
  item,
  openId,
  setOpenId,
  rejectId,
  setRejectId,
  rejectComment,
  setRejectComment,
  editId,
  setEditId,
  editForm,
  setEditValue,
  submitEdit,
  beginEdit,
  history,
  onApprove,
  onReject,
  approving,
  rejecting,
  editing,
}: {
  item: QueueItem;
  openId: number | null;
  setOpenId: (id: number | null) => void;
  rejectId: number | null;
  setRejectId: (id: number | null) => void;
  rejectComment: string;
  setRejectComment: (value: string) => void;
  editId: number | null;
  setEditId: (id: number | null) => void;
  editForm: EditState;
  setEditValue: (key: keyof EditState, value: string) => void;
  submitEdit: (event: FormEvent<HTMLFormElement>) => void;
  beginEdit: (item: QueueItem) => void;
  history: HistoryItem[];
  onApprove: (discipline: string, category: ProjectCategory, publicationReviewConfirmed: true) => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
  editing: boolean;
}) {
  const { language, t } = useLanguage();
  const [approveDiscipline, setApproveDiscipline] = useState(
    item.discipline || "Social Psychology"
  );
  const [approveFolder, setApproveFolder] = useState<ProjectCategory>(
    projectCategoryForLifecycle(item.lifecycle)
  );
  const [publicationReviewConfirmed, setPublicationReviewConfirmed] = useState(false);
  const expanded = openId === item.id;
  const historyForItem = history.filter(
    record => record.submissionId === item.id
  );
  const submittedAt = formatDateTime(item.submittedAt, language);
  const display = (value: string | null) => value?.trim() || t("blankValue");
  const displayDiscipline = (value?: string | null) =>
    value && value in disciplineKeys
      ? t(disciplineKeys[value as keyof typeof disciplineKeys])
      : value || t("uncategorized");
  const displayFolder = (value: string) =>
    value in folderKeys
      ? t(folderKeys[value as keyof typeof folderKeys])
      : value;
  const displayFileKind = (value?: string | null) =>
    value && value in fileKindKeys
      ? t(fileKindKeys[value as keyof typeof fileKindKeys])
      : value || t("fileLabel");
  const displayAction = (value: string) =>
    value in actionKeys
      ? t(actionKeys[value as keyof typeof actionKeys])
      : value;
  const displayLifecycle = (value?: string | null) =>
    value && value in lifecycleKeys
      ? t(lifecycleKeys[value as keyof typeof lifecycleKeys])
      : value || t("notSet");

  return (
    <article className="admin-subpanel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenId(expanded ? null : item.id)}
        aria-expanded={expanded}
        aria-controls={`submission-${item.id}-details`}
        className="focus-ring flex w-full items-start gap-4 p-5 text-left md:p-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-surface font-mono text-[10px] text-warning">
          #{item.id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[.13em] text-primary">
            <span>{displayDiscipline(item.discipline)}</span>
            <span className="h-1 w-1 rounded-full bg-signal" />
            <span>{submittedAt}</span>
          </span>
          <span className="mt-2 block font-display text-2xl leading-8 tracking-[-.03em]">
            {item.title}
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">
            {t("submitter")}:{" "}
            <strong className="font-medium text-ink">
              {display(item.memberName)} / {display(item.memberId)}
            </strong>
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`mt-1 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {expanded && (
        <div id={`submission-${item.id}-details`} className="border-t border-border bg-white/35 p-5 md:p-7">
          <div className="grid gap-7 lg:grid-cols-2">
            <div className="space-y-5">
              <RecordField label={t("submitterName")} value={item.memberName} />
              <RecordField label={t("memberIdHandle")} value={item.memberId} />
              <RecordField label={t("disciplineLabel")} value={displayDiscipline(item.discipline)} />
              <RecordField label={t("experimentProjectTitle")} value={item.title} />
              <RecordField label={t("oneSentenceSummary")} value={item.abstract} />
              <RecordField label={t("researchLifecycle")} value={displayLifecycle(item.lifecycle)} />
              <RecordField
                label={t("theoreticalBasis")}
                value={item.theoreticalBasis}
              />
              <RecordField
                label={t("creatorHistory")}
                value={item.historicalBackground}
              />
            </div>
            <div className="space-y-5">
              <RecordField
                label={t("researchHypothesis")}
                value={item.hypothesis}
              />
              <RecordField
                label={t("proposedProcedure")}
                value={item.procedure}
              />
              <RecordField
                label={t("requiredMaterials")}
                value={item.materials}
              />
              <RecordField
                label={t("expectedAcademicOutput")}
                value={item.expectedOutput}
              />
              <RecordField label={t("submissionTimestamp")} value={submittedAt} />
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                  {t("attachedFile")}
                </div>
                {item.attachmentUrl ? (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline"
                  >
                    <Download aria-hidden="true" size={14} />{" "}
                    {item.attachmentName || t("previewDownloadAttachment")}
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("noAttachment")}
                  </div>
                )}
              </div>
              {(item.attachments ?? []).length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <div className="font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                    {t("uploadedExperimentEvidence")}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(item.attachments ?? []).map(file => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 border border-border bg-white/70 p-3 text-sm text-primary underline transition-colors hover:border-primary"
                      >
                        <Download aria-hidden="true" size={14} />
                        <span className="min-w-0 flex-1 truncate">
                          {file.fileName}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                      {displayFileKind(file.kind)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6">
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="block text-xs text-ink">
                {t("disciplineLabel")}
                <select
                  value={approveDiscipline}
                  onChange={event => setApproveDiscipline(event.target.value)}
                  className="form-control mt-1"
                >
                  {libraryDisciplines.map(discipline => (
                    <option key={discipline} value={discipline}>
                      {displayDiscipline(discipline)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-ink">
                {t("projectFolder")}
                <select
                  value={approveFolder}
                  onChange={event =>
                    setApproveFolder(event.target.value as ProjectCategory)
                  }
                  className="form-control mt-1"
                >
                  {libraryFolders.map(folder => (
                    <option key={folder} value={folder}>
                      {displayFolder(folder)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <p className="w-full text-xs leading-5 text-muted-foreground">{t("adminPublicationChecklist")}</p>
              <label className="admin-subpanel admin-subpanel-info flex w-full items-start gap-3 p-3 text-xs leading-5 text-muted-foreground">
                <input type="checkbox" checked={publicationReviewConfirmed} onChange={event => setPublicationReviewConfirmed(event.target.checked)} className="mt-1" />
                <span>{t("confirmPublicationReview")}</span>
              </label>
              <button
                onClick={() => onApprove(approveDiscipline, approveFolder, true)}
                disabled={approving || !publicationReviewConfirmed}
                className="focus-ring flex items-center gap-2 rounded-full bg-success px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white disabled:opacity-50"
              >
                <Check aria-hidden="true" size={14} />{" "}
                {approving ? t("publishing") : t("approvePublish")}
              </button>
              <button
                onClick={() =>
                  setRejectId(rejectId === item.id ? null : item.id)
                }
                className="focus-ring flex items-center gap-2 rounded-full border border-danger/30 bg-danger-surface px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-danger"
              >
                <X aria-hidden="true" size={14} /> {t("rejectSendBack")}
              </button>
              <button
                onClick={() => beginEdit(item)}
                className="focus-ring flex items-center gap-2 border border-border bg-white px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink"
              >
                <Edit3 aria-hidden="true" size={14} /> {t("edit")}
              </button>
            </div>
            {rejectId === item.id && (
              <div className="admin-subpanel admin-subpanel-danger mt-4 p-4">
                <label htmlFor={`submission-rejection-${item.id}`} className="font-mono text-[9px] uppercase tracking-[.13em] text-danger">
                  <span>{t("permanentRejectionComment")}</span>
                  <textarea
                    id={`submission-rejection-${item.id}`}
                    value={rejectComment}
                    onChange={event => setRejectComment(event.target.value)}
                    className="form-control mt-1 min-h-24 resize-y"
                    placeholder={t("rejectionPlaceholder")}
                  />
                </label>
                <button
                  onClick={onReject}
                  disabled={!rejectComment.trim() || rejecting}
                  className="focus-ring mt-3 rounded-full bg-danger px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white"
                >
                  {rejecting ? t("saving") : t("confirmRejection")}
                </button>
              </div>
            )}
            {editId === item.id && (
              <form
                onSubmit={submitEdit}
                className="admin-subpanel admin-subpanel-info mt-4 p-4"
              >
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                  <Edit3 aria-hidden="true" size={14} /> {t("fullFormEditingOriginalPreserved")}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AdminField
                    label={t("submitterName")}
                    value={editForm.memberName}
                    onChange={value => setEditValue("memberName", value)}
                  />
                  <AdminField
                    label={t("memberIdHandle")}
                    value={editForm.memberId}
                    onChange={value => setEditValue("memberId", value)}
                  />
                  <AdminField
                    label={t("disciplineLabel")}
                    value={editForm.discipline}
                    onChange={value => setEditValue("discipline", value)}
                    select
                    options={["", ...libraryDisciplines]}
                  />
                  <AdminField
                    label={t("experimentProjectTitle")}
                    value={editForm.title}
                    onChange={value => setEditValue("title", value)}
                  />
                  <AdminField
                    label={t("oneSentenceSummary")}
                    value={editForm.abstract}
                    onChange={value => setEditValue("abstract", value)}
                    textarea
                  />
                  <AdminField
                    label={t("researchLifecycle")}
                    value={editForm.lifecycle}
                    onChange={value => setEditValue("lifecycle", value)}
                    select
                    options={["idea", "design", "in_progress", "completed"]}
                  />
                  <AdminField
                    label={t("theoreticalBasis")}
                    value={editForm.theoreticalBasis}
                    onChange={value => setEditValue("theoreticalBasis", value)}
                    textarea
                  />
                  <AdminField
                    label={t("creatorHistory")}
                    value={editForm.historicalBackground}
                    onChange={value =>
                      setEditValue("historicalBackground", value)
                    }
                    textarea
                  />
                  <AdminField
                    label={t("researchHypothesis")}
                    value={editForm.hypothesis}
                    onChange={value => setEditValue("hypothesis", value)}
                    textarea
                  />
                  <AdminField
                    label={t("proposedProcedure")}
                    value={editForm.procedure}
                    onChange={value => setEditValue("procedure", value)}
                    textarea
                  />
                  <AdminField
                    label={t("requiredMaterials")}
                    value={editForm.materials}
                    onChange={value => setEditValue("materials", value)}
                    textarea
                  />
                  <AdminField
                    label={t("expectedAcademicOutput")}
                    value={editForm.expectedOutput}
                    onChange={value => setEditValue("expectedOutput", value)}
                  />
                </div>
                <label className="admin-file-picker focus-ring mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-white/75 px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  <FileUp aria-hidden="true" size={16} />
                  <span>
                    {editForm.attachmentData
                      ? `${t("replacementFile")}: ${editForm.attachmentName}`
                      : item.attachmentName
                        ? `${t("replaceAttachedFile")}: ${item.attachmentName}`
                        : t("addOptionalAttachment")}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="sr-only"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setEditValue("attachmentName", file.name);
                        setEditValue(
                          "attachmentMimeType",
                          file.type || "application/octet-stream"
                        );
                        setEditValue(
                          "attachmentData",
                          typeof reader.result === "string" ? reader.result : ""
                        );
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={editing}
                    className="focus-ring bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white"
                  >
                    {editing ? t("savingEdit") : t("appendEditHistory")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="focus-ring border border-border bg-white px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            )}
                <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                <History aria-hidden="true" size={13} /> {t("fullIterationHistory")}
              </div>
              {historyForItem.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("loadingHistory")}
                </p>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {historyForItem.map(record => (
                    <div
                      key={record.id}
                      className="admin-subpanel p-3"
                    >
                      <div className="flex justify-between gap-3 font-mono text-[9px] uppercase tracking-[.12em] text-primary">
                        <span>{displayAction(record.action)}</span>
                        <span>
                          {formatDateTime(record.createdAt, language)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {record.note || t("snapshotRetained")}
                      </p>
                      <details className="mt-3 border-t border-border pt-2">
                        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[.12em] text-primary">
                          {t("viewRetainedSnapshot")}
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-[10px] leading-5 text-ink">
                          {formatSnapshot(record.snapshotJson)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ExperimentAdminPanel() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const experiments = trpc.experiments.list.useQuery();
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [message, setMessage] = useState<AdminNotice | null>(null);
  const remove = trpc.admin.deleteExperiment.useMutation({
    onSuccess: item => {
      setSelectedId(null);
      setConfirmTitle("");
      setMessage({
        tone: "success",
        message: item
          ? `${t("hiddenRecordPrefix")} #${item.id}: ${item.title}`
          : t("recordHidden"),
      });
      void utils.experiments.list.invalidate();
    },
    onError: error =>
      setMessage({ tone: "error", message: `${t("errorPrefix")}: ${error.message}` }),
  });
  const filtered = (experiments.data ?? []).filter(item => {
    const matchesSearch = [
      String(item.id),
      item.title,
      item.category,
      item.authorName,
      item.discipline,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesDiscipline =
      !disciplineFilter || item.discipline === disciplineFilter;
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesDiscipline && matchesCategory;
  });

  return (
    <section className="admin-panel admin-panel-danger mb-7 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker text-danger">
            {t("dangerZonePublishedExperiments")}
          </div>
        <h2 className="mt-2 font-display text-2xl">{t("managePublicRecords")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("hidePublicRecordDescription")}
          </p>
        </div>
        <div className="meta-label text-muted-foreground">
          {experiments.data?.length ?? 0} {t("records")}
        </div>
      </div>
      <label className="mt-5 block">
        <span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
          {t("findPublicRecordsBy")}
        </span>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="form-control mt-1"
          placeholder={t("searchTitleAuthor")}
        />
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label>
          <span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
            {t("bigCategoryDiscipline")}
          </span>
          <select
            value={disciplineFilter}
            onChange={event => setDisciplineFilter(event.target.value)}
            className="form-control mt-1"
          >
            <option value="">{t("allFourDisciplines")}</option>
            {libraryDisciplines.map(discipline => (
              <option key={discipline} value={discipline}>
                {t(disciplineKeys[discipline as keyof typeof disciplineKeys])}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
            {t("smallCategoryFolder")}
          </span>
          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="form-control mt-1"
          >
            <option value="">{t("allThreeFolders")}</option>
            {libraryFolders.map(folder => (
              <option key={folder} value={folder}>
                {t(folderKeys[folder])}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <div className="mt-4">
          <StatusBanner tone={message.tone}>{message.message}</StatusBanner>
        </div>
      )}
      <div className="mt-5 space-y-3">
        {experiments.isLoading ? (
          <div
            className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground"
            role="status"
          >
            {t("loadingPublicRecords")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-subpanel admin-subpanel-danger border-dashed p-5 text-sm text-muted-foreground">
            {t("noPublicExperimentMatches")}
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="admin-subpanel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[.14em] text-primary">
                    #{item.id} · {folderKeys[item.category as keyof typeof folderKeys]
                      ? t(folderKeys[item.category as keyof typeof folderKeys])
                      : item.category}
                  </div>
                  <div className="mt-1 font-display text-lg">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.authorName || t("noAuthorRecorded")} ·{" "}
                    {item.discipline in disciplineKeys
                      ? t(disciplineKeys[item.discipline as keyof typeof disciplineKeys])
                      : item.discipline}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedId(selectedId === item.id ? null : item.id);
                    setConfirmTitle("");
                  }}
                  className="focus-ring rounded-full border border-danger/30 bg-danger-surface px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-danger transition-colors hover:border-danger"
                >
                  {selectedId === item.id ? t("cancel") : t("hide")}
                </button>
              </div>
              {item.category === "Completed Experimental Projects" && (
                <ExperimentMediaUploader experimentId={item.id} />
              )}
              {selectedId === item.id && (
                <div className="mt-4 border-t border-danger/20 pt-4">
                  <label htmlFor={`hide-confirm-title-${item.id}`} className="block text-sm text-danger">
                    <span>{t("adminConfirmHideTitle")}</span>
                    <span id={`hide-confirm-help-${item.id}`} className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {t("confirmExactTitleHint")}
                    </span>
                    <input
                      id={`hide-confirm-title-${item.id}`}
                      autoFocus
                      value={confirmTitle}
                      onChange={event => setConfirmTitle(event.target.value)}
                      className="form-control mt-1"
                      aria-describedby={`hide-confirm-help-${item.id}`}
                    />
                  </label>
                  <button
                    disabled={confirmTitle !== item.title || remove.isPending}
                    onClick={() => remove.mutate({ id: item.id, confirmTitle })}
                    className="focus-ring mt-3 rounded-full bg-danger px-4 py-3 font-mono text-[10px] uppercase tracking-[.13em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {remove.isPending ? t("hiding") : t("hideThisRecord")}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ExperimentMediaUploader({ experimentId }: { experimentId: number }) {
  const { t } = useLanguage();
  const upload = trpc.admin.uploadExperimentAttachments.useMutation();
  const [message, setMessage] = useState<AdminNotice | null>(null);
  const [preparing, setPreparing] = useState(false);
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (files.length > 8) {
      setMessage({ tone: "error", message: t("chooseNoMoreEightFiles") });
      input.value = "";
      return;
    }
    setPreparing(true);
    setMessage(null);
    Promise.all(
      files.map(
        file =>
          new Promise<{
            fileName: string;
            data: string;
            mimeType: string;
            sizeBytes: number;
            kind: "photo" | "data" | "report" | "protocol" | "other";
          }>((resolve, reject) => {
            if (file.size > 8 * 1024 * 1024) {
              reject(new Error(`${file.name} ${t("fileTooLarge")}`));
              return;
            }
            const kind = file.type.startsWith("image/")
              ? "photo"
              : /csv|json|excel|spreadsheet|zip/.test(file.type)
                ? "data"
                : /pdf|word|document/.test(file.type)
                  ? "report"
                  : "other";
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                fileName: file.name,
                data: typeof reader.result === "string" ? reader.result : "",
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                kind,
              });
            reader.onerror = () =>
                reject(new Error(`${t("couldNotReadFile")} ${file.name}.`));
            reader.readAsDataURL(file);
          })
      )
    )
      .then(prepared => upload.mutateAsync({ experimentId, files: prepared }).then(result => {
        setMessage({
          tone: "success",
          message: `${result?.count ?? prepared.length} ${t("filesAddedToProject")}`,
        });
      }))
      .catch((error: unknown) =>
        setMessage({
          tone: "error",
          message: `${t("errorPrefix")}: ${error instanceof Error ? error.message : String(error)}`,
        })
      )
      .finally(() => {
        setPreparing(false);
        input.value = "";
      });
  };
  return (
    <div className="admin-panel admin-panel-success mt-4 p-4">
      <div className="section-kicker text-success">
        {t("completedProjectEvidence")}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("completedProjectEvidenceDescription")}
      </p>
      <label className="admin-file-picker focus-ring mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-success bg-white/75 px-3 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-success hover:border-primary">
        <FileUp aria-hidden="true" size={14} />{" "}
        {preparing || upload.isPending ? t("uploading") : t("uploadPhotosData")}
        <input
          type="file"
          multiple
          accept="image/*,.csv,.json,.xlsx,.xls,.zip,.pdf,.doc,.docx,.txt"
          className="sr-only"
          onChange={handleFiles}
        />
      </label>
      {message && (
        <div className="mt-3">
          <StatusBanner tone={message.tone}>{message.message}</StatusBanner>
        </div>
      )}
    </div>
  );
}
function RecordField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[.15em] text-primary">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
        {value?.trim() || t("blankValue")}
      </div>
    </div>
  );
}

function formatSnapshot(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function AdminField({
  label,
  value,
  onChange,
  textarea,
  select,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  select?: boolean;
  options?: string[];
}) {
  const { t } = useLanguage();
  const displayOption = (option: string) => {
    if (!option) return t("notSelected");
    if (option in disciplineKeys) {
      return t(disciplineKeys[option as keyof typeof disciplineKeys]);
    }
    if (option in lifecycleKeys) {
      return t(lifecycleKeys[option as keyof typeof lifecycleKeys]);
    }
    if (option in folderKeys) {
      return t(folderKeys[option as keyof typeof folderKeys]);
    }
    return option;
  };
  return (
    <label className={`block ${textarea ? "md:col-span-2" : ""}`}>
      <span className="font-mono text-[9px] uppercase tracking-[.13em] text-ink">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          className="form-control mt-1 min-h-24 resize-y"
        />
      ) : select ? (
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="form-control mt-1"
        >
          {options?.map(option => (
            <option key={option || "blank"} value={option}>
              {displayOption(option)}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          className="form-control mt-1"
        />
      )}
    </label>
  );
}
