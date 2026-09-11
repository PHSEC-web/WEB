import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, attachments, evidenceSubmissions, executionRecords, experiments, submissionHistory, submissions, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listExperiments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(experiments).orderBy(desc(experiments.createdAt));
}

export async function listCompletedExperiments() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: experiments.id, slug: experiments.slug, title: experiments.title, discipline: experiments.discipline, category: experiments.category }).from(experiments).where(eq(experiments.category, "Completed Experimental Projects")).orderBy(experiments.title);
}

export async function listExecutionRecords(slug: string) {
  const db = await getDb();
  if (!db) return [];
  const target = (await db.select({ id: experiments.id, category: experiments.category }).from(experiments).where(eq(experiments.slug, slug)).limit(1))[0];
  if (!target || target.category !== "Completed Experimental Projects") return [];
  const rows = await db.select().from(executionRecords).where(eq(executionRecords.experimentId, target.id)).orderBy(desc(executionRecords.createdAt));
  return Promise.all(rows.map(async (row) => ({
    ...row,
    attachments: (await db.select({ id: attachments.id, fileName: attachments.fileName, storageKey: attachments.storageKey, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, kind: attachments.kind }).from(attachments).where(and(eq(attachments.executionRecordId, row.id), eq(attachments.visibility, "public"), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt))).map((file) => ({ ...file, url: `/manus-storage/${file.storageKey}` })),
  })));
}

export async function createEvidenceSubmission(input: { submitterName: string; experimentId: number; observationNotes?: string; files?: AttachmentInput[] }) {
  const db = await getDb();
  if (!db) return null;
  const target = (await db.select({ id: experiments.id, category: experiments.category }).from(experiments).where(eq(experiments.id, input.experimentId)).limit(1))[0];
  if (!target || target.category !== "Completed Experimental Projects") throw new Error("Choose an existing Completed Experimental Project");
  const result = await db.insert(evidenceSubmissions).values({ submitterName: input.submitterName.trim(), experimentId: input.experimentId, observationNotes: input.observationNotes?.trim() || null, status: "pending" });
  const id = Number(result[0].insertId);
  for (const file of input.files ?? []) {
    const stored = await storeAttachment(file, `psec-evidence/${id}`);
    await db.insert(attachments).values({ recordId: null, experimentId: null, submissionId: null, evidenceSubmissionId: id, executionRecordId: null, fileName: stored.fileName, storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, kind: stored.kind, visibility: "members", uploadedByName: input.submitterName.trim() });
  }
  return { id };
}

export async function listPendingEvidenceSubmissions() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ evidence: evidenceSubmissions, experimentTitle: experiments.title, experimentSlug: experiments.slug, experimentCategory: experiments.category }).from(evidenceSubmissions).leftJoin(experiments, eq(evidenceSubmissions.experimentId, experiments.id)).where(eq(evidenceSubmissions.status, "pending")).orderBy(desc(evidenceSubmissions.submittedAt));
  return Promise.all(rows.map(async (row) => ({ ...row.evidence, experimentTitle: row.experimentTitle, experimentSlug: row.experimentSlug, experimentCategory: row.experimentCategory, attachments: (await db.select({ id: attachments.id, fileName: attachments.fileName, storageKey: attachments.storageKey, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, kind: attachments.kind }).from(attachments).where(and(eq(attachments.evidenceSubmissionId, row.evidence.id), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt))).map((file) => ({ ...file, url: `/manus-storage/${file.storageKey}` })) })));
}

export async function approveEvidenceSubmission(input: { id: number; editor: string }) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select().from(evidenceSubmissions).where(eq(evidenceSubmissions.id, input.id)).limit(1))[0];
  if (!current || current.status !== "pending") throw new Error("Evidence submission is no longer pending");
  const target = (await db.select({ id: experiments.id, category: experiments.category }).from(experiments).where(eq(experiments.id, current.experimentId)).limit(1))[0];
  if (!target || target.category !== "Completed Experimental Projects") {
    await db.update(evidenceSubmissions).set({ status: "rejected", rejectionComment: "The selected completed experiment is no longer available.", reviewedAt: new Date(), reviewedBy: input.editor }).where(eq(evidenceSubmissions.id, input.id));
    throw new Error("The selected completed experiment is no longer available; the evidence was rejected and retained.");
  }
  const execution = await db.insert(executionRecords).values({ experimentId: target.id, evidenceSubmissionId: current.id, submitterName: current.submitterName, observationNotes: current.observationNotes });
  const executionRecordId = Number(execution[0].insertId);
  await db.update(attachments).set({ experimentId: target.id, executionRecordId, visibility: "public" }).where(eq(attachments.evidenceSubmissionId, current.id));
  await db.update(evidenceSubmissions).set({ status: "approved", reviewedAt: new Date(), reviewedBy: input.editor }).where(eq(evidenceSubmissions.id, input.id));
  return { id: current.id, experimentId: target.id, executionRecordId };
}

