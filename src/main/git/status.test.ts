import { describe, expect, it } from "vitest";
import { parseStatusPorcelainV2 } from "./status";

const OID = "4a5c8e2f0b1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f";
const EMPTY_HASH = "0000000000000000000000000000000000000000";
const BLOB_A = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
const BLOB_B = "d95f3ad14dee633a758d2e331151e950dd13e4ed";

function records(...items: string[]): string {
  return items.map((item) => `${item}\0`).join("");
}

describe("parseStatusPorcelainV2", () => {
  it("parses branch headers including ahead/behind", () => {
    const output = records(
      `# branch.oid ${OID}`,
      "# branch.head main",
      "# branch.upstream origin/main",
      "# branch.ab +2 -1",
    );

    const status = parseStatusPorcelainV2(output);

    expect(status).toMatchObject({
      branch: "main",
      detached: false,
      oid: OID,
      upstream: "origin/main",
      ahead: 2,
      behind: 1,
      entries: [],
    });
  });

  it("marks detached HEAD and keeps branch null", () => {
    const output = records(`# branch.oid ${OID}`, "# branch.head (detached)");

    const status = parseStatusPorcelainV2(output);

    expect(status.branch).toBeNull();
    expect(status.detached).toBe(true);
  });

  it("treats an unborn branch (initial commit) oid as null", () => {
    const output = records("# branch.oid (initial)", "# branch.head main");

    expect(parseStatusPorcelainV2(output).oid).toBeNull();
  });

  it("splits ordinary changed entries into staged and unstaged codes", () => {
    const output = records(
      `1 .M N... 100644 100644 100644 ${BLOB_A} ${BLOB_A} src/app with space.ts`,
      `1 A. N... 000000 100644 100644 ${EMPTY_HASH} ${BLOB_B} docs/new.md`,
      `1 MD N... 100644 100644 100644 ${BLOB_A} ${BLOB_A} src/gone.ts`,
    );

    const { entries } = parseStatusPorcelainV2(output);

    expect(entries).toEqual([
      {
        path: "src/app with space.ts",
        origPath: null,
        staged: ".",
        unstaged: "M",
        untracked: false,
        unmerged: false,
      },
      {
        path: "docs/new.md",
        origPath: null,
        staged: "A",
        unstaged: ".",
        untracked: false,
        unmerged: false,
      },
      {
        path: "src/gone.ts",
        origPath: null,
        staged: "M",
        unstaged: "D",
        untracked: false,
        unmerged: false,
      },
    ]);
  });

  it("parses rename entries with the original path from the following token", () => {
    const output = records(
      `2 R. N... 100644 100644 100644 ${BLOB_A} ${BLOB_A} R100 src/renamed.ts`,
      "src/original.ts",
    );

    const { entries } = parseStatusPorcelainV2(output);

    expect(entries).toEqual([
      {
        path: "src/renamed.ts",
        origPath: "src/original.ts",
        staged: "R",
        unstaged: ".",
        untracked: false,
        unmerged: false,
      },
    ]);
  });

  it("parses unmerged and untracked entries", () => {
    const output = records(
      `u UU N... 100644 100644 100644 100644 ${BLOB_A} ${BLOB_A} ${BLOB_B} conflicted.ts`,
      "? untracked file.txt",
    );

    const { entries } = parseStatusPorcelainV2(output);

    expect(entries).toEqual([
      {
        path: "conflicted.ts",
        origPath: null,
        staged: "U",
        unstaged: "U",
        untracked: false,
        unmerged: true,
      },
      {
        path: "untracked file.txt",
        origPath: null,
        staged: ".",
        unstaged: "?",
        untracked: true,
        unmerged: false,
      },
    ]);
  });

  it("ignores ignored-file records and returns no entries for a clean tree", () => {
    expect(parseStatusPorcelainV2(records("! build/out.js")).entries).toEqual([]);
    expect(parseStatusPorcelainV2("").entries).toEqual([]);
  });
});
