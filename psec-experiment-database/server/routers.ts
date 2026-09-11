import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { approveEvidenceSubmission, createEvidenceSubmission, listCompletedExperiments, listExecutionRecords, listExperimentAttachments, listPendingEvidenceSubmissions, rejectEvidenceSubmission, uploadExperimentAttachments, type AttachmentInput } from "./db";
import { appendResultAsOwner, approveRecord, asRecordInput, createProjectRecord, deleteRecordAsAdmin, getEvidencePack, getPublicRecordBySlug, getRecordHistory, listMyRecords, listPendingRecords, listPublicRecordTimeline, listPublicRecords, listRecentPublishedRecords, rejectRecord, updateRecordAsAdmin, type ProjectSubmissionInput } from "./recordStore";
import { adminProcedure, assertAdminLoginAllowed, clearAdminSession, isAdminPasswordCorrect, isAdminSession, recordAdminLoginAttempt, setAdminSession } from "./admin";

const optionalText = z.string().max(20_000).optional();
const allowedAttachmentTypes = new Set(["", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/csv", "application/json", "application/zip", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png", "image/gif", "image/webp"]);
const uploadFileSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  data: z.string().max(17_000_000),
  mimeType: z.string().max(160),
  sizeBytes: z.number().int().nonnegative().max(8 * 1024 * 1024),
  kind: z.enum(["photo", "data", "report", "protocol", "other"]),
}).superRefine((value, ctx) => {
  if (!allowedAttachmentTypes.has(value.mimeType)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mimeType"], message: "This file type is not supported" });
});
const uploadFilesSchema = z.array(uploadFileSchema).max(8).superRefine((files, ctx) => {
  if (files.reduce((total, file) => total + file.sizeBytes, 0) > 32 * 1024 * 1024) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Combined uploads must be 32 MB or smaller" });
});

const submissionFields = z.object({
  memberName: z.string().trim().max(160).default(""),
  memberId: z.string().trim().max(80).optional().default(""),
  discipline: z.string().trim().max(80).optional().default("Social Psychology"),
  lifecycle: z.enum(["idea", "design", "in_progress", "completed"]).optional().default("idea"),
  title: z.string().trim().min(1, "Experiment / Idea Title is required").max(240),
  abstract: z.string().trim().max(600).default(""),
  theoreticalBasis: optionalText,
  historicalBackground: optionalText,
  hypothesis: optionalText,
  procedure: optionalText,
  materials: optionalText,
  expectedOutput: z.string().max(120).optional(),
  attachments: uploadFilesSchema.optional(),
});
const submissionSchema = submissionFields.superRefine((value, ctx) => {
  if (!value.memberName.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["memberName"], message: "Submitter Name is required" });
  if (!value.abstract.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["abstract"], message: "One-sentence summary is required" });
});
const reviewValuesSchema = submissionSchema;

