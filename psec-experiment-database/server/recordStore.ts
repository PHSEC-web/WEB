import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { attachments, recordRevisions, records } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";

export type RecordLifecycle = "idea" | "design" | "in_progress" | "completed";
export type RecordStatus = "pending" | "needs_revision" | "published" | "rejected" | "hidden";
export type RecordActor = {
  name: string;
  role: "member" | "admin" | "system";
  openId?: string | null;
};

export type RecordAttachmentInput = {
  fileName: string;
  data: string;
  mimeType: string;
  sizeBytes: number;
  kind: "photo" | "data" | "report" | "protocol" | "other";
};

export type ProjectSubmissionInput = {
  memberName: string;
  memberId?: string;
  discipline?: string;
  lifecycle?: RecordLifecycle;
  title: string;
  abstract: string;
  theoreticalBasis?: string;
  historicalBackground?: string;
  hypothesis?: string;
  procedure?: string;
  materials?: string;
  expectedOutput?: string;
  attachments?: RecordAttachmentInput[];
};

type RecordPatch = Partial<{
  discipline: string;
  category: string;
  status: RecordStatus;
  lifecycle: RecordLifecycle | null;
  visibility: "public" | "members";
  title: string;
  abstract: string | null;
  theoreticalBasis: string | null;
  historicalBackground: string | null;
  hypothesis: string | null;
  procedure: string | null;
  materials: string | null;
  expectedOutput: string | null;
  results: string | null;
  limitations: string | null;
  nextQuestion: string | null;
  ethicsReviewed: number;
  ethicsNotes: string | null;
  authorName: string | null;
  authorMemberId: string | null;
  ownerOpenId: string | null;
  reviewComment: string | null;
  requiredChanges: string[] | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
}>;

const transitions: Record<RecordStatus, RecordStatus[]> = {
  pending: ["published", "needs_revision", "rejected"],
  needs_revision: ["pending"],
  published: ["hidden"],
  hidden: ["published"],
  rejected: [],
};

const lifecycleValues = new Set<RecordLifecycle>(["idea", "design", "in_progress", "completed"]);

function clean(value?: string | null) {
  const result = value?.trim();
  return result || null;
}

