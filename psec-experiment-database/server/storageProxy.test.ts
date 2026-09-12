import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import { isAdminSession } from "./admin";
import { registerStorageProxy } from "./_core/storageProxy";
import { storageGetSignedUrl } from "./storage";

vi.mock("./admin", () => ({ isAdminSession: vi.fn() }));
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn() }));
vi.mock("./db", () => ({ getDb: vi.fn() }));

function requestStorage(key: string) {
  let handler: (request: Request, response: Response) => Promise<void>;
  registerStorageProxy({ get: (_path: string, route: typeof handler) => { handler = route; } } as Express);
  const response = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
    set: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
  };
  return handler!({ params: { "0": key } } as unknown as Request, response as unknown as Response)
    .then(() => response);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAdminSession).mockReturnValue(false);
});

describe("private storage redirect", () => {
  it("does not sign an unauthorized attachment", async () => {
    const response = await requestStorage("psec-submissions/private.pdf");
    expect(response.status).toHaveBeenCalledWith(404);
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
  });

  it("signs an authorized attachment and disables caching of the redirect", async () => {
    vi.mocked(isAdminSession).mockReturnValue(true);
    vi.mocked(storageGetSignedUrl).mockResolvedValue("https://example.oss-ap-southeast-5.aliyuncs.com/file?signature=short");
    const response = await requestStorage("psec-submissions/private.pdf");
    expect(storageGetSignedUrl).toHaveBeenCalledWith("psec-submissions/private.pdf", undefined);
    expect(response.set).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(response.redirect).toHaveBeenCalledWith(307, expect.stringContaining("signature=short"));
  });

  it("does not redirect when signing fails", async () => {
    vi.mocked(isAdminSession).mockReturnValue(true);
    vi.mocked(storageGetSignedUrl).mockRejectedValue(new Error("OSS unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await requestStorage("psec-submissions/private.pdf");
      expect(response.status).toHaveBeenCalledWith(502);
      expect(response.redirect).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