function asProjectInput(input: z.infer<typeof submissionSchema>): ProjectSubmissionInput {
  return asRecordInput(input);
}
const adminActor = { name: "PSEC admin", role: "admin" as const };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  experiments: router({
    list: publicProcedure.input(z.object({ discipline: z.string().optional(), recordKind: z.enum(["reference", "project"]).optional(), lifecycle: z.enum(["idea", "design", "in_progress", "completed"]).optional() }).optional()).query(({ input }) => listPublicRecords(input)),
    completed: publicProcedure.query(() => listCompletedExperiments()),
    attachments: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(({ input }) => listExperimentAttachments(input.slug)),
    executionRecords: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(({ input }) => listExecutionRecords(input.slug)),
  }),
  records: router({
    list: publicProcedure.input(z.object({ discipline: z.string().optional(), recordKind: z.enum(["reference", "project"]).optional(), lifecycle: z.enum(["idea", "design", "in_progress", "completed"]).optional() }).optional()).query(({ input }) => listPublicRecords(input)),
    get: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(async ({ input }) => {
      const record = await getPublicRecordBySlug(input.slug);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      return record;
    }),
    timeline: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(async ({ input }) => {
      const timeline = await listPublicRecordTimeline(input.slug);
      if (!timeline) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      return timeline;
    }),
    evidence: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(async ({ input }) => {
      const evidence = await getEvidencePack(input.slug);
      if (!evidence) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      return evidence;
    }),
    mine: protectedProcedure.query(({ ctx }) => listMyRecords(ctx.user.openId)),
    create: protectedProcedure.input(submissionSchema).mutation(({ ctx, input }) => createProjectRecord(asProjectInput(input), { name: ctx.user.name || input.memberName, role: "member", openId: ctx.user.openId })),
    appendResult: protectedProcedure.input(z.object({ id: z.number().int().positive(), results: z.string().max(20_000).default(""), limitations: z.string().max(20_000).optional(), nextQuestion: z.string().max(20_000).optional(), ethicsNotes: z.string().max(20_000).optional(), summary: z.string().trim().min(3).max(240), attachments: uploadFilesSchema.optional() })).mutation(({ ctx, input }) => appendResultAsOwner({ ...input, attachments: input.attachments as AttachmentInput[] | undefined, ownerOpenId: ctx.user.openId, actor: { name: ctx.user.name || "PSEC member", role: "member", openId: ctx.user.openId } })),
  }),
  submissions: router({
    latest: publicProcedure.query(() => listRecentPublishedRecords()),
    create: protectedProcedure.input(submissionSchema).mutation(({ ctx, input }) => createProjectRecord(asProjectInput(input), { name: ctx.user.name || input.memberName, role: "member", openId: ctx.user.openId })),
    evidence: publicProcedure.input(z.object({ submitterName: z.string().trim().min(1).max(160), experimentId: z.number().int().positive(), observationNotes: z.string().max(20_000).optional(), files: uploadFilesSchema.optional() })).mutation(({ input }) => createEvidenceSubmission({ ...input, files: input.files as AttachmentInput[] | undefined })),
  }),
  admin: router({
    status: publicProcedure.query(({ ctx }) => ({ authenticated: isAdminSession(ctx.req) })),
    login: publicProcedure.input(z.object({ password: z.string().max(200) })).mutation(({ ctx, input }) => {
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
    pending: adminProcedure.input(z.object({ discipline: z.string().optional(), from: z.string().optional(), to: z.string().optional() }).optional()).query(({ input }) => listPendingRecords({ discipline: input?.discipline, from: input?.from ? new Date(`${input.from}T00:00:00`).getTime() : undefined, to: input?.to ? new Date(`${input.to}T23:59:59.999`).getTime() : undefined })),
    pendingEvidence: adminProcedure.query(() => listPendingEvidenceSubmissions()),
    history: adminProcedure.input(z.object({ submissionId: z.number().int().positive() })).query(({ input }) => getRecordHistory(input.submissionId)),
    edit: adminProcedure.input(z.object({ id: z.number().int().positive(), values: reviewValuesSchema, note: z.string().optional() })).mutation(({ input }) => updateRecordAsAdmin({ id: input.id, actor: adminActor, values: asProjectInput(input.values), note: input.note })),
    approve: adminProcedure.input(z.object({ id: z.number().int().positive(), discipline: z.string().optional() })).mutation(({ input }) => approveRecord({ id: input.id, actor: adminActor, discipline: input.discipline })),
    reject: adminProcedure.input(z.object({ id: z.number().int().positive(), comment: z.string().trim().min(1) })).mutation(({ input }) => rejectRecord({ id: input.id, actor: adminActor, comment: input.comment })),
    approveEvidence: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => approveEvidenceSubmission({ id: input.id, editor: "PSEC admin" })),
    rejectEvidence: adminProcedure.input(z.object({ id: z.number().int().positive(), comment: z.string().trim().min(1) })).mutation(({ input }) => rejectEvidenceSubmission({ id: input.id, editor: "PSEC admin", comment: input.comment })),
    deleteExperiment: adminProcedure.input(z.object({ id: z.number().int().positive(), confirmTitle: z.string().trim().min(1) })).mutation(({ input }) => deleteRecordAsAdmin(input.id, input.confirmTitle)),
    uploadExperimentAttachments: adminProcedure.input(z.object({ experimentId: z.number().int().positive(), files: uploadFilesSchema.min(1) })).mutation(({ input }) => uploadExperimentAttachments({ experimentId: input.experimentId, files: input.files as AttachmentInput[], uploader: "PSEC admin" })),
  }),
});

export type AppRouter = typeof appRouter;
