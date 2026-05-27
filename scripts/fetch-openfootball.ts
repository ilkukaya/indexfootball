/**
 * Fetch raw OpenFootball data by shallow-cloning the referenced country repos
 * into data/raw/openfootball/<repo>.
 *
 * Idempotent for local dev: an existing checkout is updated (or skipped) rather
 * than re-cloned. CI starts from a clean tree, so it always clones fresh.
 * Set REFETCH=1 to force a clean re-clone locally.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { OPENFOOTBALL_ORG, repos } from "./lib/sources.ts";

const RAW_DIR = join(process.cwd(), "data", "raw", "openfootball");
const force = process.env.REFETCH === "1";

function git(args: string[], cwd?: string): void {
  execFileSync("git", args, { stdio: "inherit", cwd });
}

function fetchRepo(repo: string): void {
  const dest = join(RAW_DIR, repo);
  const url = `${OPENFOOTBALL_ORG}/${repo}.git`;

  if (existsSync(join(dest, ".git"))) {
    if (force) {
      console.log(`↻ re-fetching ${repo} (REFETCH=1)`);
      rmSync(dest, { recursive: true, force: true });
    } else {
      console.log(`✓ ${repo} already present, updating`);
      try {
        git(["-C", dest, "pull", "--ff-only", "--depth=1"]);
      } catch {
        console.warn(`  (pull failed, keeping existing ${repo} checkout)`);
      }
      return;
    }
  }

  console.log(`⬇ cloning ${url}`);
  git(["clone", "--depth=1", url, dest]);
}

function main(): void {
  mkdirSync(RAW_DIR, { recursive: true });
  const list = repos();
  console.log(`Fetching ${list.length} OpenFootball repo(s): ${list.join(", ")}`);
  for (const repo of list) fetchRepo(repo);
  console.log("Done.");
}

main();
