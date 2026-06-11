/**
 * HolidayService — fetches and caches Chinese holiday data from holiday-cn API.
 *
 * Architecture:
 * - Independent from TaskCache (not task-related data)
 * - Synchronous read + async prefetch model
 * - Per-year caching with inflight deduplication
 * - Silent fallback on API failure (no blocking)
 */
import { requestUrl } from "obsidian";
import type { HolidayApiResponse, HolidayMarker, YearCacheEntry } from "./types";

const API_BASE = "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master";
const REQUEST_TIMEOUT_MS = 10000;

export class HolidayService {
  private cache: Map<number, YearCacheEntry> = new Map();
  private inflight: Map<number, Promise<void>> = new Map();
  private refreshCallback: (() => void) | null = null;
  private enabled: boolean = true;

  constructor() {}

  /**
   * Set callback for triggering view refresh after data loaded.
   */
  setRefreshCallback(cb: () => void): void {
    this.refreshCallback = cb;
  }

  /**
   * Enable/disable holiday display (for settings toggle if needed).
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get holiday marker for a specific date (synchronous read).
   * Returns marker for:
   * - Known holidays from cache (休 or 补)
   * - Regular weekends (周六/周日) if not in cache → show "休"
   * Returns null for regular weekdays.
   */
  getMarker(date: string): HolidayMarker | null {
    if (!this.enabled) return null;

    const year = this.extractYear(date);
    const entry = this.cache.get(year);

    // If cache not loaded, check weekend without holiday data
    if (!entry || entry.status !== "loaded") {
      return this.getWeekendMarker(date);
    }

    // Check if date has explicit holiday marker (could be "休" or "补")
    const cached = entry.markers.get(date);
    if (cached) return cached;

    // No explicit marker → check if it's a regular weekend
    return this.getWeekendMarker(date);
  }

  /**
   * Check if date is a regular weekend (Saturday or Sunday).
   * Returns "休" marker for weekends, null for weekdays.
   */
  private getWeekendMarker(date: string): HolidayMarker | null {
    const d = new Date(date);
    const dow = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (dow === 0 || dow === 6) {
      return {
        kind: "off",
        name: dow === 0 ? "周日" : "周六",
        date: date,
      };
    }
    return null;
  }

  /**
   * Prefetch holiday data for visible years (async, non-blocking).
   * Triggers refresh callback after successful load.
   */
  prefetchYears(years: Set<number>): void {
    if (!this.enabled) return;

    for (const year of years) {
      if (!this.cache.has(year) && !this.inflight.has(year)) {
        this.fetchYear(year);
      }
    }
  }

  /**
   * Extract year set from a date range (ISO dates).
   */
  extractYearsFromRange(from: string, to: string): Set<number> {
    const years = new Set<number>();
    years.add(this.extractYear(from));
    years.add(this.extractYear(to));
    return years;
  }

  /**
   * Check if a year is loaded (for testing/debugging).
   */
  isYearLoaded(year: number): boolean {
    const entry = this.cache.get(year);
    return entry?.status === "loaded";
  }

  /**
   * Clear all caches (for testing/reset).
   */
  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * Called when plugin is unloaded (Obsidian closes or plugin disabled).
   * Clears all caches and removes callbacks.
   */
  destroy(): void {
    this.clearCache();
    this.refreshCallback = null;
  }

  // ── Private methods ──

  private extractYear(date: string): number {
    return parseInt(date.slice(0, 4), 10);
  }

  private async fetchYear(year: number): Promise<void> {
    // Mark as pending immediately
    const entry: YearCacheEntry = {
      year,
      status: "pending",
      markers: new Map(),
    };
    this.cache.set(year, entry);

    // Create inflight promise
    const promise = this.doFetch(year, entry);
    this.inflight.set(year, promise);

    try {
      await promise;
    } finally {
      this.inflight.delete(year);
    }
  }

  private async doFetch(year: number, entry: YearCacheEntry): Promise<void> {
    const url = `${API_BASE}/${year}.json`;

    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      const data: HolidayApiResponse = response.json;

      // Validate response structure
      if (!data || data.year !== year || !Array.isArray(data.days)) {
        entry.status = "failed";
        entry.error = "Invalid response structure";
        return;
      }

      // Build marker map
      for (const day of data.days) {
        if (!day.date || typeof day.isOffDay !== "boolean") continue;

        const marker: HolidayMarker = {
          kind: day.isOffDay ? "off" : "work",
          name: day.name,
          date: day.date,
        };
        entry.markers.set(day.date, marker);
      }

      entry.status = "loaded";

      // Trigger refresh callback
      if (this.refreshCallback) {
        this.refreshCallback();
      }
    } catch (err) {
      entry.status = "failed";
      entry.error = err instanceof Error ? err.message : String(err);
      // Silent failure — no blocking, no error toast
    }
  }
}