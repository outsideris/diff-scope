import { describe, expect, it, vi } from "vitest";
import { getLog, logArgs, parseLog } from "./log";
import { GitError } from "./exec";

const { runGit } = vi.hoisted(() => ({ runGit: vi.fn() }));

vi.mock("./exec", async (importOriginal) => {
  const original = await importOriginal<typeof import("./exec")>();
  return { ...original, runGit };
});

const F = "\x1f";
const R = "\x1e";

function record(fields: {
  hash: string;
  short: string;
  parents: string;
  subject: string;
  body?: string;
}): string {
  return (
    [
      fields.hash,
      fields.short,
      fields.parents,
      "Outsider",
      "outsideris@gmail.com",
      "2026-07-11T15:00:00+09:00",
      fields.subject,
      fields.body ?? "",
    ].join(F) + R
  );
}

describe("logArgs", () => {
  it("builds args with a default limit and optional ref", () => {
    expect(logArgs()).toEqual(["log", expect.stringMatching(/^--format=/), "-n", "200"]);
    expect(logArgs({ limit: 50, ref: "feature/x" })).toEqual([
      "log",
      expect.stringMatching(/^--format=/),
      "-n",
      "50",
      "feature/x",
    ]);
  });
});

describe("parseLog", () => {
  it("parses commits with parents, multiline body, and trailing newlines", () => {
    const output =
      record({
        hash: "a".repeat(40),
        short: "aaaaaaa",
        parents: `${"b".repeat(40)} ${"c".repeat(40)}`,
        subject: "Merge feature",
        body: "line one\nline two\n\n",
      }) +
      "\n" +
      record({ hash: "b".repeat(40), short: "bbbbbbb", parents: "", subject: "Initial commit" }) +
      "\n";

    const commits = parseLog(output);

    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      hash: "a".repeat(40),
      shortHash: "aaaaaaa",
      parents: ["b".repeat(40), "c".repeat(40)],
      authorName: "Outsider",
      authorEmail: "outsideris@gmail.com",
      authorDate: "2026-07-11T15:00:00+09:00",
      subject: "Merge feature",
      body: "line one\nline two",
    });
    expect(commits[1]).toMatchObject({ parents: [], subject: "Initial commit", body: "" });
  });

  it("returns an empty list for empty output", () => {
    expect(parseLog("")).toEqual([]);
  });
});

describe("getLog", () => {
  it("returns an empty list when the repository has no commits yet", async () => {
    runGit.mockRejectedValueOnce(
      new GitError(
        "/repo",
        ["log"],
        128,
        "fatal: your current branch 'main' does not have any commits yet\n",
      ),
    );

    await expect(getLog("/repo")).resolves.toEqual([]);
  });

  it("rethrows other git errors", async () => {
    runGit.mockRejectedValueOnce(
      new GitError("/repo", ["log"], 128, "fatal: not a git repository\n"),
    );

    await expect(getLog("/repo")).rejects.toBeInstanceOf(GitError);
  });
});