function recordSnapshot(row: typeof records.$inferSelect) {
  return {
    slug: row.slug,
    recordKind: row.recordKind,
    discipline: row.discipline,
    category: row.category,
    status: row.status,
    lifecycle: row.lifecycle,
    visibility: row.visibility,
    title: row.title,
    abstract: row.abstract,
    theoreticalBasis: row.theoreticalBasis,
    historicalBackground: row.historicalBackground,
    hypothesis: row.hypothesis,
    procedure: row.procedure,
    materials: row.materials,
    expectedOutput: row.expectedOutput,
    results: row.results,
    limitations: row.limitations,
    nextQuestion: row.nextQuestion,
    ethicsReviewed: row.ethicsReviewed,
    ethicsNotes: row.ethicsNotes,
    authorName: row.authorName,
    authorMemberId: row.authorMemberId,
    ownerOpenId: row.ownerOpenId,
    reviewComment: row.reviewComment,
    requiredChanges: row.requiredChanges,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    publishedAt: row.publishedAt,
    revisionCount: row.revisionCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizedPatch(patch: RecordPatch): RecordPatch {
  const next: RecordPatch = { ...patch };
  if (next.discipline !== undefined) next.discipline = clean(next.discipline) || "Social Psychology";
  if (next.category !== undefined) next.category = clean(next.category) || "Club Projects";
  if (next.title !== undefined) next.title = clean(next.title) || "Untitled record";
  const nullableTextFields = ["abstract", "theoreticalBasis", "historicalBackground", "hypothesis", "procedure", "materials", "expectedOutput", "results", "limitations", "nextQuestion", "ethicsNotes", "authorName", "authorMemberId", "ownerOpenId", "reviewComment", "reviewedBy"] as const;
  for (const key of nullableTextFields) if (key in next) next[key] = clean(next[key]);
  if (next.lifecycle && !lifecycleValues.has(next.lifecycle)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid research lifecycle" });
  if (next.results?.trim() && !next.lifecycle) next.lifecycle = "completed";
  return next;
}

function changedFields(current: Record<string, unknown>, patch: RecordPatch) {
  return Object.keys(patch).filter((key) => JSON.stringify(current[key]) !== JSON.stringify(patch[key as keyof RecordPatch]));
}

async function nextAvailableSlug(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 130) || "psec-record";
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix ? `${base}-${suffix + 1}` : base;
    const existing = await db.select({ id: records.id }).from(records).where(eq(records.slug, slug)).limit(1);
    if (!existing.length) return slug;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 160);
}

export async function appendRecord(input: {
  recordId: number;
  patch: RecordPatch;
  actor: RecordActor;
  action: string;
  summary: string;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  if (!input.summary.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "A revision summary is required" });
  const patch = normalizedPatch(input.patch);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const current = (await tx.select().from(records).where(and(eq(records.id, input.recordId), isNull(records.deletedAt))).limit(1))[0];
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
        if (patch.status && patch.status === current.status && ["review_passed", "review_rejected", "review_needs_revision"].includes(input.action)) {
          throw new TRPCError({ code: "CONFLICT", message: "This review decision has already been recorded" });
        }
        if (patch.status && patch.status !== current.status && !transitions[current.status].includes(patch.status)) {
          throw new TRPCError({ code: "CONFLICT", message: `Cannot move a ${current.status} record to ${patch.status}` });
        }
        const currentSnapshot = recordSnapshot(current);
        const fields = changedFields(currentSnapshot, patch);
        if (!fields.length) throw new TRPCError({ code: "CONFLICT", message: "This action would not change the record" });
        const latest = (await tx.select({ revisionNo: recordRevisions.revisionNo }).from(recordRevisions).where(eq(recordRevisions.recordId, current.id)).orderBy(desc(recordRevisions.revisionNo)).limit(1))[0];
        const revisionNo = (latest?.revisionNo || 0) + 1;
        const now = new Date();
        const effectivePatch: RecordPatch = { ...patch, revisionCount: revisionNo, reviewedAt: patch.reviewedAt, publishedAt: patch.publishedAt } as RecordPatch;
        await tx.update(records).set({ ...effectivePatch, updatedAt: now }).where(eq(records.id, current.id));
        const next = { ...current, ...effectivePatch, updatedAt: now, revisionCount: revisionNo } as typeof records.$inferSelect;
        const inserted = await tx.insert(recordRevisions).values({
          recordId: current.id,
          revisionNo,
          action: input.action,
          summary: input.summary.trim().slice(0, 240),
          changedFields: fields,
          snapshotJson: JSON.stringify(recordSnapshot(next)),
          editorOpenId: input.actor.openId || null,
          editorName: input.actor.name.slice(0, 160),
          editorRole: input.actor.role,
          note: clean(input.note),
          createdAt: now,
        });
        return { record: next, revisionNo, revisionId: Number(inserted[0].insertId) };
      });
    } catch (error) {
      if (attempt === 2 || !(error instanceof Error) || !/duplicate|unique/i.test(error.message)) throw error;
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Could not allocate a revision number" });
}

