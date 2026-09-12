import nodemailer from "nodemailer";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title and content are required." });
  if (title.length > TITLE_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  if (content.length > CONTENT_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  return { title, content };
}

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPassword || !ENV.smtpFrom || !ENV.ownerEmail) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email service is not configured." });
  }

  try {
    await nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpPort === 465,
      auth: { user: ENV.smtpUser, pass: ENV.smtpPassword },
    }).sendMail({ from: ENV.smtpFrom, to: ENV.ownerEmail, subject: title, text: content });
    return true;
  } catch (error) {
    console.warn("[Notification] Email delivery failed:", error);
    return false;
  }
}
