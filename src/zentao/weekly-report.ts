import { TFile, type App } from "obsidian";
import { addDays, endOfWeek, isoWeekNumber, pad, startOfWeek, todayISO } from "../dates";
import { mapZentaoTask, type MapperOptions, type ZentaoTask } from "./mapper";
import type { ZentaoClient } from "./client";
import type { ZentaoSettings } from "./types";

export interface WeeklyRange {
	start: string;
	end: string;
}

export interface WeeklyDateRanges {
	thisWeek: WeeklyRange;
	nextWeek: WeeklyRange;
}

export interface WeeklyReportResult {
	path: string;
	weekNum: number;
	weekStart: string;
	completedCount: number;
	plannedCount: number;
}

export function getWeekNumber(date: string): number {
	return isoWeekNumber(date);
}

export function getWeeklyDateRange(weekStartsOn: 0 | 1 = 1): WeeklyDateRanges {
	const today = todayISO();
	const thisWeekStart = startOfWeek(today, weekStartsOn);
	const nextWeekStart = addDays(thisWeekStart, 7);
	return {
		thisWeek: {
			start: thisWeekStart,
			end: endOfWeek(today, weekStartsOn),
		},
		nextWeek: {
			start: nextWeekStart,
			end: endOfWeek(nextWeekStart, weekStartsOn),
		},
	};
}

export function filterCompletedThisWeek(tasks: ZentaoTask[], thisWeek: WeeklyRange): ZentaoTask[] {
	return tasks.filter((task) => {
		if (task.status !== "done" && task.status !== "closed") return false;
		const finishedDate = task.finishedDate.slice(0, 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(finishedDate)) return false;
		return finishedDate >= thisWeek.start && finishedDate <= thisWeek.end;
	});
}

export function filterPlannedNextWeek(tasks: ZentaoTask[], nextWeek: WeeklyRange): ZentaoTask[] {
	return tasks.filter((task) => {
		if (task.status !== "wait" && task.status !== "doing") return false;
		const deadline = task.deadline.slice(0, 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
		return deadline >= nextWeek.start && deadline <= nextWeek.end;
	});
}

function renderTaskList(tasks: ZentaoTask[], mapperOpts: MapperOptions): string {
	if (tasks.length === 0) return "无";
	return tasks.map((task) => mapZentaoTask(task, mapperOpts)).join("\n");
}

function timestamp(): string {
	const now = new Date();
	return `${todayISO()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function renderWeeklyReport(
	completed: ZentaoTask[],
	planned: ZentaoTask[],
	weekNum: number,
	weekStart: string,
	mapperOpts: MapperOptions,
): string {
	return [
		`# 周报 ${weekStart}（第${weekNum}周）`,
		"",
		"## 本周完成",
		"",
		renderTaskList(completed, mapperOpts),
		"",
		"## 下周计划",
		"",
		renderTaskList(planned, mapperOpts),
		"",
		"---",
		`生成时间：${timestamp()}`,
	].join("\n");
}

async function writeWeeklyReport(app: App, path: string, content: string): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.process(existing, () => content);
		return;
	}

	const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
	if (dir) {
		await app.vault.adapter.mkdir(dir).catch(() => {});
	}
	await app.vault.create(path, content);
}

export async function generateWeeklyReport(
	client: ZentaoClient,
	settings: ZentaoSettings,
	app: App,
	mapperOpts: MapperOptions,
	weekStartsOn: 0 | 1 = 1,
): Promise<WeeklyReportResult> {
	const tasks = settings.syncMode === "manual"
		? await client.fetchAssignedToMeTasks(settings.selectedExecutionIds)
		: await client.fetchAllAssignedToMe();

	const { thisWeek, nextWeek } = getWeeklyDateRange(weekStartsOn);
	const weekNum = getWeekNumber(thisWeek.start);
	const completed = filterCompletedThisWeek(tasks, thisWeek);
	const planned = filterPlannedNextWeek(tasks, nextWeek);
	const content = renderWeeklyReport(completed, planned, weekNum, thisWeek.start, mapperOpts);
	const folder = settings.weeklyReportFolder || "WeeklyReports";
	const path = `${folder}/${thisWeek.start}（第${weekNum}周）.md`;

	await writeWeeklyReport(app, path, content);

	return {
		path,
		weekNum,
		weekStart: thisWeek.start,
		completedCount: completed.length,
		plannedCount: planned.length,
	};
}