export async function rejectEvidenceSubmission(input: { id: number; editor: string; comment: string }) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select().from(evidenceSubmissions).where(eq(evidenceSubmissions.id, input.id)).limit(1))[0];
  if (!current || current.status !== "pending") throw new Error("Evidence submission is no longer pending");
  await db.update(evidenceSubmissions).set({ status: "rejected", rejectionComment: input.comment.trim(), reviewedAt: new Date(), reviewedBy: input.editor }).where(eq(evidenceSubmissions.id, input.id));
  return { id: current.id };
}

export async function deleteExperimentAsAdmin(id: number, confirmTitle: string) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select({ id: experiments.id, title: experiments.title, category: experiments.category, author: experiments.author }).from(experiments).where(eq(experiments.id, id)).limit(1))[0];
  if (!current) throw new Error("Experiment not found");
  if (current.title !== confirmTitle) throw new Error("Confirmation title does not match");
  await db.delete(experiments).where(eq(experiments.id, id));
  return current;
}

export async function listRecentSubmissions(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: submissions.id, title: submissions.title, discipline: submissions.publishedDiscipline, category: submissions.publishedCategory, status: submissions.status, reviewedAt: submissions.reviewedAt }).from(submissions).where(eq(submissions.status, "approved")).orderBy(desc(submissions.submittedAt)).limit(limit);
  return rows;
}

export type SubmissionCreateInput = {
  memberName: string;
  memberId: string;
  discipline: string;
  title: string;
  theoreticalBasis?: string;
  historicalBackground?: string;
  hypothesis?: string;
  procedure?: string;
  materials?: string;
  expectedOutput?: string;
  attachmentName?: string;
  attachmentData?: string;
  attachmentMimeType?: string;
  attachments?: AttachmentInput[];
};

export type AttachmentInput = {
  fileName: string;
  data: string;
  mimeType: string;
  sizeBytes: number;
  kind: "photo" | "data" | "report" | "protocol" | "other";
};

export type StoredAttachment = {
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentInput["kind"];
};

async function storeAttachment(input: AttachmentInput, prefix: string): Promise<StoredAttachment> {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "attachment";
  const base64 = input.data.includes(",") ? input.data.split(",").pop() : input.data;
  const stored = await storagePut(`${prefix}/${Date.now()}-${safeName}`, Buffer.from(base64 || "", "base64"), input.mimeType || "application/octet-stream");
  return { fileName: input.fileName, storageKey: stored.key, url: stored.url, mimeType: input.mimeType || "application/octet-stream", sizeBytes: input.sizeBytes, kind: input.kind };
}

function submissionSnapshot(input: Record<string, unknown>) {
  const text = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  return {
    memberName: text("memberName"),
    memberId: text("memberId"),
    discipline: text("discipline"),
    title: text("title"),
    theoreticalBasis: text("theoreticalBasis"),
    historicalBackground: text("historicalBackground"),
    hypothesis: text("hypothesis"),
    procedure: text("procedure"),
    materials: text("materials"),
    expectedOutput: text("expectedOutput"),
    attachmentName: text("attachmentName"),
    attachmentKey: text("attachmentKey"),
    attachmentUrl: text("attachmentUrl"),
    status: text("status") || "pending",
    publishedDiscipline: input.publishedDiscipline ?? null,
    publishedCategory: input.publishedCategory ?? null,
    rejectionComment: input.rejectionComment ?? null,
  };
}

