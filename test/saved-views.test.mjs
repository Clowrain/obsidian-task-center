// Unit tests for US-109c/g/h: saved filter views.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function compilePure() {
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "src/saved-views.ts",
      "--bundle=false",
      "--format=esm",
      "--platform=node",
      "--outdir=test/.compiled",
      "--loader:.ts=ts",
    ],
    { cwd: process.cwd(), stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("esbuild compile failed:\n" + result.stderr);
  }
}

compilePure();
const {
  applySavedViewFilters,
  restoreBuiltinSavedViewById,
  restoreBuiltinSavedViews,
  ensureBuiltinSavedViews,
  clearSavedViewFilters,
  createSavedView,
  moveSavedViewById,
  parseSavedViewDsl,
  hasSavedViewFilters,
  normalizeSavedTaskView,
  normalizeSavedViewStatus,
  sameSavedViewContent,
  stringifySavedViewDsl,
  suggestSavedViewName,
  updateSavedViewById,
  upsertSavedView,
} = await import("../test/.compiled/saved-views.js");

test("US-109c: createSavedView persists the current filter conditions, not a task snapshot", () => {
  const view = createSavedView(
    " Alpha Focus ",
    {
      search: "  report  ",
      tag: " #alpha,#beta ",
      time: { scheduled: " week ", deadline: " overdue ", completed: "" },
      status: "todo",
      view: { type: "week" },
      summary: [{ type: "count" }, { type: "sum", field: " actual ", format: " duration " }],
    },
    () => "sv-fixed",
  );

  assert.deepEqual(view, {
    id: "sv-fixed",
    name: "Alpha Focus",
    builtin: false,
    hidden: false,
    search: "report",
    tag: "#alpha,#beta",
    time: { scheduled: "week", deadline: "overdue" },
    status: ["todo"],
    view: { type: "week" },
    summary: [{ type: "count" }, { type: "sum", field: "actual", format: "duration" }],
  });
});

test("US-109c1: upsertSavedView appends a new preset when the id is new", () => {
  const oldView = createSavedView("Alpha", { search: "old", tag: "#old", time: { scheduled: "today" }, status: "todo" }, () => "sv-old");
  const otherView = createSavedView("Gamma", { search: "", tag: "#gamma", time: {}, status: "all" }, () => "sv-gamma");
  const newView = createSavedView("Alpha", { search: "new", tag: "#alpha", time: { completed: "week" }, status: "done" }, () => "sv-new");

  const views = upsertSavedView([oldView, otherView], newView);

  assert.deepEqual(views.map((view) => view.id), ["sv-old", "sv-gamma", "sv-new"]);
  assert.equal(views[2].name, "Alpha");
  assert.equal(views[2].search, "new");
  assert.equal(views[2].tag, "#alpha");
  assert.deepEqual(views[2].time, { completed: "week" });
  assert.deepEqual(views[2].status, ["done"]);
});

test("US-109c: updateSavedViewById preserves the selected saved-view identity", () => {
  const alpha = createSavedView("Alpha", { search: "old", tag: "#old", time: { scheduled: "today" }, status: "todo" }, () => "sv-alpha");
  const gamma = createSavedView("Gamma", { search: "", tag: "#gamma", time: {}, status: "all" }, () => "sv-gamma");
  const updated = createSavedView("Alpha", { search: "new", tag: "#alpha", time: { deadline: "overdue" }, status: "done" }, () => "sv-alpha");

  const views = updateSavedViewById([alpha, gamma], updated);

  assert.deepEqual(views.map((view) => view.id), ["sv-alpha", "sv-gamma"]);
  assert.deepEqual(views.map((view) => view.name), ["Alpha", "Gamma"]);
  assert.equal(views[0].search, "new");
  assert.equal(views[0].tag, "#alpha");
  assert.deepEqual(views[0].time, { deadline: "overdue" });
  assert.deepEqual(views[0].status, ["done"]);
});

test("US-109g: applySavedViewFilters restores saved filters", () => {
  const filters = applySavedViewFilters({
    id: "sv-q1",
    name: "Q1",
    search: "brief",
    tag: "#alpha,#beta",
    time: {
      scheduled: "2026-04-01..2026-04-30",
      deadline: "overdue",
    },
    status: "todo",
    view: { type: "month" },
    summary: [{ type: "count" }],
  });

  assert.deepEqual(filters, {
    savedViewId: "sv-q1",
    search: "brief",
    tag: "#alpha,#beta",
    time: {
      scheduled: "2026-04-01..2026-04-30",
      deadline: "overdue",
    },
    status: ["todo"],
    view: { type: "month" },
    summary: [{ type: "count" }],
  });
});

