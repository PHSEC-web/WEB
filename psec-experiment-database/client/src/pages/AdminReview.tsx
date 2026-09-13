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
import { Link } from "wouter";
import {
  EmptyState,
  LoadingState,
  PageHero,
  StatusBanner,
} from "@/components/PsecPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
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

function isErrorNotice(message: string, errorPrefix: string) {
  return message.startsWith("Error:") || message.startsWith(`${errorPrefix}:`);
}

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
  const status = trpc.admin.status.useQuery();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditState>(emptyEdit);
  const [notice, setNotice] = useState("");
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
    { submissionId: openId || 1 },
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
    onSuccess: () => window.location.assign("/"),
  });
  const approve = trpc.admin.approve.useMutation({
    onSuccess: () => {
      setApproveId(null);
      setNotice(t("submissionApprovedNotice"));
      void utils.admin.pending.invalidate();
      void utils.experiments.list.invalidate();
    },
    onError: error => setNotice(`${t("errorPrefix")}: ${error.message}`),
  });
  const reject = trpc.admin.reject.useMutation({
    onSuccess: () => {
      setRejectId(null);
      setRejectComment("");
      setNotice(t("submissionRejectedNotice"));
      void utils.admin.pending.invalidate();
    },
    onError: error => setNotice(`${t("errorPrefix")}: ${error.message}`),
  });
  const edit = trpc.admin.edit.useMutation({
    onSuccess: () => {
      setEditId(null);
      setNotice(t("editAppendedNotice"));
      void utils.admin.pending.invalidate();
      void utils.admin.history.invalidate();
    },
    onError: error => setNotice(`${t("errorPrefix")}: ${error.message}`),
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
      <div
        className="page-admin flex min-h-[60vh] items-center justify-center px-5"
        role="status"
      >
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {t("checkingProtectedSession")}
        </span>
      </div>
    );
  }

  if (!status.data?.authenticated) {
    return (
      <div className="page-admin min-h-[60vh] px-5 py-16 lg:px-10 lg:py-24">
        <div className="surface-card mx-auto max-w-md p-6 md:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <LockKeyhole size={20} aria-hidden="true" />
          </div>
          <div className="mt-8 font-mono text-[10px] uppercase tracking-[.2em] text-primary">
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
              className="focus-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-mono text-[10px] uppercase tracking-[.14em] text-white transition-transform active:scale-[.98] disabled:opacity-60"
            >
              {login.isPending ? t("checking") : t("openQueue")} {" "}
              <LockKeyhole size={14} aria-hidden="true" />
            </button>
          </form>
          <Link
            href="/"
            className="mt-6 block text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground hover:text-primary"
          >
            {t("returnPublicHomepage")}
          </Link>
        </div>
      </div>
    );
  }

  const items = (queue.data ?? []) as QueueItem[];
  return (
    <div className="page-admin min-h-screen">
      <PageHero
        compact
        eyebrow={t("restrictedWorkspace")}
        title={t("adminReviewQueue")}
        description={t("adminQueueDescription")}
        aside={
          <button
            onClick={() => logout.mutate()}
            className="focus-ring flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 font-mono text-[10px] uppercase tracking-[.15em] text-white/75 transition-colors hover:border-signal hover:text-signal"
          >
            <LogOut size={14} aria-hidden="true" /> {t("logout")}
          </button>
        }
      />
      <div className="page-container py-10 lg:py-14">
        <ExperimentAdminPanel />
        <EvidenceQueue />
        {notice && (
          <div className="mb-6 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <StatusBanner tone={isErrorNotice(notice, t("errorPrefix")) ? "error" : "success"}>
                <span className="break-words">{notice}</span>
              </StatusBanner>
            </div>
            <button className="focus-ring mt-2 shrink-0 rounded-full p-1 text-muted-foreground hover:text-primary" onClick={() => setNotice("")} aria-label={t("dismissNotice")}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        <section className="surface-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
                {t("pendingOnly")}
              </div>
              <h2 className="mt-2 font-display text-2xl">
                {items.length} {t("recordsAwaitingDecision")}
              </h2>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
              <Clock3 size={14} className="mr-1 inline" /> {t("noAutomaticPublishing")}
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
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
            <label className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
              {t("submittedFrom")}
              <input
                type="date"
                value={fromFilter}
                onChange={event => setFromFilter(event.target.value)}
                className="form-control mt-1"
              />
            </label>
            <label className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">
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
              className="focus-ring self-end rounded-full border border-border bg-white/80 px-4 py-3 font-mono text-[10px] uppercase tracking-[.13em] text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw size={13} className="mr-1 inline" /> {t("reset")}
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
              icon={<Search size={22} />}
            />
          )}
          {items.map(item => (
            <SubmissionCard
              key={item.id}
              item={item}
              openId={openId}
              setOpenId={setOpenId}
              approveId={approveId}
              setApproveId={setApproveId}
              rejectId={rejectId}
              setRejectId={setRejectId}
              rejectComment={rejectComment}
              setRejectComment={setRejectComment}
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
                reject.mutate({ id: item.id, comment: rejectComment })
              }
              approving={approve.isPending}
              rejecting={reject.isPending}
              editing={edit.isPending}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function EvidenceQueue() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const queue = trpc.admin.pendingEvidence.useQuery();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const approve = trpc.admin.approveEvidence.useMutation({
    onSuccess: () => {
      setMessage(t("evidenceApprovedNotice"));
      void utils.admin.pendingEvidence.invalidate();
      void utils.experiments.executionRecords.invalidate();
      void utils.experiments.attachments.invalidate();
    },
    onError: error => setMessage(`${t("errorPrefix")}: ${error.message}`),
  });
  const reject = trpc.admin.rejectEvidence.useMutation({
    onSuccess: () => {
      setRejectId(null);
      setComment("");
      setMessage(t("evidenceRejectedNotice"));
      void utils.admin.pendingEvidence.invalidate();
    },
    onError: error => setMessage(`${t("errorPrefix")}: ${error.message}`),
  });
  return (
    <section className="mb-7 border border-[#9fb0c4] bg-[#eef4f9] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
            {t("evidenceSupplementsQueue")}
          </div>
          <h2 className="mt-2 font-display text-2xl">
            {t("completedExperimentEvidence")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("evidenceQueueDescription")}
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[.13em] text-primary">
          {queue.data?.length ?? 0} {t("pending")}
        </div>
      </div>
      {message && (
        <div
          role={isErrorNotice(message, t("errorPrefix")) ? "alert" : "status"}
          className={`mt-4 border px-4 py-3 text-sm ${isErrorNotice(message, t("errorPrefix")) ? "border-[#d9a7a7] bg-[#fff1f1] text-[#8a2c2c]" : "border-[#b8ccb5] bg-[#edf5eb] text-[#3f7b44]"}`}
        >
          {message}
        </div>
      )}
      <div className="mt-5 space-y-3">
        {queue.isLoading ? (
          <div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            {t("loadingEvidenceSupplements")}
          </div>
        ) : queue.data?.length === 0 ? (
          <div className="border border-dashed border-[#9fb0c4] bg-white p-5 text-sm text-muted-foreground">
            {t("noEvidenceSupplements")}
          </div>
        ) : (
          queue.data?.map(item => (
            <article
              key={item.id}
              className="border border-[#c7d4e1] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex bg-[#e7eef6] px-2 py-1 font-mono text-[9px] uppercase tracking-[.13em] text-primary">
                    [{t("evidenceSupplementTag")}]
                  </span>
                  <h3 className="mt-2 font-display text-xl">
                    {item.experimentTitle || t("targetExperimentUnavailable")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("submitter")}:{" "}
                    <strong className="text-ink">{item.submitterName}</strong> ·{" "}
                    {new Date(item.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve.mutate({ id: item.id })}
                    disabled={approve.isPending || !item.experimentTitle}
                    className="focus-ring bg-[#3f7b44] px-3 py-2 font-mono text-[10px] uppercase tracking-[.11em] text-white disabled:opacity-40"
                  >
                    {approve.isPending ? t("attaching") : t("approveAttach")}
                  </button>
                  <button
                    onClick={() =>
                      setRejectId(rejectId === item.id ? null : item.id)
                    }
                    className="focus-ring border border-[#c58e8e] bg-[#fff5f5] px-3 py-2 font-mono text-[10px] uppercase tracking-[.11em] text-[#8a2c2c]"
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
                      className="inline-flex items-center gap-2 border border-[#d9d7d1] px-2 py-1 text-xs text-primary underline"
                    >
                      <Download size={12} /> {file.fileName}
                    </a>
                  ))}
                </div>
              )}
              {rejectId === item.id && (
                <div className="mt-4 border-t border-[#ead0d0] pt-4">
                  <label className="block text-sm text-[#8a2c2c]">
                    {t("rejectionComment")}
                    <textarea
                      value={comment}
                      onChange={event => setComment(event.target.value)}
                      className="form-control mt-1 min-h-24 resize-y"
                      placeholder={t("rejectionPlaceholder")}
                    />
                  </label>
                  <button
                    onClick={() => reject.mutate({ id: item.id, comment })}
                    disabled={!comment.trim() || reject.isPending}
                    className="focus-ring mt-3 bg-[#8a2c2c] px-3 py-2 font-mono text-[10px] uppercase tracking-[.11em] text-white"
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
  approveId,
  setApproveId,
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
  approveId: number | null;
  setApproveId: (id: number | null) => void;
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
  const { t } = useLanguage();
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
  const submittedAt = new Date(item.submittedAt).toLocaleString();
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
    <article className="border border-border bg-card">
      <button
        onClick={() => setOpenId(expanded ? null : item.id)}
        className="focus-ring flex w-full items-start gap-4 p-5 text-left md:p-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f4e7c4] font-mono text-[10px] text-[#856311]">
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
          className={`mt-1 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border bg-[#f7f5ef] p-5 md:p-7">
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
                    <Download size={14} />{" "}
                    {item.attachmentName || t("previewDownloadAttachment")}
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("noAttachment")}
                  </div>
                )}
              </div>
              {(item.attachments ?? []).length > 0 && (
                <div className="mt-6 border-t border-[#d9d7d1] pt-5">
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
                        className="flex items-center gap-2 border border-[#d9d7d1] bg-white p-3 text-sm text-primary underline"
                      >
                        <Download size={14} />
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
          <div className="mt-8 border-t border-[#d9d7d1] pt-6">
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="text-xs text-ink">
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
              <label className="text-xs text-ink">
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
              <label className="flex w-full items-start gap-3 border border-[#c7d4e1] bg-white p-3 text-xs leading-5 text-muted-foreground">
                <input type="checkbox" checked={publicationReviewConfirmed} onChange={event => setPublicationReviewConfirmed(event.target.checked)} className="mt-1" />
                <span>{t("confirmPublicationReview")}</span>
              </label>
              <button
                onClick={() => onApprove(approveDiscipline, approveFolder, true)}
                disabled={approving || !publicationReviewConfirmed}
                className="focus-ring flex items-center gap-2 bg-[#3f7b44] px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white disabled:opacity-50"
              >
                <Check size={14} />{" "}
                {approving ? t("publishing") : t("approvePublish")}
              </button>
              <button
                onClick={() =>
                  setRejectId(rejectId === item.id ? null : item.id)
                }
                className="focus-ring flex items-center gap-2 border border-[#c58e8e] bg-[#fff5f5] px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-[#8a2c2c]"
              >
                <X size={14} /> {t("rejectSendBack")}
              </button>
              <button
                onClick={() => beginEdit(item)}
                className="focus-ring flex items-center gap-2 border border-border bg-white px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink"
              >
                <Edit3 size={14} /> {t("edit")}
              </button>
            </div>
            {rejectId === item.id && (
              <div className="mt-4 border border-[#d9a7a7] bg-[#fff1f1] p-4">
                <label className="font-mono text-[9px] uppercase tracking-[.13em] text-[#8a2c2c]">
                  {t("permanentRejectionComment")}
                  <textarea
                    value={rejectComment}
                    onChange={event => setRejectComment(event.target.value)}
                    className="form-control mt-1 min-h-24 resize-y"
                    placeholder={t("rejectionPlaceholder")}
                  />
                </label>
                <button
                  onClick={onReject}
                  disabled={!rejectComment.trim() || rejecting}
                  className="focus-ring mt-3 bg-[#8a2c2c] px-4 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-white"
                >
                  {rejecting ? t("saving") : t("confirmRejection")}
                </button>
              </div>
            )}
            {editId === item.id && (
              <form
                onSubmit={submitEdit}
                className="mt-4 border border-[#9fb0c4] bg-[#eef4f9] p-4"
              >
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                  <Edit3 size={14} /> {t("fullFormEditingOriginalPreserved")}
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
                <label className="focus-ring mt-4 flex cursor-pointer items-center gap-3 border border-dashed border-[#9fb0c4] bg-white px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  <FileUp size={16} />
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
            <div className="mt-6 border-t border-[#d9d7d1] pt-5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-primary">
                <History size={13} /> {t("fullIterationHistory")}
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
                      className="border border-[#d9d7d1] bg-white p-3"
                    >
                      <div className="flex justify-between gap-3 font-mono text-[9px] uppercase tracking-[.12em] text-primary">
                        <span>{displayAction(record.action)}</span>
                        <span>
                          {new Date(record.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {record.note || t("snapshotRetained")}
                      </p>
                      <details className="mt-3 border-t border-border pt-2">
                        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[.12em] text-primary">
                          {t("viewRetainedSnapshot")}
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap bg-[#f5f2eb] p-3 text-[10px] leading-5 text-ink">
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
  const remove = trpc.admin.deleteExperiment.useMutation({
    onSuccess: item => {
      setSelectedId(null);
      setConfirmTitle("");
      setMessage(
        item
          ? `${t("hiddenRecordPrefix")} #${item.id}: ${item.title}`
          : t("recordHidden")
      );
      void utils.experiments.list.invalidate();
    },
    onError: error => setMessage(`${t("errorPrefix")}: ${error.message}`),
  });
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [message, setMessage] = useState("");
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
    <section className="mb-7 border border-[#d9a7a7] bg-[#fffafa] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[#8a2c2c]">
            {t("dangerZonePublishedExperiments")}
          </div>
        <h2 className="mt-2 font-display text-2xl">{t("managePublicRecords")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("hidePublicRecordDescription")}
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[.13em] text-muted-foreground">
          {experiments.data?.length ?? 0} records
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
        <div
          role={isErrorNotice(message, t("errorPrefix")) ? "alert" : "status"}
          className={`mt-4 border px-4 py-3 text-sm ${isErrorNotice(message, t("errorPrefix")) ? "border-[#d9a7a7] bg-[#fff1f1] text-[#8a2c2c]" : "border-[#b8ccb5] bg-[#edf5eb] text-[#3f7b44]"}`}
        >
          {message}
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
          <div className="border border-dashed border-[#d9a7a7] p-5 text-sm text-muted-foreground">
            {t("noPublicExperimentMatches")}
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="border border-border bg-white p-4">
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
                  className="focus-ring border border-[#c58e8e] px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-[#8a2c2c] hover:bg-[#fff1f1]"
                >
                  {selectedId === item.id ? t("cancel") : t("hide")}
                </button>
              </div>
              {item.category === "Completed Experimental Projects" && (
                <ExperimentMediaUploader experimentId={item.id} />
              )}
              {selectedId === item.id && (
                <div className="mt-4 border-t border-[#ead0d0] pt-4">
                  <label className="block text-sm text-[#8a2c2c]">
                    {t("typeExactTitle")} {" "}
                    <input
                      autoFocus
                      value={confirmTitle}
                      onChange={event => setConfirmTitle(event.target.value)}
                      className="form-control mt-1"
                      placeholder={item.title}
                    />
                  </label>
                  <button
                    disabled={confirmTitle !== item.title || remove.isPending}
                    onClick={() => remove.mutate({ id: item.id, confirmTitle })}
                    className="focus-ring mt-3 bg-[#8a2c2c] px-4 py-3 font-mono text-[10px] uppercase tracking-[.13em] text-white disabled:cursor-not-allowed disabled:opacity-40"
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
  const [message, setMessage] = useState("");
  const [preparing, setPreparing] = useState(false);
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (files.length > 8) {
      setMessage(t("chooseNoMoreEightFiles"));
      return;
    }
    setPreparing(true);
    setMessage("");
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
      .then(prepared =>
        upload.mutate(
          { experimentId, files: prepared },
          {
            onSuccess: result =>
              setMessage(
                `${result?.count ?? prepared.length} ${t("filesAddedToProject")}`
              ),
            onError: error => setMessage(`${t("errorPrefix")}: ${error.message}`),
          }
        )
      )
      .catch((error: Error) => setMessage(`${t("errorPrefix")}: ${error.message}`))
      .finally(() => {
        setPreparing(false);
        event.target.value = "";
      });
  };
  return (
    <div className="mt-4 border border-[#b8ccb5] bg-[#edf5eb] p-4">
      <div className="font-mono text-[9px] uppercase tracking-[.15em] text-[#3f7b44]">
        {t("completedProjectEvidence")}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("completedProjectEvidenceDescription")}
      </p>
      <label className="focus-ring mt-3 flex cursor-pointer items-center gap-2 border border-dashed border-[#7aa67d] bg-white px-3 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-[#3f7b44] hover:border-primary">
        <FileUp size={14} />{" "}
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
        <div
          role={isErrorNotice(message, t("errorPrefix")) ? "alert" : "status"}
          className={`mt-3 text-xs ${isErrorNotice(message, t("errorPrefix")) ? "text-[#8a2c2c]" : "text-[#3f7b44]"}`}
        >
          {message}
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
