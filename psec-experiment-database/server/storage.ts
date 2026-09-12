import OSS from "ali-oss";
import { ENV } from "./_core/env";

const SIGNED_URL_LIFETIME_SECONDS = 60;

function getClient() {
  const { ossRegion, ossBucket, ossAccessKeyId, ossAccessKeySecret } = ENV;
  if (!ossRegion || !ossBucket || !ossAccessKeyId || !ossAccessKeySecret) {
    throw new Error(
      "Storage config missing: set OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET",
    );
  }

  return new OSS({
    region: ossRegion,
    bucket: ossBucket,
    accessKeyId: ossAccessKeyId,
    accessKeySecret: ossAccessKeySecret,
    secure: true,
    authorizationV4: true,
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = Buffer.from(data);
  await getClient().put(key, body, { mime: contentType });
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return getClient().signatureUrlV4(
    "GET",
    SIGNED_URL_LIFETIME_SECONDS,
    undefined,
    normalizeKey(relKey),
  );
}
