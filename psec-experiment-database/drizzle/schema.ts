import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing school email authentication. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const emailLoginCodes = mysqlTable(
  "emailLoginCodes",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    codeHash: varchar("codeHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    attempts: int("attempts").notNull().default(0),
    requestedIp: varchar("requestedIp", { length: 64 }),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    emailCreatedIdx: index("email_login_codes_email_created_idx").on(
      table.email,
      table.createdAt
    ),
  })
);

export const experiments = mysqlTable("experiments", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  discipline: varchar("discipline", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  theoreticalBasis: text("theoreticalBasis").notNull(),
  historicalBackground: text("historicalBackground").notNull(),
  hypothesis: text("hypothesis"),
  procedure: text("procedure"),
  author: varchar("author", { length: 160 }),
  status: varchar("status", { length: 40 }).default("archived").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  memberName: varchar("memberName", { length: 160 }).notNull(),
  memberId: varchar("memberId", { length: 80 }).notNull(),
  discipline: varchar("discipline", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  theoreticalBasis: text("theoreticalBasis"),
  historicalBackground: text("historicalBackground"),
  hypothesis: text("hypothesis"),
  procedure: text("procedure"),
  materials: text("materials"),
  expectedOutput: varchar("expectedOutput", { length: 120 }),
  attachmentName: varchar("attachmentName", { length: 240 }),
  attachmentKey: varchar("attachmentKey", { length: 320 }),
  attachmentUrl: varchar("attachmentUrl", { length: 420 }),
  status: varchar("status", { length: 40 }).default("pending").notNull(),
  publishedDiscipline: varchar("publishedDiscipline", { length: 80 }),
  publishedCategory: varchar("publishedCategory", { length: 100 }),
  rejectionComment: text("rejectionComment"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: varchar("reviewedBy", { length: 160 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const submissionHistory = mysqlTable("submissionHistory", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  editor: varchar("editor", { length: 160 }).notNull(),
  note: text("note"),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const records = mysqlTable(
  "records",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    recordKind: mysqlEnum("recordKind", ["reference", "project"])
      .notNull()
      .default("project"),
    discipline: varchar("discipline", { length: 80 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    status: mysqlEnum("status", [
      "pending",
      "needs_revision",
      "published",
      "rejected",
      "hidden",
    ])
      .notNull()
      .default("pending"),
    lifecycle: mysqlEnum("lifecycle", [
      "idea",
      "design",
      "in_progress",
      "completed",
    ]),
    visibility: mysqlEnum("visibility", ["public", "members"])
      .notNull()
      .default("public"),
    title: varchar("title", { length: 240 }).notNull(),
    abstract: text("abstract"),
    theoreticalBasis: text("theoreticalBasis"),
    historicalBackground: text("historicalBackground"),
    hypothesis: text("hypothesis"),
    procedure: text("procedure"),
    materials: text("materials"),
    expectedOutput: varchar("expectedOutput", { length: 120 }),
    results: text("results"),
    limitations: text("limitations"),
    nextQuestion: text("nextQuestion"),
    ethicsReviewed: int("ethicsReviewed").notNull().default(0),
    ethicsNotes: text("ethicsNotes"),
    authorName: varchar("authorName", { length: 160 }),
    authorMemberId: varchar("authorMemberId", { length: 80 }),
    ownerOpenId: varchar("ownerOpenId", { length: 64 }),
    forkOfRecordId: int("forkOfRecordId"),
    reviewComment: text("reviewComment"),
    requiredChanges: json("requiredChanges").$type<string[]>(),
    reviewedBy: varchar("reviewedBy", { length: 160 }),
    reviewedAt: timestamp("reviewedAt"),
    publishedAt: timestamp("publishedAt"),
    revisionCount: int("revisionCount").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deletedAt"),
  },
  table => ({
    disciplineCategoryStatusIdx: index(
      "records_discipline_category_status_idx"
    ).on(table.discipline, table.category, table.status),
    kindStatusPublishedIdx: index("records_kind_status_published_idx").on(
      table.recordKind,
      table.status,
      table.publishedAt
    ),
    ownerIdx: index("records_owner_idx").on(table.ownerOpenId),
    forkIdx: index("records_fork_idx").on(table.forkOfRecordId),
  })
);

export const recordRevisions = mysqlTable(
  "recordRevisions",
  {
    id: int("id").autoincrement().primaryKey(),
    recordId: int("recordId").notNull(),
    revisionNo: int("revisionNo").notNull(),
    action: varchar("action", { length: 60 }).notNull(),
    summary: varchar("summary", { length: 240 }).notNull(),
    changedFields: json("changedFields").$type<string[]>().notNull(),
    snapshotJson: text("snapshotJson").notNull(),
    editorOpenId: varchar("editorOpenId", { length: 64 }),
    editorName: varchar("editorName", { length: 160 }),
    editorRole: mysqlEnum("editorRole", ["member", "admin", "system"])
      .notNull()
      .default("system"),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    recordRevisionUnique: uniqueIndex(
      "record_revisions_record_revision_unique"
    ).on(table.recordId, table.revisionNo),
    recordCreatedIdx: index("record_revisions_record_created_idx").on(
      table.recordId,
      table.createdAt
    ),
  })
);

export const attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    recordId: int("recordId"),
    experimentId: int("experimentId"),
    submissionId: int("submissionId"),
    evidenceSubmissionId: int("evidenceSubmissionId"),
    executionRecordId: int("executionRecordId"),
    revisionId: int("revisionId"),
    fileName: varchar("fileName", { length: 240 }).notNull(),
    storageKey: varchar("storageKey", { length: 320 }).notNull(),
    mimeType: varchar("mimeType", { length: 160 }).notNull(),
    sizeBytes: int("sizeBytes"),
    kind: mysqlEnum("kind", ["report", "protocol", "data", "photo", "other"])
      .notNull()
      .default("other"),
    visibility: mysqlEnum("visibility", ["public", "members"])
      .notNull()
      .default("members"),
    uploadedByOpenId: varchar("uploadedByOpenId", { length: 64 }),
    uploadedByName: varchar("uploadedByName", { length: 160 }),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    recordCreatedIdx: index("attachments_record_created_idx").on(
      table.recordId,
      table.createdAt
    ),
    experimentCreatedIdx: index("attachments_experiment_created_idx").on(
      table.experimentId,
      table.createdAt
    ),
    submissionCreatedIdx: index("attachments_submission_created_idx").on(
      table.submissionId,
      table.createdAt
    ),
    evidenceSubmissionCreatedIdx: index(
      "attachments_evidence_submission_created_idx"
    ).on(table.evidenceSubmissionId, table.createdAt),
    executionRecordCreatedIdx: index(
      "attachments_execution_record_created_idx"
    ).on(table.executionRecordId, table.createdAt),
  })
);

/** Evidence supplements are intentionally separate from ordinary experiment proposals. */
export const evidenceSubmissions = mysqlTable("evidenceSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  submitterName: varchar("submitterName", { length: 160 }).notNull(),
  experimentId: int("experimentId"),
  recordId: int("recordId"),
  observationNotes: text("observationNotes"),
  status: varchar("status", { length: 40 }).default("pending").notNull(),
  rejectionComment: text("rejectionComment"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: varchar("reviewedBy", { length: 160 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const executionRecords = mysqlTable(
  "executionRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    experimentId: int("experimentId"),
    recordId: int("recordId"),
    evidenceSubmissionId: int("evidenceSubmissionId"),
    submitterName: varchar("submitterName", { length: 160 }),
    observationNotes: text("observationNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    experimentCreatedIdx: index("execution_records_experiment_created_idx").on(
      table.experimentId,
      table.createdAt
    ),
    recordCreatedIdx: index("execution_records_record_created_idx").on(
      table.recordId,
      table.createdAt
    ),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Experiment = typeof experiments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionHistory = typeof submissionHistory.$inferSelect;
export type Record = typeof records.$inferSelect;
export type RecordRevision = typeof recordRevisions.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type EvidenceSubmission = typeof evidenceSubmissions.$inferSelect;
export type ExecutionRecord = typeof executionRecords.$inferSelect;