export async function createProjectRecord(input: ProjectSubmissionInput, actor?: Partial<RecordActor>) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const submitter = input.memberName.trim();
  const title = input.title.trim();
  const abstract = input.abstract.trim();
  if (!submitter || !title || !abstract) throw new TRPCError({ code: "BAD_REQUEST", message: "Submitter name, title, and one-sentence summary are required" });
  const now = new Date();
  const slug = await nextAvailableSlug(db, title);
  const lifecycle = input.lifecycle && lifecycleValues.has(input.lifecycle) ? input.lifecycle : "idea";
  const inserted = await db.insert(records).values({
    slug,
    recordKind: "project",
    discipline: clean(input.discipline) || "Social Psychology",
    category: "Club Projects",
    status: "pending",
    lifecycle,
    visibility: "public",
    title,
    abstract,
    theoreticalBasis: clean(input.theoreticalBasis),
    historicalBackground: clean(input.historicalBackground),
    hypothesis: clean(input.hypothesis),
    procedure: clean(input.procedure),
    materials: clean(input.materials),
    expectedOutput: clean(input.expectedOutput),
    authorName: submitter,
    authorMemberId: clean(input.memberId),
    ownerOpenId: actor?.openId || null,
    revisionCount: 1,
    createdAt: now,
    updatedAt: now,
  });
  const recordId = Number(inserted[0].insertId);
  const record = (await db.select().from(records).where(eq(records.id, recordId)).limit(1))[0];
  if (!record) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Record could not be created" });
  await db.insert(recordRevisions).values({
    recordId,
    revisionNo: 1,
    action: "created",
    summary: "Original member submission",
    changedFields: ["title", "abstract", "lifecycle"],
    snapshotJson: JSON.stringify(recordSnapshot(record)),
    editorOpenId: actor?.openId || null,
    editorName: (actor?.name || submitter).slice(0, 160),
    editorRole: actor?.role || "member",
    note: "Created through the member submission form",
    createdAt: now,
  });
  if (input.attachments?.length) await appendRecordAttachments({ recordId, attachments: input.attachments, actor: { name: actor?.name || submitter, role: actor?.role || "member", openId: actor?.openId } });
  return { id: recordId, slug, revisionNo: input.attachments?.length ? 2 : 1 };
}

async function appendRecordAttachments(input: { recordId: number; attachments: RecordAttachmentInput[]; actor: RecordActor }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const appended = await appendRecord({
    recordId: input.recordId,
    patch: { revisionCount: 2 } as RecordPatch,
    actor: input.actor,
    action: "attachment_added",
    summary: `${input.attachments.length} attachment${input.attachments.length === 1 ? "" : "s"} added`,
  });
  for (const file of input.attachments) {
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "attachment";
    const base64 = file.data.includes(",") ? file.data.split(",").pop() : file.data;
    const stored = await storagePut(`psec-records/${input.recordId}/${Date.now()}-${safeName}`, Buffer.from(base64 || "", "base64"), file.mimeType || "application/octet-stream");
    await db.insert(attachments).values({
      recordId: input.recordId,
      revisionId: appended.revisionId,
      fileName: file.fileName,
      storageKey: stored.key,
      mimeType: file.mimeType || "application/octet-stream",
      sizeBytes: file.sizeBytes,
      kind: file.kind,
      visibility: file.kind === "data" ? "members" : "public",
      uploadedByOpenId: input.actor.openId || null,
      uploadedByName: input.actor.name,
    });
  }
}

export async function listPublicRecords(filters?: { discipline?: string; recordKind?: "reference" | "project"; lifecycle?: RecordLifecycle }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(records).where(and(eq(records.status, "published"), eq(records.visibility, "public"), isNull(records.deletedAt))).orderBy(desc(records.publishedAt), desc(records.createdAt));
  const filtered = rows.filter((row) => (!filters?.discipline || row.discipline === filters.discipline) && (!filters?.recordKind || row.recordKind === filters.recordKind) && (!filters?.lifecycle || row.lifecycle === filters.lifecycle));
  return Promise.all(filtered.map(async (row) => {
    const files = await db.select({ id: attachments.id }).from(attachments).where(and(eq(attachments.recordId, row.id), eq(attachments.visibility, "public"), isNull(attachments.deletedAt)));
    return { ...row, author: row.authorName, attachmentCount: files.length };
  }));
}

export async function listPendingRecords(filters?: { discipline?: string; from?: number; to?: number }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(records).where(and(eq(records.status, "pending"), isNull(records.deletedAt))).orderBy(desc(records.createdAt));
  const filtered = rows.filter((row) => {
    const timestamp = new Date(row.createdAt).getTime();
    return (!filters?.discipline || row.discipline === filters.discipline) && (!filters?.from || timestamp >= filters.from) && (!filters?.to || timestamp <= filters.to);
  });
  return Promise.all(filtered.map(async (row) => ({
    ...row,
    memberName: row.authorName || "",
    memberId: row.authorMemberId || "",
    submittedAt: row.createdAt,
    attachmentName: null,
    attachmentUrl: null,
    attachments: (await db.select({ id: attachments.id, fileName: attachments.fileName, storageKey: attachments.storageKey, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, kind: attachments.kind }).from(attachments).where(and(eq(attachments.recordId, row.id), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt))).map((file) => ({ ...file, url: `/manus-storage/${file.storageKey}` })),
  })));
}

