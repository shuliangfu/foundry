#!/usr/bin/env node
/**
 * Node.js test runner — runs each test file individually in the main process.
 *
 * Why: Node 22's test runner uses IPC (structuredClone) to pass results from
 * child processes to the parent. When a test file writes to stdout (e.g. via
 * logger.info / console.log), the IPC parser corrupts and throws
 * "Unable to deserialize cloned data due to invalid or unsupported version."
 *
 * Running one file at a time via `node --import tsx --test <file>` executes
 * in the main process — no child process, no IPC, no serialization bug.
 * This is unnecessary on Node 23+ (--test-isolation=none exists) but required
 * for Node 22 (engines.node >= 22).
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const testDir = resolve("tests");
const files = readdirSync(testDir)
  .filter((f) => f.endsWith(".test.ts"))
  .sort()
  .map((f) => join(testDir, f));

console.log(`Found ${files.length} test files\n`);

let failed = 0;
for (const file of files) {
  const rel = file.replace(process.cwd() + "/", "");
  console.log(`▶ ${rel}`);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "--test-force-exit", file],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.status !== 0) {
    failed++;
    console.error(`✗ FAILED: ${rel}\n`);
  } else {
    console.log(`✓ ${rel}\n`);
  }
}

console.log("=".repeat(60));
if (failed > 0) {
  console.error(`✗ ${failed}/${files.length} test file(s) failed`);
  process.exit(1);
}
console.log(`✓ All ${files.length} test files passed`);
