import type { Express, Request } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { attachments, records } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { isAdminSession } from "../admin";
import { getDb } from "../db";
import { storageGetSignedUrl } from "../storage";

async function canReadRecordAttachment(key: string, req: Request) {
  const db = await getDb();
  if (!db) return false;
  const row = (
    await db
      .select({ attachment: attachments, record: records })
      .from(attachments)
      .innerJoin(records, eq(attachments.recordId, records.id))
      .where(
        and(
          eq(attachments.storageKey, key),
          isNull(attachments.deletedAt),
          isNull(records.deletedAt)
        )
      )
      .limit(1)
  )[0];
  if (!row) return false;
  const admin = isAdminSession(req);
  let userOpenId: string | null = null;
  try {
    userOpenId = (await sdk.authenticateRequest(req))?.openId || null;
  } catch {
    userOpenId = null;
  }
  if (admin || (userOpenId && userOpenId === row.record.ownerOpenId))
    return true;
  return (
    row.record.status === "published" &&
    row.record.visibility === "public" &&
    row.attachment.visibility === "public"
  );
}

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (key.startsWith("psec-records/")) {
      if (!(await canReadRecordAttachment(key, req))) {
        res.status(404).send("Not found");
        return;
      }
    } else {
      const isPublishedExperimentMedia = key.startsWith("psec-experiments/");
      const isPrivateEvidence = key.startsWith("psec-evidence/");
      if (isPrivateEvidence) {
        const db = await getDb();
        const evidence = db
          ? (
              await db
                .select({
                  recordId: attachments.recordId,
                  visibility: attachments.visibility,
                })
                .from(attachments)
                .where(
                  and(
                    eq(attachments.storageKey, key),
                    isNull(attachments.deletedAt)
                  )
                )
                .limit(1)
            )[0]
          : null;
        if (
          !evidence ||
          (evidence.recordId
            ? (evidence.visibility !== "public" && !isAdminSession(req)) ||
              !(await canReadRecordAttachment(key, req))
            : !isAdminSession(req) && evidence.visibility !== "public")
        ) {
          res.status(404).send("Not found");
          return;
        }
      } else if (
        !isPublishedExperimentMedia &&
        (!key.startsWith("psec-submissions/") || !isAdminSession(req))
      ) {
        res.status(404).send("Not found");
        return;
      }
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