test("US-109t: normalizeSavedTaskView upgrades legacy saved filters into DSL-ready query presets", () => {
  const normalized = normalizeSavedTaskView({
    id: "sv-legacy",
    name: " Legacy ",
    search: " task ",
    tag: " #alpha ",
    time: { scheduled: " today " },
    status: "todo",
  });

  assert.deepEqual(normalized, {
    id: "sv-legacy",
    name: "Legacy",
    builtin: false,
    hidden: false,
    search: "task",
    tag: "#alpha",
    time: { scheduled: "today" },
    status: ["todo"],
    view: { type: "list" },
    summary: [],
  });
});

test("US-109g: clearSavedViewFilters returns the current-view empty filter state", () => {
  assert.deepEqual(clearSavedViewFilters(), {
    savedViewId: null,
    search: "",
    tag: "",
    time: {},
    status: "all",
    view: { type: "list" },
    summary: [],
  });
});

test("US-109l: restoreBuiltinSavedViewById resets one preset tab to its seeded DSL", () => {
  const restored = restoreBuiltinSavedViewById([
    {
      id: "preset-week",
      name: "我的周视图",
      builtin: true,
      hidden: true,
      search: "focus",
      tag: "#work",
      time: { scheduled: "today" },
      status: ["done"],
      view: { type: "list" },
      summary: [{ type: "count" }],
    },
    {
      id: "sv-custom",
      name: "自定义",
      search: "docs",
      tag: "#alpha",
      time: {},
      status: ["todo"],
      view: { type: "list" },
      summary: [],
    },
  ], "preset-week", { week: "本周" });

  assert.deepEqual(restored, [
    {
      id: "preset-week",
      name: "本周",
      builtin: true,
      hidden: false,
      search: "",
      tag: "",
      time: {},
      status: ["todo"],
      view: { type: "week" },
      summary: [],
    },
    {
      id: "sv-custom",
      name: "自定义",
      builtin: false,
      hidden: false,
      search: "docs",
      tag: "#alpha",
      time: {},
      status: ["todo"],
      view: { type: "list" },
      summary: [],
    },
  ]);
});

test("US-109l: restoreBuiltinSavedViews recreates the full preset tab set without touching custom tabs", () => {
  const restored = restoreBuiltinSavedViews([
    {
      id: "preset-today",
      name: "Today hacked",
      builtin: true,
      hidden: true,
      search: "old",
      tag: "#work",
      time: {},
      status: ["done"],
      view: { type: "month" },
      summary: [{ type: "count" }],
    },
    {
      id: "sv-custom",
      name: "Deep Work",
      search: "docs",
      tag: "#alpha",
      time: { scheduled: "week" },
      status: ["todo"],
      view: { type: "list" },
      summary: [],
    },
  ], { today: "今日" });

  assert.deepEqual(restored.slice(0, 7).map((view) => view.id), [
    "preset-today",
    "preset-week",
    "preset-month",
    "preset-todo",
    "preset-unscheduled",
    "preset-completed",
    "preset-dropped",
  ]);
  assert.equal(restored[0].name, "今日");
  assert.equal(restored[0].hidden, false);
  assert.deepEqual(restored.at(-1), {
    id: "sv-custom",
    name: "Deep Work",
    builtin: false,
    hidden: false,
    search: "docs",
    tag: "#alpha",
    time: { scheduled: "week" },
    status: ["todo"],
    view: { type: "list" },
    summary: [],
  });
});

test("US-109p2: stringifySavedViewDsl emits JSON for the same preset object", () => {
  const text = stringifySavedViewDsl(createSavedView(
    "Alpha",
    {
      search: "focus",
      tag: "#alpha,#beta",
      time: { scheduled: "week" },
      status: ["todo", "done"],
      view: { type: "month", preset: "today" },
      summary: [{ type: "count" }],
    },
    () => "sv-alpha",
  ));
  const parsed = JSON.parse(text);
  assert.deepEqual(parsed, {
    id: "sv-alpha",
    name: "Alpha",
    filters: {
      search: "focus",
      tags: ["#alpha", "#beta"],
      status: ["todo", "done"],
      time: { scheduled: "week" },
    },
    view: { type: "month", preset: "today" },
    summary: [{ type: "count" }],
  });
});

test("US-109p3: parseSavedViewDsl validates and normalizes JSON DSL", () => {
  const view = parseSavedViewDsl(JSON.stringify({
    name: " Deep Work ",
    filters: {
      search: " docs ",
      tags: ["alpha", "#beta", "alpha"],
      status: ["todo", "done"],
      time: { scheduled: " week " },
    },
    view: { type: "week", preset: " today " },
    summary: [{ type: "sum", field: " actual ", format: " duration " }],
  }), { id: "sv-existing" });

  assert.deepEqual(view, {
    id: "sv-existing",
    name: "Deep Work",
    builtin: false,
    hidden: false,
    search: "docs",
    tag: "#alpha,#beta",
    time: { scheduled: "week" },
    status: ["todo", "done"],
    view: { type: "week", preset: "today" },
    summary: [{ type: "sum", field: "actual", format: "duration" }],
  });
});