export async function getRecordHistory(recordId: number) {
  const db = await getDb();
  if (!db) return [];
  const history = await db.select().from(recordRevisions).where(eq(recordRevisions.recordId, recordId)).orderBy(desc(recordRevisions.revisionNo));
  return history.map((revision) => ({ ...revision, submissionId: revision.recordId, editor: revision.editorName || "PSEC" }));
}

export async function updateRecordAsAdmin(input: { id: number; actor: RecordActor; values: ProjectSubmissionInput; note?: string }) {
  return appendRecord({
    recordId: input.id,
    actor: input.actor,
    action: "edited_by_admin",
    summary: "Administrator appended a corrected record version",
    note: input.note,
    patch: {
      discipline: clean(input.values.discipline) || "Social Psychology",
      title: input.values.title,
      abstract: clean(input.values.abstract),
      theoreticalBasis: clean(input.values.theoreticalBasis),
      historicalBackground: clean(input.values.historicalBackground),
      hypothesis: clean(input.values.hypothesis),
      procedure: clean(input.values.procedure),
      materials: clean(input.values.materials),
      expectedOutput: clean(input.values.expectedOutput),
      authorName: clean(input.values.memberName),
      authorMemberId: clean(input.values.memberId),
      lifecycle: input.values.lifecycle || "idea",
    },
  });
}

export async function approveRecord(input: { id: number; actor: RecordActor; discipline?: string }) {
  return appendRecord({
    recordId: input.id,
    actor: input.actor,
    action: "review_passed",
    summary: "Approved and published to the public archive",
    patch: {
      status: "published",
      discipline: clean(input.discipline) || undefined,
      reviewedBy: input.actor.name,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      reviewComment: null,
      requiredChanges: null,
    },
  });
}

export async function rejectRecord(input: { id: number; actor: RecordActor; comment: string }) {
  return appendRecord({
    recordId: input.id,
    actor: input.actor,
    action: "review_rejected",
    summary: "Rejected with a review comment",
    note: input.comment,
    patch: { status: "rejected", reviewComment: input.comment, reviewedBy: input.actor.name, reviewedAt: new Date() },
  });
}

export async function deleteRecordAsAdmin(id: number, confirmTitle: string) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select({ id: records.id, title: records.title }).from(records).where(and(eq(records.id, id), isNull(records.deletedAt))).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
  if (current.title !== confirmTitle) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation title does not match" });
  await appendRecord({
    recordId: id,
    actor: { name: "PSEC admin", role: "admin" },
    action: "hidden",
    summary: "Hidden by administrator after title confirmation",
    patch: { status: "hidden" },
  });
  return current;
}

export async function listRecentPublishedRecords(limit = 5) {
  const rows = await listPublicRecords();
  return rows.slice(0, limit).map((row) => ({ id: row.id, title: row.title, discipline: row.discipline, category: row.category, status: row.status, reviewedAt: row.reviewedAt }));
}


async function requireRecordOwner(recordId: number, ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const row = (await db.select().from(records).where(and(eq(records.id, recordId), isNull(records.deletedAt))).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
  if (row.ownerOpenId !== ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the record owner can append to this record" });
  return row;
}

async function publicAttachmentsForRecord(recordId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: attachments.id,
    revisionId: attachments.revisionId,
    fileName: attachments.fileName,
    storageKey: attachments.storageKey,
    mimeType: attachments.mimeType,
    sizeBytes: attachments.sizeBytes,
    kind: attachments.kind,
    visibility: attachments.visibility,
    createdAt: attachments.createdAt,
  }).from(attachments).where(and(eq(attachments.recordId, recordId), eq(attachments.visibility, "public"), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt));
  return rows.map((row) => ({ ...row, url: `/manus-storage/${row.storageKey}` }));
}

