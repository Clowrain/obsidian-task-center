import type {
  QueryViewType,
  SavedTaskView,
  SavedViewConfig,
  SavedViewStatus,
  SavedViewSummaryMetric,
  SavedViewTimeFilters,
  TaskStatus,
} from "./types";

const KNOWN_STATUS_VALUES: TaskStatus[] = ["todo", "done", "dropped", "in_progress", "cancelled", "custom"];
const BUILTIN_QUERY_TABS = ["today", "week", "month", "completed", "unscheduled"] as const;
type BuiltinQueryTab = typeof BUILTIN_QUERY_TABS[number];

export const BUILTIN_SAVED_VIEW_IDS: Record<BuiltinQueryTab, string> = {
  today: "preset-today",
  week: "preset-week",
  month: "preset-month",
  completed: "preset-completed",
  unscheduled: "preset-unscheduled",
};

const DEFAULT_BUILTIN_LABELS: Record<BuiltinQueryTab, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  completed: "Completed",
  unscheduled: "Unscheduled",
};

export interface SavedViewFilters {
  search: string;
  tag: string;
  time: SavedViewTimeFilters;
  status: SavedViewStatus;
  view?: SavedViewConfig;
  summary?: SavedViewSummaryMetric[];
}

export interface AppliedSavedViewFilters extends SavedViewFilters {
  savedViewId: string | null;
}

export interface QueryPresetDsl {
  id?: string;
  name?: string;
  builtin?: boolean;
  hidden?: boolean;
  filters?: {
    search?: string;
    tags?: string[] | string;
    status?: SavedViewStatus;
    time?: SavedViewTimeFilters;
  };
  view?: SavedViewConfig;
  summary?: SavedViewSummaryMetric[];
}

export function builtinSavedViewId(tab: BuiltinQueryTab): string {
  return BUILTIN_SAVED_VIEW_IDS[tab];
}

export function builtinSavedViewIdForLegacyTab(tab: string | null | undefined): string | null {
  if (!tab || !(tab in BUILTIN_SAVED_VIEW_IDS)) return null;
  return BUILTIN_SAVED_VIEW_IDS[tab as BuiltinQueryTab];
}

export function isBuiltinSavedViewId(id: string): boolean {
  return Object.values(BUILTIN_SAVED_VIEW_IDS).includes(id);
}

export function builtinSavedViewKind(id: string): BuiltinQueryTab | null {
  return BUILTIN_QUERY_TABS.find((tab) => BUILTIN_SAVED_VIEW_IDS[tab] === id) ?? null;
}

export function ensureBuiltinSavedViews(
  views: readonly SavedTaskView[],
  labels: Partial<Record<BuiltinQueryTab, string>> = {},
): SavedTaskView[] {
  const existing = new Map(views.map((view) => [view.id, normalizeSavedTaskView(view)]));
  const out: SavedTaskView[] = [];
  for (const tab of BUILTIN_QUERY_TABS) {
    const seeded = seededBuiltinSavedView(tab, labels[tab] ?? DEFAULT_BUILTIN_LABELS[tab]);
    const current = existing.get(seeded.id);
    out.push(normalizeSavedTaskView(current ? { ...current, builtin: true } : seeded));
    existing.delete(seeded.id);
  }
  for (const view of views) {
    if (isBuiltinSavedViewId(view.id)) continue;
    out.push(normalizeSavedTaskView(view));
  }
  return out;
}

export function restoreBuiltinSavedViewById(
  views: readonly SavedTaskView[],
  id: string,
  labels: Partial<Record<BuiltinQueryTab, string>> = {},
): SavedTaskView[] {
  const kind = builtinSavedViewKind(id);
  if (!kind) return [...views];
  const seeded = seededBuiltinSavedView(kind, labels[kind] ?? DEFAULT_BUILTIN_LABELS[kind]);
  const index = views.findIndex((view) => view.id === id);
  if (index === -1) {
    return ensureBuiltinSavedViews([...views, seeded], labels);
  }
  return views.map((view, currentIndex) => (currentIndex === index ? seeded : normalizeSavedTaskView(view)));
}

