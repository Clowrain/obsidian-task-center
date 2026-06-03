// Unit tests for dependency-health pure checks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function compileDepHealth() {
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "src/dep-health.ts",
      "--bundle",
      "--format=esm",
      "--platform=node",
      "--outfile=test/.compiled/dep-health.bundle.js",
      "--loader:.ts=ts",
      "--alias:obsidian=./test/obsidian-stub.mjs",
    ],
    { cwd: process.cwd(), stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("esbuild compile failed:\n" + result.stderr);
  }
}

compileDepHealth();
const { checkTaskFormatCompanion } = await import("../test/.compiled/dep-health.bundle.js");

function appWith({ manifests = {}, plugins = {} } = {}) {
  return { plugins: { manifests, plugins } };
}

test("US-701f: task-format companion is healthy when Tasks is enabled", () => {
  const app = appWith({ plugins: { "obsidian-tasks-plugin": {} } });
  assert.equal(checkTaskFormatCompanion(app), null);
});

test("US-701f: task-format companion is healthy when Dataview is enabled", () => {
  const app = appWith({ plugins: { dataview: {} } });
  assert.equal(checkTaskFormatCompanion(app), null);
});

test("US-701e: installed but disabled companion reports disabled", () => {
  const app = appWith({ manifests: { dataview: {} } });
  assert.equal(checkTaskFormatCompanion(app), "task-format-companion-disabled");
});

test("US-701d: no Tasks or Dataview companion reports missing", () => {
  assert.equal(checkTaskFormatCompanion(appWith()), "task-format-companion-missing");
});
