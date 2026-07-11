import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryStore } from "./repositories";

let dir: string;
let store: RepositoryStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "diff-scope-store-"));
  store = new RepositoryStore(join(dir, "nested", "repositories.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("RepositoryStore", () => {
  it("returns an empty list when the file does not exist", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("adds entries, persists them, and reads them back", async () => {
    await store.add({ path: "/repos/a", name: "a" });
    const afterSecond = await store.add({ path: "/repos/b", name: "b" });

    expect(afterSecond).toEqual([
      { path: "/repos/a", name: "a" },
      { path: "/repos/b", name: "b" },
    ]);
    await expect(
      new RepositoryStore(join(dir, "nested", "repositories.json")).list(),
    ).resolves.toEqual(afterSecond);
  });

  it("does not duplicate an already-registered path", async () => {
    await store.add({ path: "/repos/a", name: "a" });
    const result = await store.add({ path: "/repos/a", name: "renamed" });

    expect(result).toEqual([{ path: "/repos/a", name: "a" }]);
  });

  it("removes an entry by path", async () => {
    await store.add({ path: "/repos/a", name: "a" });
    await store.add({ path: "/repos/b", name: "b" });

    await expect(store.remove("/repos/a")).resolves.toEqual([{ path: "/repos/b", name: "b" }]);
    await expect(store.list()).resolves.toEqual([{ path: "/repos/b", name: "b" }]);
  });

  it("treats a corrupted file as an empty list", async () => {
    const filePath = join(dir, "corrupted.json");
    await writeFile(filePath, "not json{");
    const corrupted = new RepositoryStore(filePath);

    await expect(corrupted.list()).resolves.toEqual([]);
    await corrupted.add({ path: "/repos/a", name: "a" });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      repositories: [{ path: "/repos/a", name: "a" }],
    });
  });
});