export function restoreBuiltinSavedViews(
  views: readonly SavedTaskView[],
  labels: Partial<Record<BuiltinQueryTab, string>> = {},
): SavedTaskView[] {
  const customViews = views.filter((view) => !isBuiltinSavedViewId(view.id));
  return ensureBuiltinSavedViews(customViews, labels);
}

export function createSavedView(
  name: string,
  filters: SavedViewFilters,
  makeId: () => string = defaultSavedViewId,
): SavedTaskView {
  return normalizeSavedTaskView({
    id: makeId(),
    name: name.trim(),
    search: filters.search.trim(),
    tag: filters.tag.trim(),
    time: normalizeTimeFilters(filters.time),
    status: normalizeSavedViewStatus(filters.status),
    view: normalizeSavedViewConfig(filters.view),
    summary: normalizeSavedViewSummary(filters.summary),
  });
}

export function upsertSavedView(views: readonly SavedTaskView[], view: SavedTaskView): SavedTaskView[] {
  const normalized = normalizeSavedTaskView(view);
  const existingIndex = views.findIndex((existing) => existing.id === normalized.id);
  if (existingIndex === -1) return [...views, normalized];
  return views.map((existing) => (existing.id === normalized.id ? normalized : existing));
}

export function updateSavedViewById(views: readonly SavedTaskView[], view: SavedTaskView): SavedTaskView[] {
  const normalized = normalizeSavedTaskView(view);
  return views.map((existing) => (existing.id === normalized.id ? normalized : existing));
}

export function applySavedViewFilters(view: SavedTaskView): AppliedSavedViewFilters {
  const normalized = normalizeSavedTaskView(view);
  return {
    savedViewId: normalized.id,
    search: normalized.search,
    tag: normalized.tag,
    time: normalizeTimeFilters(normalized.time),
    status: normalizeSavedViewStatus(normalized.status),
    view: normalizeSavedViewConfig(normalized.view),
    summary: normalizeSavedViewSummary(normalized.summary),
  };
}

export function clearSavedViewFilters(): AppliedSavedViewFilters {
  return {
    savedViewId: null,
    search: "",
    tag: "",
    time: {},
    status: "all",
    view: { type: "list" },
    summary: [],
  };
}

export function hasSavedViewFilters(filters: SavedViewFilters): boolean {
  return !!(
    filters.search.trim()
    || filters.tag.trim()
    || Object.values(normalizeTimeFilters(filters.time)).some(Boolean)
    || normalizeSavedViewStatus(filters.status) !== "all"
  );
}

