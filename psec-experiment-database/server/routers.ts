import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveEvidenceSubmission,
  createEvidenceSubmission,
  listCompletedExperiments,
  listExecutionRecords,
  listExperimentAttachments,
  listPendingEvidenceSubmissions,
  rejectEvidenceSubmission,
  uploadExperimentAttachments,
  type AttachmentInput,
} from "./db";
import {
  appendResultAsOwner,
  approveRecord,
  asRecordInput,
  createProjectRecord,
  deleteRecordAsAdmin,
  getEvidencePack,
  getPublicRecordBySlug,
  getRecordHistory,
  listMyRecords,
  listPendingRecords,
  listPublicRecordTimeline,
  listPublicRecords,
  listRecentPublishedRecords,
  rejectRecord,
  updateRecordAsAdmin,
  type ProjectSubmissionInput,
} from "./recordStore";
import {
  adminProcedure,
  assertAdminLoginAllowed,
  clearAdminSession,
  isAdminPasswordCorrect,
  isAdminSession,
  recordAdminLoginAttempt,
  setAdminSession,
} from "./admin";
import { requestEmailCode, verifyEmailCode } from "./emailAuth";
import { sdk } from "./_core/sdk";
import { deleteRecordAsOwner } from "./recordStore";
import { PROJECT_CATEGORIES } from "../shared/recordCategories";
import { LEGAL_VERSIONS } from "../shared/legal";

const optionalText = z.string().max(20_000).optional();
const allowedAttachmentTypes = new Set([
  "",
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
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 32 * 1024 * 1024;

/** Return the decoded size without allocating a Buffer for untrusted input. */
function decodedUploadBytes(value: string): number | null {
  const comma = value.indexOf(",");
  const payload = (comma >= 0 ? value.slice(comma + 1) : value).replace(/\s/g, "");
  if (!payload) return 0;
  if (payload.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) {
    return null;
  }
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor(payload.length * 3 / 4) - padding;
}

const uploadFileSchema = z
  .object({
    fileName: z.string().trim().min(1).max(240),
    data: z.string().max(17_000_000),
    mimeType: z.string().max(160),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .max(MAX_ATTACHMENT_BYTES),
    kind: z.enum(["photo", "data", "report", "protocol", "other"]),
  })
  .superRefine((value, ctx) => {
    if (!allowedAttachmentTypes.has(value.mimeType))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mimeType"],
        message: "This file type is not supported",
      });
    const decodedBytes = decodedUploadBytes(value.data);
    if (decodedBytes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: "The uploaded file data is invalid",
      });
    } else if (decodedBytes > MAX_ATTACHMENT_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: "Each uploaded file must be 8 MB or smaller",
      });
    }
  });
const uploadFilesSchema = z
  .array(uploadFileSchema)
  .max(8)
  .superRefine((files, ctx) => {
    if (
      files.reduce(
        (total, file) => total + (decodedUploadBytes(file.data) ?? file.sizeBytes),
        0,
      ) > MAX_TOTAL_UPLOAD_BYTES
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Combined uploads must be 32 MB or smaller",
      });
  });

const EVIDENCE_RATE_WINDOW_MS = 15 * 60 * 1000;
const EVIDENCE_RATE_LIMIT = 5;
const evidenceAttempts = new Map<
  string,
  { count: number; windowStartedAt: number }
>();

function evidenceRequestKey(req: {
  ip?: string;
  socket?: { remoteAddress?: string | undefined };
}) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function assertEvidenceRateLimit(req: {
  ip?: string;
  socket?: { remoteAddress?: string | undefined };
}) {
  const key = evidenceRequestKey(req);
  const now = Date.now();
  const current = evidenceAttempts.get(key);

  if (!current || now - current.windowStartedAt >= EVIDENCE_RATE_WINDOW_MS) {
    evidenceAttempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  if (current.count >= EVIDENCE_RATE_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many evidence submissions. Please try again later.",
    });
  }

  current.count += 1;
}