export async function createSubmission(input: SubmissionCreateInput) {
  const db = await getDb();
  if (!db) return null;

  let attachment: { key: string; url: string } | undefined;
  if (input.attachmentData) {
    const safeName = (input.attachmentName || "attachment").replace(/[^a-zA-Z0-9._-]/g, "-");
    const base64 = input.attachmentData.includes(",") ? input.attachmentData.split(",").pop() : input.attachmentData;
    attachment = await storagePut(`psec-submissions/${Date.now()}-${safeName}`, Buffer.from(base64 || "", "base64"), input.attachmentMimeType || "application/octet-stream");
  }

  const now = new Date();
  const values = {
    memberName: input.memberName.trim(),
    memberId: input.memberId.trim(),
    discipline: input.discipline?.trim() || "",
    title: input.title.trim(),
    theoreticalBasis: input.theoreticalBasis?.trim() || null,
    historicalBackground: input.historicalBackground?.trim() || null,
    hypothesis: input.hypothesis?.trim() || null,
    procedure: input.procedure?.trim() || null,
    materials: input.materials?.trim() || null,
    expectedOutput: input.expectedOutput || null,
    attachmentName: input.attachmentName || null,
    attachmentKey: attachment?.key || null,
    attachmentUrl: attachment?.url || null,
    status: "pending",
    submittedAt: now,
    updatedAt: now,
  } as const;
  const result = await db.insert(submissions).values(values);
  const id = Number(result[0].insertId);
  const files = input.attachments ?? [];
  for (const file of files) {
    const stored = await storeAttachment(file, `psec-submissions/${id}`);
    await db.insert(attachments).values({
      recordId: null,
      experimentId: null,
      submissionId: id,
      fileName: stored.fileName,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      kind: stored.kind,
      visibility: "members",
      uploadedByName: values.memberName || values.memberId,
    });
  }
  if (attachment && files.length === 0) {
    await db.insert(attachments).values({
      recordId: null,
      experimentId: null,
      submissionId: id,
      fileName: values.attachmentName || "attachment",
      storageKey: attachment.key,
      mimeType: input.attachmentMimeType || "application/octet-stream",
      sizeBytes: 0,
      kind: "other",
      visibility: "members",
      uploadedByName: values.memberName || values.memberId,
    });
  }
  await db.insert(submissionHistory).values({
    submissionId: id,
    action: "submitted",
    editor: values.memberName || values.memberId,
    note: "Original member submission",
    snapshotJson: JSON.stringify(submissionSnapshot(values)),
    createdAt: now,
  });
  return { id };
}

export async function listPendingSubmissions(filters?: { discipline?: string; from?: number; to?: number }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(submissions).where(eq(submissions.status, "pending")).orderBy(desc(submissions.submittedAt));
  const filtered = rows.filter((row) => {
    const timestamp = new Date(row.submittedAt).getTime();
    const disciplineMatch = !filters?.discipline || row.discipline === filters.discipline;
    const fromMatch = !filters?.from || timestamp >= filters.from;
    const toMatch = !filters?.to || timestamp <= filters.to;
    return disciplineMatch && fromMatch && toMatch;
  });
  return Promise.all(filtered.map(async (row) => ({
    ...row,
    attachments: (await db.select({ id: attachments.id, fileName: attachments.fileName, storageKey: attachments.storageKey, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, kind: attachments.kind }).from(attachments).where(and(eq(attachments.submissionId, row.id), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt))).map((file) => ({ ...file, url: `/manus-storage/${file.storageKey}` })),
  })));
}

export async function listExperimentAttachments(slug: string) {
  const db = await getDb();
  if (!db) return [];
  const experiment = (await db.select({ id: experiments.id, category: experiments.category }).from(experiments).where(eq(experiments.slug, slug)).limit(1))[0];
  if (!experiment || experiment.category !== "Completed Experimental Projects") return [];
  const rows = await db.select({ id: attachments.id, fileName: attachments.fileName, storageKey: attachments.storageKey, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, kind: attachments.kind, createdAt: attachments.createdAt }).from(attachments).where(and(eq(attachments.experimentId, experiment.id), eq(attachments.visibility, "public"), isNull(attachments.deletedAt))).orderBy(desc(attachments.createdAt));
  return rows.map((row) => ({ ...row, url: `/manus-storage/${row.storageKey}` }));
}

export async function uploadExperimentAttachments(input: { experimentId: number; files: AttachmentInput[]; uploader: string }) {
  const db = await getDb();
  if (!db) return null;
  const experiment = (await db.select({ id: experiments.id, slug: experiments.slug, category: experiments.category }).from(experiments).where(eq(experiments.id, input.experimentId)).limit(1))[0];
  if (!experiment) throw new Error("Experiment not found");
  if (experiment.category !== "Completed Experimental Projects") throw new Error("Only completed experimental projects support process media uploads");
  for (const file of input.files) {
    const stored = await storeAttachment(file, `psec-experiments/${experiment.id}`);
    await db.insert(attachments).values({
      recordId: null,
      experimentId: experiment.id,
      submissionId: null,
      fileName: stored.fileName,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      kind: stored.kind,
      visibility: "public",
      uploadedByName: input.uploader,
    });
  }
  return { experiment, count: input.files.length };
}

export async function getSubmissionHistory(submissionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(submissionHistory).where(eq(submissionHistory.submissionId, submissionId)).orderBy(desc(submissionHistory.createdAt));
}