export function suggestSavedViewName(filters: Pick<SavedViewFilters, "tag" | "status">, fallback: string): string {
  if (filters.tag.trim()) return filters.tag.trim().replace(/^#/, "");
  const status = normalizeSavedViewStatus(filters.status);
  if (status !== "all") return status.join(",");
  return fallback;
}

export function normalizeSavedViewStatus(status: SavedViewStatus | null | undefined): "all" | TaskStatus[] {
  if (!status || status === "all") return "all";
  const raw = Array.isArray(status) ? status : [status];
  const seen = new Set<TaskStatus>();
  const out: TaskStatus[] = [];
  for (const value of raw) {
    if (!KNOWN_STATUS_VALUES.includes(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.length > 0 ? out : "all";
}

export function normalizeSavedTaskView(view: SavedTaskView): SavedTaskView {
  return {
    ...view,
    builtin: !!view.builtin,
    hidden: !!view.hidden,
    name: view.name.trim(),
    search: view.search.trim(),
    tag: view.tag.trim(),
    time: normalizeTimeFilters(view.time),
    status: normalizeSavedViewStatus(view.status),
    view: normalizeSavedViewConfig(view.view),
    summary: normalizeSavedViewSummary(view.summary),
  };
}

export function savedViewToDsl(view: SavedTaskView): QueryPresetDsl {
  const normalized = normalizeSavedTaskView(view);
  const tags = parseSavedViewTags(normalized.tag);
  return {
    id: normalized.id,
    name: normalized.name,
    ...(normalized.builtin ? { builtin: true } : {}),
    ...(normalized.hidden ? { hidden: true } : {}),
    filters: {
      ...(normalized.search ? { search: normalized.search } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      status: normalized.status,
      ...(Object.keys(normalized.time).length > 0 ? { time: normalized.time } : {}),
    },
    view: normalized.view,
    summary: normalized.summary ?? [],
  };
}

export function stringifySavedViewDsl(view: SavedTaskView): string {
  return JSON.stringify(savedViewToDsl(view), null, 2);
}

export function parseSavedViewDsl(
  text: string,
  existing: Partial<Pick<SavedTaskView, "id" | "name" | "builtin" | "hidden">> = {},
): SavedTaskView {
  const raw = parseDslRoot(text);
  const base = "query" in raw && isRecord(raw.query) ? raw.query : raw;
  const name = stringOrFallback(base.name, existing.name ?? "");
  if (!name.trim()) {
    throw new Error("DSL 缺少 name。");
  }
  const filters = isRecord(base.filters) ? base.filters : {};
  const status = normalizeSavedViewStatus(filters.status as SavedViewStatus | undefined);
  const time = normalizeTimeFilters(isRecord(filters.time) ? (filters.time as SavedViewTimeFilters) : {});
  const tags = normalizeDslTags(filters.tags);
  const view = normalizeSavedViewConfig(isRecord(base.view) ? (base.view as SavedViewConfig) : undefined);
  const summary = normalizeSavedViewSummary(Array.isArray(base.summary) ? (base.summary as SavedViewSummaryMetric[]) : []);
  const id = stringOrFallback(base.id, existing.id ?? defaultSavedViewId());
  return normalizeSavedTaskView({
    id,
    name,
    builtin: booleanOrFallback(base.builtin, existing.builtin ?? false),
    hidden: booleanOrFallback(base.hidden, existing.hidden ?? false),
    search: stringOrFallback(filters.search, ""),
    tag: tags.join(","),
    time,
    status,
    view,
    summary,
  });
}

export function sameSavedViewContent(a: SavedTaskView, b: SavedTaskView): boolean {
  const left = normalizeSavedTaskView(a);
  const right = normalizeSavedTaskView(b);
  return JSON.stringify({
    builtin: left.builtin,
    hidden: left.hidden,
    search: left.search,
    tag: left.tag,
    time: left.time,
    status: left.status,
    view: left.view,
    summary: left.summary,
  }) === JSON.stringify({
    builtin: right.builtin,
    hidden: right.hidden,
    search: right.search,
    tag: right.tag,
    time: right.time,
    status: right.status,
    view: right.view,
    summary: right.summary,
  });
}

export function renameSavedViewById(
  views: readonly SavedTaskView[],
  id: string,
  name: string,
): SavedTaskView[] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Query Tab 名称不能为空。");
  return views.map((view) => (view.id === id ? normalizeSavedTaskView({ ...view, name: trimmed }) : view));
}

export function deleteSavedViewById(views: readonly SavedTaskView[], id: string): SavedTaskView[] {
  return views.filter((view) => view.id !== id);
}

export function setSavedViewHiddenById(
  views: readonly SavedTaskView[],
  id: string,
  hidden: boolean,
): SavedTaskView[] {
  return views.map((view) => (view.id === id ? normalizeSavedTaskView({ ...view, hidden }) : view));
}

export function duplicateSavedView(
  views: readonly SavedTaskView[],
  sourceId: string,
  name: string,
  makeId: () => string = defaultSavedViewId,
): SavedTaskView {
  const source = views.find((view) => view.id === sourceId);
  if (!source) throw new Error(`Query Tab 不存在：${sourceId}`);
  const normalized = normalizeSavedTaskView(source);
  return normalizeSavedTaskView({
    ...normalized,
    id: makeId(),
    name: name.trim(),
    builtin: false,
    hidden: false,
  });
}

export function visibleSavedViews(views: readonly SavedTaskView[]): SavedTaskView[] {
  return views.map((view) => normalizeSavedTaskView(view)).filter((view) => !view.hidden);
}

export function moveSavedViewById(
  views: readonly SavedTaskView[],
  id: string,
  direction: -1 | 1,
): SavedTaskView[] {
  const index = views.findIndex((view) => view.id === id);
  if (index === -1) return [...views];
  const target = index + direction;
  if (target < 0 || target >= views.length) return [...views];
  const out = [...views];
  const [item] = out.splice(index, 1);
  out.splice(target, 0, item);
  return out;
}

export function createSavedViewId(): string {
  return defaultSavedViewId();
}

function normalizeSavedViewConfig(view: SavedViewConfig | null | undefined): SavedViewConfig {
  const type = normalizeQueryViewType(view?.type);
  const preset = view?.preset?.trim();
  const orderBy = Array.isArray(view?.orderBy)
    ? view.orderBy.map((value) => value.trim()).filter(Boolean)
    : undefined;
  return {
    type,
    ...(preset ? { preset } : {}),
    ...(orderBy && orderBy.length > 0 ? { orderBy } : {}),
  };
}

function normalizeSavedViewSummary(summary: SavedViewSummaryMetric[] | null | undefined): SavedViewSummaryMetric[] {
  if (!Array.isArray(summary)) return [];
  const out: SavedViewSummaryMetric[] = [];
  for (const metric of summary) {
    if (!metric || typeof metric.type !== "string") continue;
    const normalized: SavedViewSummaryMetric = { type: metric.type };
    if (metric.field?.trim()) normalized.field = metric.field.trim();
    if (metric.numerator?.trim()) normalized.numerator = metric.numerator.trim();
    if (metric.denominator?.trim()) normalized.denominator = metric.denominator.trim();
    if (metric.by?.trim()) normalized.by = metric.by.trim();
    if (typeof metric.limit === "number" && Number.isFinite(metric.limit)) normalized.limit = metric.limit;
    if (metric.format?.trim()) normalized.format = metric.format.trim();
    out.push(normalized);
  }
  return out;
}

function normalizeQueryViewType(type: QueryViewType | string | null | undefined): QueryViewType {
  return type === "week" || type === "month" || type === "matrix" ? type : "list";
}

function normalizeTimeFilters(time: SavedViewTimeFilters): SavedViewTimeFilters {
  const out: SavedViewTimeFilters = {};
  for (const [key, value] of Object.entries(time) as Array<[keyof SavedViewTimeFilters, string | undefined]>) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

function defaultSavedViewId(): string {
  return `sv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function seededBuiltinSavedView(tab: BuiltinQueryTab, name: string): SavedTaskView {
  switch (tab) {
    case "today":
      return normalizeSavedTaskView({
        id: BUILTIN_SAVED_VIEW_IDS.today,
        name,
        builtin: true,
        hidden: false,
        search: "",
        tag: "",
        time: {},
        status: ["todo"],
        view: { type: "list", preset: "today" },
        summary: [],
      });
    case "week":
      return normalizeSavedTaskView({
        id: BUILTIN_SAVED_VIEW_IDS.week,
        name,
        builtin: true,
        hidden: false,
        search: "",
        tag: "",
        time: {},
        status: ["todo"],
        view: { type: "week" },
        summary: [],
      });
    case "month":
      return normalizeSavedTaskView({
        id: BUILTIN_SAVED_VIEW_IDS.month,
        name,
        builtin: true,
        hidden: false,
        search: "",
        tag: "",
        time: {},
        status: ["todo"],
        view: { type: "month" },
        summary: [],
      });
    case "completed":
      return normalizeSavedTaskView({
        id: BUILTIN_SAVED_VIEW_IDS.completed,
        name,
        builtin: true,
        hidden: false,
        search: "",
        tag: "",
        time: {},
        status: ["done"],
        view: { type: "list", preset: "completed", orderBy: ["completed_desc"] },
        summary: [
          { type: "count" },
          { type: "sum", field: "actual", format: "duration" },
          { type: "ratio", numerator: "actual", denominator: "estimate", format: "percent" },
        ],
      });
    case "unscheduled":
    default:
      return normalizeSavedTaskView({
        id: BUILTIN_SAVED_VIEW_IDS.unscheduled,
        name,
        builtin: true,
        hidden: false,
        search: "",
        tag: "",
        time: {},
        status: ["todo"],
        view: { type: "list", preset: "unscheduled", orderBy: ["deadline_risk", "created_desc"] },
        summary: [{ type: "count" }],
      });
  }
}

function parseSavedViewTags(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(",")) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

function normalizeDslTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const tag = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(tag);
  }
  return out;
}

function parseDslRoot(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`DSL 当前只支持 JSON，解析失败：${detail}`);
  }
  if (!isRecord(parsed)) {
    throw new Error("DSL 根节点必须是对象。");
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function booleanOrFallback(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