const submissionFields = z.object({
  memberName: z.string().trim().max(160).default(""),
  memberId: z.string().trim().max(80).optional().default(""),
  discipline: z.string().trim().max(80).optional().default("Social Psychology"),
  lifecycle: z
    .enum(["idea", "design", "in_progress", "completed"])
    .optional()
    .default("idea"),
  title: z
    .string()
    .trim()
    .min(1, "Experiment / Idea Title is required")
    .max(240),
  abstract: z.string().trim().max(600).default(""),
  theoreticalBasis: optionalText,
  historicalBackground: optionalText,
  hypothesis: optionalText,
  procedure: optionalText,
  materials: optionalText,
  expectedOutput: z.string().max(120).optional(),
  attachments: uploadFilesSchema.optional(),
});
const legalConsentSchema = z.object({
  privacyVersion: z.literal(LEGAL_VERSIONS.privacy),
  termsVersion: z.literal(LEGAL_VERSIONS.terms),
  researchSafetyVersion: z.literal(LEGAL_VERSIONS.researchSafety),
  contentRightsVersion: z.literal(LEGAL_VERSIONS.contentRights),
});

const submissionSchema = submissionFields
  .extend({ legalConsent: legalConsentSchema })
  .superRefine((value, ctx) => {
    if (!value.memberName.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memberName"],
        message: "Submitter Name is required",
      });
    if (!value.abstract.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["abstract"],
        message: "One-sentence summary is required",
      });
  });
const reviewValuesSchema = submissionFields.superRefine((value, ctx) => {
  if (!value.memberName.trim())
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["memberName"],
      message: "Submitter Name is required",
    });
  if (!value.abstract.trim())
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["abstract"],
      message: "One-sentence summary is required",
    });
});