export async function updateSubmissionAsAdmin(input: { id: number; editor: string; values: SubmissionCreateInput; note?: string }) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select().from(submissions).where(eq(submissions.id, input.id)).limit(1))[0];
  if (!current) throw new Error("Submission not found");
  const now = new Date();
  let replacement: { key: string; url: string } | undefined;
  if (input.values.attachmentData) {
    const safeName = (input.values.attachmentName || "attachment").replace(/[^a-zA-Z0-9._-]/g, "-");
    const base64 = input.values.attachmentData.includes(",") ? input.values.attachmentData.split(",").pop() : input.values.attachmentData;
    replacement = await storagePut(`psec-submissions/${input.id}/iterations/${Date.now()}-${safeName}`, Buffer.from(base64 || "", "base64"), input.values.attachmentMimeType || "application/octet-stream");
  }
  const next = {
    memberName: input.values.memberName.trim(),
    memberId: input.values.memberId.trim(),
    discipline: input.values.discipline,
    title: input.values.title.trim(),
    theoreticalBasis: input.values.theoreticalBasis?.trim() || null,
    historicalBackground: input.values.historicalBackground?.trim() || null,
    hypothesis: input.values.hypothesis?.trim() || null,
    procedure: input.values.procedure?.trim() || null,
    materials: input.values.materials?.trim() || null,
    expectedOutput: input.values.expectedOutput || null,
    attachmentName: replacement ? (input.values.attachmentName || current.attachmentName) : current.attachmentName,
    attachmentKey: replacement?.key || current.attachmentKey,
    attachmentUrl: replacement?.url || current.attachmentUrl,
    status: current.status,
    publishedDiscipline: current.publishedDiscipline,
    publishedCategory: current.publishedCategory,
    rejectionComment: current.rejectionComment,
    updatedAt: now,
  } as const;
  await db.update(submissions).set(next).where(eq(submissions.id, input.id));
  await db.insert(submissionHistory).values({
    submissionId: input.id,
    action: "edited",
    editor: input.editor,
    note: input.note || "Admin edit appended to iteration history",
    snapshotJson: JSON.stringify({ before: submissionSnapshot(current), after: submissionSnapshot(next) }),
    createdAt: now,
  });
  return { id: input.id };
}

export async function approveAndArchiveSubmission(input: { id: number; editor: string; discipline: string; category: string }) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select().from(submissions).where(eq(submissions.id, input.id)).limit(1))[0];
  if (!current) throw new Error("Submission not found");
  if (current.status !== "pending") throw new Error("Submission has already been reviewed");
  const now = new Date();
  const experimentResult = await db.insert(experiments).values({
    slug: `submission-${current.id}`,
    discipline: input.discipline,
    title: current.title,
    category: input.category,
    theoreticalBasis: current.theoreticalBasis || "Member-submitted idea; theoretical basis not yet recorded.",
    historicalBackground: current.historicalBackground || `Submitted by ${current.memberName} (${current.memberId}).`,
    hypothesis: current.hypothesis,
    procedure: current.procedure,
    author: `${current.memberName} · ${current.memberId}`,
    status: "archived",
    createdAt: now,
    updatedAt: now,
  });
  const experimentId = Number(experimentResult[0].insertId);
  await db.update(attachments).set({ experimentId, visibility: "public" }).where(eq(attachments.submissionId, current.id));
  await db.update(submissions).set({ status: "approved", publishedDiscipline: input.discipline, publishedCategory: input.category, reviewedAt: now, reviewedBy: input.editor, updatedAt: now }).where(eq(submissions.id, input.id));
  await db.insert(submissionHistory).values({
    submissionId: input.id,
    action: "approved",
    editor: input.editor,
    note: `Approved and archived to ${input.discipline} / ${input.category}`,
    snapshotJson: JSON.stringify({ before: submissionSnapshot(current), after: { ...submissionSnapshot(current), status: "approved", publishedDiscipline: input.discipline, publishedCategory: input.category } }),
    createdAt: now,
  });
  return { id: input.id };
}

export async function rejectSubmission(input: { id: number; editor: string; comment: string }) {
  const db = await getDb();
  if (!db) return null;
  const current = (await db.select().from(submissions).where(eq(submissions.id, input.id)).limit(1))[0];
  if (!current) throw new Error("Submission not found");
  if (current.status !== "pending") throw new Error("Submission has already been reviewed");
  const now = new Date();
  await db.update(submissions).set({ status: "rejected", rejectionComment: input.comment.trim(), reviewedAt: now, reviewedBy: input.editor, updatedAt: now }).where(eq(submissions.id, input.id));
  await db.insert(submissionHistory).values({
    submissionId: input.id,
    action: "rejected",
    editor: input.editor,
    note: input.comment.trim(),
    snapshotJson: JSON.stringify({ before: submissionSnapshot(current), after: { ...submissionSnapshot(current), status: "rejected", rejectionComment: input.comment.trim() } }),
    createdAt: now,
  });
  return { id: input.id };
}
