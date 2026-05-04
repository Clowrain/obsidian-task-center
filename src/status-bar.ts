// Status bar — shows the active todo count.
//
// Subscribes to `cache.on("changed")` only — never to vault events or to
// `metadataCache.on("resolved")` (#3 large-vault event-flood regression / #4: those flooded the main
// thread on large vaults and froze Obsidian even when the board was never
// opened). The cache populates passively from `metadataCache.changed`
// single-file callbacks; the status-bar count grows as files are indexed.
//
// `refresh()` reads `cache.flatten()` synchronously — no full vault scan,
// no await. The cache may not be fully primed (no one opened the board yet)
// and that's fine: the count grows as files get indexed (ARCHITECTURE.md §3.3).

import { TaskCache } from "./cache";
import { todayISO } from "./dates";
import { deriveEffectiveTasks } from "./task-tree";
import type { EffectiveTask } from "./task-tree";
import { t as tr } from "./i18n";

const REFRESH_DEBOUNCE_MS = 500;

export interface StatusBarOptions {
  /** Called when the status bar text is clicked. Typically opens the board. */
  onClick: () => void;
}

export class StatusBar {
  private timer: number | null = null;
  private readonly cacheUnsub: () => void;

  constructor(
    private readonly el: HTMLElement,
    private readonly cache: TaskCache,
    opts: StatusBarOptions,
  ) {
    this.el.addClass("task-center-status");
    this.el.addEventListener("click", opts.onClick);
    this.cacheUnsub = this.cache.on("changed", () => this.scheduleRefresh());
  }

  // US-106: persistent status bar shows `📋 N today · ⚠ M overdue`,
  // click opens the board. Always-on so the user knows their day's
  // load without opening the tab.
  // see USER_STORIES.md
  /** Force an immediate render. */
  refresh(): void {
    const all = this.cache.flatten();
    const today = todayISO();
    // Derive effective tasks so counts reflect terminal-inherited status:
    // children under done/dropped parents are correctly excluded from
    // "todo" counts, and inherited scheduled/deadline dates participate.
    const effective = deriveEffectiveTasks(all);
    // §7.3: single-pass to avoid 3 intermediate array allocations
    let todayCount = 0;
    let overdue = 0;
    for (const t of effective) {
      if (!activeTodo(t)) continue;
      if (t.effectiveScheduled === today) todayCount++;
      if (t.effectiveDeadline && t.effectiveDeadline < today) overdue++;
    }
    // task #43: route status text + tooltip through tr() so a Chinese
    // Obsidian session shows Chinese strings instead of the EN literals.
    const parts = [tr("status.today", { n: todayCount })];
    if (overdue > 0) parts.push(tr("status.overdue", { n: overdue }));
    this.el.setText(parts.join(" · "));
    this.el.title = tr("status.openTooltip");
  }

  /**
   * Flush any pending debounce + render now. Used by `plugin.__forFlush()`
   * so e2e tests get a deterministic post-event read.
   */
  flush(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
      this.refresh();
    }
  }

  dispose(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.cacheUnsub();
  }

  private scheduleRefresh(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }
}

// task #41: mirror the board's US-107 filter so a `- [ ] ⏳ today` line
// (a blank-title task) is dropped from today/overdue counts. Without this
// the status bar's number disagreed with the visible card count.
// Uses effectiveStatus (post terminal-inheritance) instead of raw status
// so children under done/dropped parents are excluded from active counts.
function activeTodo(t: EffectiveTask): boolean {
  return (
    t.effectiveStatus === "todo" &&
    t.title.trim() !== ""
  );
}
