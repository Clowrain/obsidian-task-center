/**
 * Holiday-cn API response structure.
 * Source: https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json
 */
export interface HolidayApiResponse {
  $schema?: string;
  $id?: string;
  year: number;
  papers?: string[];
  days: HolidayDay[];
}

export interface HolidayDay {
  name: string;
  date: string; // YYYY-MM-DD
  isOffDay: boolean; // true = rest day (休), false = makeup work day (补)
}

/**
 * Normalized holiday marker for view rendering.
 */
export interface HolidayMarker {
  kind: "off" | "work"; // 休 or 补
  name: string; // Holiday name (春节, 国庆节, etc.)
  date: string; // YYYY-MM-DD
}

/**
 * Internal cache entry for a single year.
 */
export interface YearCacheEntry {
  year: number;
  status: "pending" | "loaded" | "failed";
  markers: Map<string, HolidayMarker>; // date -> marker
  error?: string;
}