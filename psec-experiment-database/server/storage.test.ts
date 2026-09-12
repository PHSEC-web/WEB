import { beforeEach, describe, expect, it, vi } from "vitest";
import OSS from "ali-oss";
import { storageGetSignedUrl, storagePut } from "./storage";

const { put, signatureUrlV4 } = vi.hoisted(() => ({
  put: vi.fn(),
  signatureUrlV4: vi.fn(),
}));

vi.mock("ali-oss", () => ({
  default: vi.fn().mockImplementation(() => ({ put, signatureUrlV4 })),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    ossRegion: "oss-ap-southeast-5",
    ossBucket: "private-bucket",
    ossAccessKeyId: "test-id",
    ossAccessKeySecret: "test-secret",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  put.mockResolvedValue({});
  signatureUrlV4.mockResolvedValue("https://private-bucket.oss-ap-southeast-5.aliyuncs.com/signed");
});

describe("OSS storage", () => {
  it("uploads with the content type and returns an app-owned path", async () => {
    const result = await storagePut("/psec-records/7/report.pdf", Buffer.from("PDF"), "application/pdf");
    expect(OSS).toHaveBeenCalledWith(expect.objectContaining({
      region: "oss-ap-southeast-5",
      bucket: "private-bucket",
      secure: true,
      authorizationV4: true,
    }));
    expect(result.key).toMatch(/^psec-records\/7\/report_[a-f0-9]{8}\.pdf$/);
    expect(put).toHaveBeenCalledWith(result.key, Buffer.from("PDF"), { mime: "application/pdf" });
    expect(result.url).toBe(`/storage/${result.key}`);
  });

  it("propagates upload errors without returning a usable path", async () => {
    put.mockRejectedValueOnce(new Error("OSS upload failed"));
    await expect(storagePut("psec-records/7/report.pdf", "PDF")).rejects.toThrow("OSS upload failed");
  });

  it("creates a 60-second GET link using the original database key", async () => {
    await expect(storageGetSignedUrl("/psec-records/7/old.pdf")).resolves.toContain("https://");
    expect(signatureUrlV4).toHaveBeenCalledWith("GET", 60, undefined, "psec-records/7/old.pdf");
  });
});
