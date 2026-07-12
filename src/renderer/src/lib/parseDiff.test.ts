import { describe, expect, it } from "vitest";
import { countHunkLines, parseUnifiedDiff } from "./parseDiff";

const MODIFIED = `diff --git a/src/app.ts b/src/app.ts
index e69de29..d95f3ad 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
`;

const NEW_FILE = `diff --git a/notes.md b/notes.md
new file mode 100644
index 0000000..d95f3ad
--- /dev/null
+++ b/notes.md
@@ -0,0 +1,2 @@
+hello
+world
`;

const DELETED = `diff --git a/old.txt b/old.txt
deleted file mode 100644
index d95f3ad..0000000
--- a/old.txt
+++ /dev/null
@@ -1 +0,0 @@
-bye
`;

const RENAMED = `diff --git a/src/before.ts b/src/after.ts
similarity index 90%
rename from src/before.ts
rename to src/after.ts
index e69de29..d95f3ad 100644
--- a/src/before.ts
+++ b/src/after.ts
@@ -1 +1 @@
-export const x = 1;
+export const x = 2;
`;

const BINARY_NEW = `diff --git a/logo.png b/logo.png
new file mode 100644
index 0000000..d95f3ad
Binary files /dev/null and b/logo.png differ
`;

const MODE_ONLY = `diff --git a/script.sh b/script.sh
old mode 100644
new mode 100755
`;

describe("parseUnifiedDiff", () => {
  it("splits a multi-file diff into sections with their hunks", () => {
    const files = parseUnifiedDiff(MODIFIED + NEW_FILE + DELETED);

    expect(files).toHaveLength(3);
    expect(files[0]).toMatchObject({
      oldPath: "src/app.ts",
      newPath: "src/app.ts",
      isNew: false,
      isDeleted: false,
      isRename: false,
      isBinary: false,
    });
    expect(files[0].hunks).toMatch(/^@@ -1,3 \+1,4 @@\n/);
    expect(files[0].hunks).toContain("+const c = 4;");
    expect(files[0].hunks.endsWith("\n")).toBe(false);
  });

  it("marks new and deleted files with null on the missing side", () => {
    const files = parseUnifiedDiff(NEW_FILE + DELETED);

    expect(files[0]).toMatchObject({ oldPath: null, newPath: "notes.md", isNew: true });
    expect(files[1]).toMatchObject({ oldPath: "old.txt", newPath: null, isDeleted: true });
  });

  it("parses renames with both paths from rename headers", () => {
    const [file] = parseUnifiedDiff(RENAMED);

    expect(file).toMatchObject({
      oldPath: "src/before.ts",
      newPath: "src/after.ts",
      isRename: true,
    });
    expect(file.hunks).toContain("+export const x = 2;");
  });

  it("detects binary files and takes paths from the diff --git line", () => {
    const [file] = parseUnifiedDiff(BINARY_NEW);

    expect(file).toMatchObject({
      oldPath: null,
      newPath: "logo.png",
      isBinary: true,
      isNew: true,
      hunks: "",
    });
  });

  it("handles mode-only changes without hunks", () => {
    const [file] = parseUnifiedDiff(MODE_ONLY);

    expect(file.hunks).toBe("");
    expect(file.oldPath).toBe("script.sh");
    expect(file.newPath).toBe("script.sh");
  });

  it("unquotes paths that git escapes", () => {
    const quoted = `diff --git "a/sp ace/\\"q\\".ts" "b/sp ace/\\"q\\".ts"
index e69de29..d95f3ad 100644
--- "a/sp ace/\\"q\\".ts"
+++ "b/sp ace/\\"q\\".ts"
@@ -1 +1 @@
-1
+2
`;

    const [file] = parseUnifiedDiff(quoted);

    expect(file.oldPath).toBe('sp ace/"q".ts');
    expect(file.newPath).toBe('sp ace/"q".ts');
  });

  it("returns an empty list for an empty diff", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
  });
});

describe("countHunkLines", () => {
  it("counts added and deleted lines from hunk text", () => {
    const [file] = parseUnifiedDiff(MODIFIED);

    expect(countHunkLines(file.hunks)).toEqual({ added: 2, deleted: 1 });
    expect(countHunkLines("")).toEqual({ added: 0, deleted: 0 });
  });
});
