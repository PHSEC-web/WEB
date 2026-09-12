import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { appRouter } from "./routers";
import { assertOwnerCanDeleteRecord } from "./recordStore";
import {
  lifecycleForProjectCategory,
  projectCategoryForLifecycle,
} from "../shared/recordCategories";

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: vi.fn(),
}));

const record = {
  id: 7,
  title: "Owned project",
  ownerOpenId: "member-1",
  recordKind: "project" as const,
  revisionCount: 1,
  deletedAt: null,
};

function caller(openId: string | null) {
  return appRouter.createCaller({
    user: openId
      ? {
          id: 1,
          openId,
          email: "member@shphschool.com",
          name: "Member",
          loginMethod: "school-email",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

function mockDatabase(current: typeof record) {
  const updates: unknown[] = [];
  const revisions: unknown[] = [];
  let selections = 0;
  const tx = {
    select: () => {
      selections++;
      return {
        from: () => ({
          where: () => ({
            limit: () => ({ for: async () => [current] }),
            orderBy: () => ({ limit: async () => [{ revisionNo: 1 }] }),
          }),
        }),
      };
    },
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          updates.push(values);
        },
      }),
    }),
    insert: () => ({
      values: async (values: unknown) => {
        revisions.push(values);
      },
    }),
  };
  vi.mocked(getDb).mockResolvedValue({
    transaction: async (fn: (tx: typeof tx) => unknown) => fn(tx),
  } as never);
  return { updates, revisions, selections: () => selections };
}

beforeEach(() => vi.clearAllMocks());

describe("member project management", () => {
  it("lets a school-email member open My Records without an admin role", async () => {
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({ where: () => ({ orderBy: async () => [] }) }),
      }),
    } as never);
    await expect(caller("member-1").records.mine()).resolves.toEqual([]);
  });

  it("lets a school-email member submit a research idea without an admin role", async () => {
    const inserts: unknown[] = [];
    let selections = 0;
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () =>
              selections++ === 0
                ? []
                : [
                    {
                      ...record,
                      slug: "idea",
                      lifecycle: "idea",
                      status: "pending",
                      category: "Idea Pool",
                    },
                  ],
          }),
        }),
      }),
      insert: () => ({
        values: async (values: unknown) => {
          inserts.push(values);
          return [{ insertId: 7 }];
        },
      }),
    } as never);
    await expect(
      caller("member-1").records.create({
        memberName: "Member",
        title: "Research idea",
        abstract: "A question worth investigating.",
      })
    ).resolves.toMatchObject({ id: 7 });
    expect(inserts[0]).toMatchObject({
      ownerOpenId: "member-1",
      category: "Idea Pool",
      status: "pending",
    });
  });

  it("does not let anonymous visitors delete projects", async () => {
    await expect(
      caller(null).records.deleteOwn({ id: 7, confirmTitle: record.title })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("does not let members delete another member's project", async () => {
    const { updates } = mockDatabase(record);
    await expect(
      caller("member-2").records.deleteOwn({
        id: 7,
        confirmTitle: record.title,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
  });

  it("requires the exact title even for the owner", async () => {
    const { updates } = mockDatabase(record);
    await expect(
      caller("member-1").records.deleteOwn({
        id: 7,
        confirmTitle: "Wrong title",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updates).toHaveLength(0);
  });

  it("soft deletes the owner's project and attachments with an audit revision", async () => {
    const { updates, revisions } = mockDatabase(record);
    await expect(
      caller("member-1").records.deleteOwn({
        id: 7,
        confirmTitle: record.title,
      })
    ).resolves.toMatchObject({ id: 7, title: record.title });
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({
      deletedAt: expect.any(Date),
      revisionCount: 2,
    });
    expect(updates[1]).toMatchObject({ deletedAt: expect.any(Date) });
    expect(revisions[0]).toMatchObject({
      action: "deleted_by_owner",
      editorOpenId: "member-1",
    });
  });

  it("cannot delete a reference record even if its owner matches", () => {
    expect(() =>
      assertOwnerCanDeleteRecord(
        { ...record, recordKind: "reference" },
        "member-1",
        record.title
      )
    ).toThrowError(/Only the project owner/);
  });
});

describe("project categories", () => {
  it("maps every research stage to the correct archive folder", () => {
    expect(projectCategoryForLifecycle("idea")).toBe("Idea Pool");
    expect(projectCategoryForLifecycle("design")).toBe(
      "Formal Experimental Designs"
    );
    expect(projectCategoryForLifecycle("in_progress")).toBe(
      "Formal Experimental Designs"
    );
    expect(projectCategoryForLifecycle("completed")).toBe(
      "Completed Experimental Projects"
    );
  });

  it("keeps in-progress projects when published to the formal design folder", () => {
    expect(
      lifecycleForProjectCategory("Formal Experimental Designs", "in_progress")
    ).toBe("in_progress");
    expect(
      lifecycleForProjectCategory("Completed Experimental Projects", "idea")
    ).toBe("completed");
  });
});
