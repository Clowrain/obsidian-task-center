/**
 * US-701d/e/f: Dependency health check — task-format companion plugin
 *
 * Task Center supports Tasks emoji and Dataview inline-field task metadata.
 * The user should have at least one companion plugin enabled (Tasks or
 * Dataview) so the same metadata renders or queries elsewhere in the vault.
 *
 * Detection logic (expected from implementation):
 *   - neither Tasks nor Dataview manifest present → "task-format-companion-missing"
 *   - any manifest present but neither plugin loaded → "task-format-companion-disabled"
 *   - either plugin loaded → healthy (no warning)
 *
 * Stable DOM attributes:
 *   data-dep-warning="task-format-companion-missing"
 *   data-dep-warning="task-format-companion-disabled"
 */
import { browser, expect, $ } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";

const VAULT = "test/e2e/vaults/simple";

async function forFlush() {
  await browser.executeObsidian(async ({ app }) => {
    // @ts-expect-error — runtime plugin
    await (app as any).plugins.plugins["task-center"].__forFlush();
  });
}

/** Remove any fake companion manifest/plugin injected by tests. */
async function cleanupFakeCompanions() {
  await browser.executeObsidian(async ({ app }) => {
    const p = (app as any).plugins;
    delete p.manifests["obsidian-tasks-plugin"];
    delete p.plugins["obsidian-tasks-plugin"];
    delete p.manifests["dataview"];
    delete p.plugins["dataview"];
  });
}

/** Simulate Dataview installed but disabled: manifest exists, plugin not loaded. */
async function fakeInstallDataviewDisabled() {
  await browser.executeObsidian(async ({ app }) => {
    const p = (app as any).plugins;
    p.manifests["dataview"] = {
      id: "dataview",
      name: "Dataview",
      version: "999.0.0",
      minAppVersion: "1.0.0",
    };
    delete p.plugins["dataview"];
  });
}

/** Simulate Dataview enabled: both manifest and loaded plugin present. */
async function fakeEnableDataview() {
  await browser.executeObsidian(async ({ app }) => {
    const p = (app as any).plugins;
    p.manifests["dataview"] = {
      id: "dataview",
      name: "Dataview",
      version: "999.0.0",
      minAppVersion: "1.0.0",
    };
    p.plugins["dataview"] = { _enabled: true };
  });
}

describe("US-701d/e/f dependency health check (task-format companion)", function () {
  beforeEach(async function () {
    await obsidianPage.resetVault(VAULT);
  });

  afterEach(async function () {
    await cleanupFakeCompanions();
  });

  it("US-701d: shows companion-missing warning when neither Tasks nor Dataview is installed", async function () {
    await cleanupFakeCompanions();

    await browser.executeObsidianCommand("task-center:open");
    await forFlush();

    await expect($(".task-center-view")).toExist();
    await expect($('[data-dep-warning="task-format-companion-missing"]')).toExist();
  });

  it("US-701e: shows companion-disabled warning when a companion is installed but disabled", async function () {
    await fakeInstallDataviewDisabled();

    await browser.executeObsidianCommand("task-center:open");
    await forFlush();

    await expect($(".task-center-view")).toExist();
    await expect($('[data-dep-warning="task-format-companion-disabled"]')).toExist();
  });

  it("US-701f: no companion warning when Dataview is enabled", async function () {
    await fakeEnableDataview();

    await browser.executeObsidianCommand("task-center:open");
    await forFlush();

    await expect($(".task-center-view")).toExist();
    await expect($('[data-dep-warning="task-format-companion-missing"]')).not.toExist();
    await expect($('[data-dep-warning="task-format-companion-disabled"]')).not.toExist();
  });
});