test("US-109s: sameSavedViewContent ignores ids and compares the effective query content", () => {
  const left = parseSavedViewDsl(JSON.stringify({
    id: "left",
    name: "Left",
    filters: { tags: ["#alpha"], status: ["todo"] },
    view: { type: "list", preset: "today" },
    summary: [],
  }));
  const right = parseSavedViewDsl(JSON.stringify({
    id: "right",
    name: "Right",
    filters: { tags: ["#alpha"], status: ["todo"] },
    view: { type: "list", preset: "today" },
    summary: [],
  }));
  assert.equal(sameSavedViewContent(left, right), true);
});

test("US-109c: suggestSavedViewName prefers tag, then status, then fallback", () => {
  assert.equal(suggestSavedViewName({ tag: " #alpha,#beta ", status: "all" }, "Saved view"), "alpha,#beta");
  assert.equal(suggestSavedViewName({ tag: "", status: "done" }, "Saved view"), "done");
  assert.equal(suggestSavedViewName({ tag: "", status: ["todo", "dropped"] }, "Saved view"), "todo,dropped");
  assert.equal(suggestSavedViewName({ tag: "", status: "all" }, "Saved view"), "Saved view");
});

test("US-109c: empty filters are not a saveable filter view", () => {
  assert.equal(hasSavedViewFilters({ search: "", tag: "", time: {}, status: "all" }), false);
  assert.equal(hasSavedViewFilters({ search: "alpha", tag: "", time: {}, status: "all" }), true);
  assert.equal(hasSavedViewFilters({ search: "", tag: "#alpha", time: {}, status: "all" }), true);
  assert.equal(hasSavedViewFilters({ search: "", tag: "", time: { scheduled: "week" }, status: "all" }), true);
  assert.equal(hasSavedViewFilters({ search: "", tag: "", time: {}, status: "done" }), true);
  assert.equal(hasSavedViewFilters({ search: "", tag: "", time: {}, status: ["todo", "done"] }), true);
});

test("US-109h: status filters normalize legacy single-select and new multi-select values", () => {
  assert.equal(normalizeSavedViewStatus("all"), "all");
  assert.deepEqual(normalizeSavedViewStatus("todo"), ["todo"]);
  assert.deepEqual(normalizeSavedViewStatus(["todo", "done", "todo"]), ["todo", "done"]);
  assert.equal(normalizeSavedViewStatus([]), "all");
});

test("US-109j/l: ensureBuiltinSavedViews seeds missing built-in query tabs and preserves custom tabs", () => {
  const custom = createSavedView("Deep Work", { search: "docs", tag: "#work", time: {}, status: ["todo"], view: { type: "list" }, summary: [] }, () => "sv-custom");
  const hiddenBuiltin = createSavedView("Today Copy", { search: "", tag: "", time: {}, status: ["todo"], view: { type: "list", preset: "today" }, summary: [] }, () => "preset-today");
  hiddenBuiltin.hidden = true;

  const views = ensureBuiltinSavedViews([custom, hiddenBuiltin], {
    today: "今日",
    week: "本周",
    month: "本月",
    todo: "TODO",
    completed: "已完成",
    dropped: "已放弃",
    unscheduled: "未排期",
  });

  assert.deepEqual(views.slice(0, 7).map((view) => view.id), [
    "preset-today",
    "preset-week",
    "preset-month",
    "preset-todo",
    "preset-unscheduled",
    "preset-completed",
    "preset-dropped",
  ]);
  assert.equal(views[0].builtin, true);
  assert.equal(views[0].hidden, true);
  assert.equal(views[0].name, "Today Copy");
  assert.equal(views.at(-1)?.id, "sv-custom");
});

test("US-109q: moveSavedViewById reorders one tab without rewriting ids", () => {
  const alpha = createSavedView("Alpha", { search: "", tag: "", time: {}, status: "all", view: { type: "list" }, summary: [] }, () => "sv-alpha");
  const beta = createSavedView("Beta", { search: "", tag: "", time: {}, status: "all", view: { type: "list" }, summary: [] }, () => "sv-beta");
  const gamma = createSavedView("Gamma", { search: "", tag: "", time: {}, status: "all", view: { type: "list" }, summary: [] }, () => "sv-gamma");

  assert.deepEqual(moveSavedViewById([alpha, beta, gamma], "sv-beta", -1).map((view) => view.id), ["sv-beta", "sv-alpha", "sv-gamma"]);
  assert.deepEqual(moveSavedViewById([alpha, beta, gamma], "sv-beta", 1).map((view) => view.id), ["sv-alpha", "sv-gamma", "sv-beta"]);
});