export async function getPublicRecordBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const record = (await db.select().from(records).where(and(eq(records.slug, slug), eq(records.status, "published"), eq(records.visibility, "public"), isNull(records.deletedAt))).limit(1))[0];
  if (!record) return null;
  return { ...record, attachments: await publicAttachmentsForRecord(record.id) };
}

export async function listPublicRecordTimeline(slug: string) {
  const record = await getPublicRecordBySlug(slug);
  if (!record) return null;
  const db = await getDb();
  if (!db) return null;
  const revisions = await db.select({
    id: recordRevisions.id,
    revisionNo: recordRevisions.revisionNo,
    action: recordRevisions.action,
    summary: recordRevisions.summary,
    changedFields: recordRevisions.changedFields,
    editorName: recordRevisions.editorName,
    editorRole: recordRevisions.editorRole,
    createdAt: recordRevisions.createdAt,
  }).from(recordRevisions).where(eq(recordRevisions.recordId, record.id)).orderBy(recordRevisions.revisionNo);
  return { record, revisions };
}

export async function getEvidencePack(slug: string) {
  const timeline = await listPublicRecordTimeline(slug);
  if (!timeline) return null;
  return {
    record: timeline.record,
    revisions: timeline.revisions,
    attachments: timeline.record.attachments,
    generatedAt: new Date(),
    siteName: "PSEC Social Experiment Database",
    schemaVersion: "S5.0",
  };
}

export async function listMyRecords(ownerOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(records).where(and(eq(records.ownerOpenId, ownerOpenId), isNull(records.deletedAt))).orderBy(desc(records.updatedAt));
  return Promise.all(rows.map(async (record) => ({
    ...record,
    attachments: await publicAttachmentsForRecord(record.id),
  })));
}

export async function appendResultAsOwner(input: {
  id: number;
  ownerOpenId: string;
  actor: RecordActor;
  results: string;
  limitations?: string;
  nextQuestion?: string;
  ethicsNotes?: string;
  summary: string;
  attachments?: RecordAttachmentInput[];
}) {
  await requireRecordOwner(input.id, input.ownerOpenId);
  if (!input.results.trim() && !(input.attachments?.length)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Add a result, conclusion, or at least one supporting attachment" });
  }
  const appended = await appendRecord({
    recordId: input.id,
    actor: input.actor,
    action: "appended_result",
    summary: input.summary,
    patch: {
      results: clean(input.results),
      limitations: clean(input.limitations),
      nextQuestion: clean(input.nextQuestion),
      ethicsNotes: clean(input.ethicsNotes),
      lifecycle: "completed",
    },
  });
  if (input.attachments?.length) await storeRecordAttachmentsForRevision({ recordId: input.id, revisionId: appended.revisionId, attachments: input.attachments, actor: input.actor });
  return appended;
}

async function storeRecordAttachmentsForRevision(input: { recordId: number; revisionId: number; attachments: RecordAttachmentInput[]; actor: RecordActor }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  for (const file of input.attachments) {
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "attachment";
    const base64 = file.data.includes(",") ? file.data.split(",").pop() : file.data;
    const stored = await storagePut(`psec-records/${input.recordId}/${Date.now()}-${safeName}`, Buffer.from(base64 || "", "base64"), file.mimeType || "application/octet-stream");
    await db.insert(attachments).values({
      recordId: input.recordId,
      revisionId: input.revisionId,
      fileName: file.fileName,
      storageKey: stored.key,
      mimeType: file.mimeType || "application/octet-stream",
      sizeBytes: file.sizeBytes,
      kind: file.kind,
      visibility: file.kind === "data" ? "members" : "public",
      uploadedByOpenId: input.actor.openId || null,
      uploadedByName: input.actor.name,
    });
  }
}

export function asRecordInput(input: ProjectSubmissionInput): ProjectSubmissionInput {
  return input;
}
