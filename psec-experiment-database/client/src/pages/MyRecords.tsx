import {
  CheckCircle2,
  FileUp,
  FolderOpen,
  History,
  LogIn,
  PlusCircle,
  Send,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
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

export default function MyRecords() {
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
  const [summary, setSummary] = useState(
    "Added results and supporting evidence"
  );
  const [files, setFiles] = useState<Upload[]>([]);
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const remove = trpc.records.deleteOwn.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      setConfirmTitle("");
      setMessage("Project removed from your records and the public archive.");
      void utils.records.mine.invalidate();
      void utils.records.list.invalidate();
      void utils.experiments.list.invalidate();
      void utils.experiments.completed.invalidate();
    },
    onError: error => setMessage(error.message),
  });
  const append = trpc.records.appendResult.useMutation({
    onSuccess: () => {
      setMessage("A new completed-project version has been added.");
      setActiveId(null);
      setResults("");
      setLimitations("");
      setNextQuestion("");
      setEthicsNotes("");
      setFiles([]);
      void utils.records.mine.invalidate();
      void utils.records.list.invalidate();
    },
    onError: error => setMessage(error.message),
  });
  const records = mine.data ?? [];
  const pending = useMemo(
    () => records.filter(record => record.status !== "published"),
    [records]
  );

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    if (files.length + selected.length > 8) {
      setMessage("You can upload up to eight files with this evidence update.");
      return;
    }
    const bad = selected.find(
      file => !allowed.has(file.type) || file.size > 8 * 1024 * 1024
    );
    if (bad) {
      setMessage(`${bad.name} is unsupported or over 8 MB.`);
      return;
    }
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
              reject(new Error(`Could not read ${file.name}`));
            reader.readAsDataURL(file);
          })
      )
    )
      .then(prepared => setFiles(current => [...current, ...prepared]))
      .catch((error: Error) => setMessage(error.message));
    event.target.value = "";
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeId) return;
    setMessage("");
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
      <div className="mx-auto max-w-[1440px] px-5 py-24 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
        Checking member session…
      </div>
    );
  if (!user)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10">
        <div className="mx-auto max-w-2xl border border-border bg-card p-8 md:p-12">
          <div className="flex h-11 w-11 items-center justify-center bg-[#e7eef6] text-primary">
            <LogIn size={19} />
          </div>
          <div className="mt-7 font-mono text-[10px] uppercase tracking-[.18em] text-primary">
            Member workspace
          </div>
          <h1 className="mt-3 font-display text-4xl tracking-[-.04em]">
            Your research record.
          </h1>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Sign in with your school email to submit a project, follow its
            review status, and append completed results or supporting reports.
          </p>
          <button
            onClick={() => startLogin()}
            className="focus-ring mt-8 inline-flex items-center gap-2 bg-primary px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
          >
            <LogIn size={14} /> Sign in to continue
          </button>
        </div>
      </div>
    );
  return (
    <div>
      <section className="navy-grid text-white">
        <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-14 lg:px-10 lg:pb-18 lg:pt-20">
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-signal">
            Member workspace / {user.name || "PSEC member"}
          </div>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-.06em]">
            My research
            <br />
            <span className="text-[#9dc4f4]">records.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-7 text-white/60">
            Track your record status, read review feedback, and append a durable
            version when your project produces results.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
        {message && (
          <div
            role="status"
            className="mb-6 border border-[#b8ccb5] bg-[#edf5eb] px-4 py-3 text-sm text-[#3f7b44]"
          >
            {message}
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
              {records.length} owned record{records.length === 1 ? "" : "s"}
            </div>
            <h2 className="mt-2 font-display text-3xl">Research lifecycle</h2>
          </div>
          <Link
            href="/submit"
            className="focus-ring inline-flex items-center gap-2 bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
          >
            <PlusCircle size={14} /> New project
          </Link>
        </div>
        {mine.isLoading ? (
          <div className="py-12 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
            Loading your records…
          </div>
        ) : records.length === 0 ? (
          <div className="mt-8 border border-dashed border-[#aeb9c8] bg-[#f0f4f8] p-10 text-center">
            <FolderOpen className="mx-auto text-primary" size={24} />
            <h2 className="mt-4 font-display text-2xl">No records yet.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a question; your submitted record will appear here
              immediately.
            </p>
            <Link
              href="/submit"
              className="mt-6 inline-flex bg-primary px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white"
            >
              Create a record
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {records.map(record => (
              <article
                key={record.id}
                className="border border-border bg-card p-5 md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[.14em] text-primary">
                      {record.status} ·{" "}
                      {record.lifecycle?.replace("_", " ") || "reference"} · v
                      {record.revisionCount}
                    </div>
                    <h2 className="mt-2 font-display text-2xl">
                      {record.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {record.abstract}
                    </p>
                    {record.reviewComment && (
                      <p className="mt-4 border-l-2 border-[#c58e8e] pl-3 text-sm text-[#8a2c2c]">
                        Review note: {record.reviewComment}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.status === "published" && (
                      <Link
                        href={`/records/${record.slug}`}
                        className="focus-ring border border-border bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-primary"
                      >
                        Open public record
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setActiveId(activeId === record.id ? null : record.id);
                        setMessage("");
                      }}
                      className="focus-ring inline-flex items-center gap-2 bg-[#3f7b44] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-white"
                    >
                      <CheckCircle2 size={14} /> Add results
                    </button>
                    {record.recordKind === "project" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(
                            deleteId === record.id ? null : record.id
                          );
                          setConfirmTitle("");
                          setMessage("");
                        }}
                        className="focus-ring inline-flex items-center gap-2 border border-[#c58e8e] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#8a2c2c]"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {deleteId === record.id && (
                  <div className="mt-6 border-t border-[#ead0d0] pt-5">
                    <label className="block text-sm text-[#8a2c2c]">
                      Type the exact project title to remove it from your
                      records and the public archive.
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
                        className="focus-ring bg-[#8a2c2c] px-4 py-3 text-xs text-white disabled:opacity-50"
                      >
                        {remove.isPending ? "Removing..." : "Confirm removal"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(null);
                          setConfirmTitle("");
                        }}
                        className="focus-ring border border-border px-4 py-3 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {activeId === record.id && (
                  <form
                    onSubmit={submit}
                    className="mt-6 border-t border-border pt-6"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[.15em] text-[#3f7b44]">
                      Append completed-project results
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TextArea
                        label="Results & conclusions"
                        value={results}
                        onChange={setResults}
                        required
                      />
                      <TextArea
                        label="Limitations & reflection"
                        value={limitations}
                        onChange={setLimitations}
                      />
                      <TextArea
                        label="Next question"
                        value={nextQuestion}
                        onChange={setNextQuestion}
                      />
                      <TextArea
                        label="Ethics / consent notes"
                        value={ethicsNotes}
                        onChange={setEthicsNotes}
                      />
                      <label className="md:col-span-2">
                        <span className="font-mono text-[9px] uppercase tracking-[.13em] text-ink">
                          Revision summary
                        </span>
                        <input
                          value={summary}
                          onChange={event => setSummary(event.target.value)}
                          className="form-control mt-1"
                          required
                        />
                      </label>
                    </div>
                    <label className="focus-ring mt-5 flex cursor-pointer items-center gap-3 border border-dashed border-[#7aa67d] bg-[#edf5eb] px-4 py-4 text-sm text-muted-foreground">
                      <FileUp size={17} className="text-[#3f7b44]" />
                      <span>
                        <strong className="block text-ink">
                          Attach a report, image, or dataset
                        </strong>
                        <span className="text-xs">
                          Reports and photos become public; raw data remains
                          member-only.
                        </span>
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.txt,.csv,.json,.xlsx,.xls,.zip"
                        className="sr-only"
                        onChange={onFiles}
                      />
                    </label>
                    {files.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {files.map((file, index) => (
                          <span
                            key={`${file.fileName}-${index}`}
                            className="border border-[#b8ccb5] bg-white px-3 py-2 text-xs text-ink"
                          >
                            {file.fileName}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={
                        append.isPending ||
                        (!results.trim() && files.length === 0)
                      }
                      className="focus-ring mt-5 inline-flex items-center gap-2 bg-[#3f7b44] px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white disabled:opacity-50"
                    >
                      <Send size={14} />{" "}
                      {append.isPending
                        ? "Appending…"
                        : "Append completed result"}
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}{" "}
        {pending.length > 0 && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <History size={15} /> {pending.length} record
            {pending.length === 1 ? " is" : "s are"} awaiting review or further
            action.
          </p>
        )}
      </main>
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
    <label>
      <span className="font-mono text-[9px] uppercase tracking-[.13em] text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        className="form-control mt-1 min-h-28 resize-y"
        required={required}
      />
    </label>
  );
}