function asProjectInput(
  input: z.infer<typeof submissionFields>
): ProjectSubmissionInput {
  return asRecordInput(input);
}
const adminActor = { name: "PSEC admin", role: "admin" as const };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    requestCode: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(({ ctx, input }) =>
        requestEmailCode({ email: input.email, ip: ctx.req.ip || "unknown" })
      ),
    verifyCode: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email().max(320),
          code: z.string().regex(/^\d{6}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await verifyEmailCode(input);
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: ONE_YEAR_MS,
        });
        return { user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  experiments: router({
    list: publicProcedure
      .input(
        z
          .object({
            discipline: z.string().optional(),
            recordKind: z.enum(["reference", "project"]).optional(),
            lifecycle: z
              .enum(["idea", "design", "in_progress", "completed"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => listPublicRecords(input)),
    completed: publicProcedure.query(() => listCompletedExperiments()),
    attachments: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(({ input }) => listExperimentAttachments(input.slug)),
    executionRecords: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(({ input }) => listExecutionRecords(input.slug)),
  }),
  records: router({
    list: publicProcedure
      .input(
        z
          .object({
            discipline: z.string().optional(),
            recordKind: z.enum(["reference", "project"]).optional(),
            lifecycle: z
              .enum(["idea", "design", "in_progress", "completed"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => listPublicRecords(input)),
    get: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(async ({ input }) => {
        const record = await getPublicRecordBySlug(input.slug);
        if (!record)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Record not found",
          });
        return record;
      }),
    timeline: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(async ({ input }) => {
        const timeline = await listPublicRecordTimeline(input.slug);
        if (!timeline)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Record not found",
          });
        return timeline;
      }),
    evidence: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(async ({ input }) => {
        const evidence = await getEvidencePack(input.slug);
        if (!evidence)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Record not found",
          });
        return evidence;
      }),
    mine: protectedProcedure.query(({ ctx }) => listMyRecords(ctx.user.openId)),
    create: protectedProcedure
      .input(submissionSchema)
      .mutation(({ ctx, input }) =>
        createProjectRecord(asProjectInput(input), {
          name: ctx.user.name || input.memberName,
          role: "member",
          openId: ctx.user.openId,
        })
      ),
    appendResult: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          results: z.string().max(20_000).default(""),
          limitations: z.string().max(20_000).optional(),
          nextQuestion: z.string().max(20_000).optional(),
          ethicsNotes: z.string().max(20_000).optional(),
          summary: z.string().trim().min(3).max(240),
          attachments: uploadFilesSchema.optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        appendResultAsOwner({
          ...input,
          attachments: input.attachments as AttachmentInput[] | undefined,
          ownerOpenId: ctx.user.openId,
          actor: {
            name: ctx.user.name || "PSEC member",
            role: "member",
            openId: ctx.user.openId,
          },
        })
      ),
    deleteOwn: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          confirmTitle: z.string().trim().min(1).max(240),
        })
      )
      .mutation(({ ctx, input }) =>
        deleteRecordAsOwner({
          ...input,
          ownerOpenId: ctx.user.openId,
          actor: {
            name: ctx.user.name || "PSEC member",
            role: "member",
            openId: ctx.user.openId,
          },
        })
      ),
  }),
  submissions: router({
    latest: publicProcedure.query(() => listRecentPublishedRecords()),
    create: protectedProcedure
      .input(submissionSchema)
      .mutation(({ ctx, input }) =>
        createProjectRecord(asProjectInput(input), {
          name: ctx.user.name || input.memberName,
          role: "member",
          openId: ctx.user.openId,
        })
      ),
    evidence: protectedProcedure
      .input(
        z.object({
          submitterName: z.string().trim().min(1).max(160),
          recordId: z.number().int().positive(),
          observationNotes: z.string().max(20_000).optional(),
          files: uploadFilesSchema.optional(),
          legalConsent: legalConsentSchema,
        })
      )
      .mutation(({ ctx, input }) => {
        assertEvidenceRateLimit(ctx.req);
        return createEvidenceSubmission({
          ...input,
          ownerOpenId: ctx.user.openId,
          files: input.files as AttachmentInput[] | undefined,
        });
      }),
  }),
  admin: router({
    status: publicProcedure.query(({ ctx }) => ({
      authenticated: isAdminSession(ctx.req),
    })),
    login: publicProcedure
      .input(z.object({ password: z.string().max(200) }))
      .mutation(({ ctx, input }) => {
        assertAdminLoginAllowed(ctx.req);
        const valid = isAdminPasswordCorrect(input.password);
        recordAdminLoginAttempt(ctx.req, valid);
        if (!valid) return { success: false as const };
        setAdminSession(ctx.res, ctx.req);
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSession(ctx.res, ctx.req);
      return { success: true as const };
    }),
    pending: adminProcedure
      .input(
        z
          .object({
            discipline: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional()
      )
      .query(({ input }) =>
        listPendingRecords({
          discipline: input?.discipline,
          from: input?.from
            ? new Date(`${input.from}T00:00:00`).getTime()
            : undefined,
          to: input?.to
            ? new Date(`${input.to}T23:59:59.999`).getTime()
            : undefined,
        })
      ),
    pendingEvidence: adminProcedure.query(() =>
      listPendingEvidenceSubmissions()
    ),
    history: adminProcedure
      .input(z.object({ submissionId: z.number().int().positive() }))
      .query(({ input }) => getRecordHistory(input.submissionId)),
    edit: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          values: reviewValuesSchema,
          note: z.string().optional(),
        })
      )
      .mutation(({ input }) =>
        updateRecordAsAdmin({
          id: input.id,
          actor: adminActor,
          values: asProjectInput(input.values),
          note: input.note,
        })
      ),
    approve: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          discipline: z.string().optional(),
          category: z.enum(PROJECT_CATEGORIES),
          publicationReviewConfirmed: z.literal(true),
        })
      )
      .mutation(({ input }) =>
        approveRecord({
          id: input.id,
          actor: adminActor,
          discipline: input.discipline,
          category: input.category,
        })
      ),
    reject: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          comment: z.string().trim().min(1),
        })
      )
      .mutation(({ input }) =>
        rejectRecord({
          id: input.id,
          actor: adminActor,
          comment: input.comment,
        })
      ),
    approveEvidence: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) =>
        approveEvidenceSubmission({ id: input.id, editor: "PSEC admin" })
      ),
    rejectEvidence: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          comment: z.string().trim().min(1),
        })
      )
      .mutation(({ input }) =>
        rejectEvidenceSubmission({
          id: input.id,
          editor: "PSEC admin",
          comment: input.comment,
        })
      ),
    deleteExperiment: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          confirmTitle: z.string().trim().min(1),
        })
      )
      .mutation(({ input }) =>
        deleteRecordAsAdmin(input.id, input.confirmTitle)
      ),
    uploadExperimentAttachments: adminProcedure
      .input(
        z.object({
          experimentId: z.number().int().positive(),
          files: uploadFilesSchema.min(1),
        })
      )
      .mutation(({ input }) =>
        uploadExperimentAttachments({
          experimentId: input.experimentId,
          files: input.files as AttachmentInput[],
          uploader: "PSEC admin",
        })
      ),
  }),
});

export type AppRouter = typeof appRouter;
