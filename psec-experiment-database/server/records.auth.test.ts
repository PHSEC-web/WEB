import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("records ownership routes", () => {
  it("rejects anonymous record creation before touching the database", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.records.create({
      memberName: "Anonymous",
      title: "Unauthorized record",
      abstract: "This must not be stored.",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects anonymous access to the member record workspace", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.records.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
