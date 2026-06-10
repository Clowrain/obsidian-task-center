// US-801~808: Zentao integration settings type.
// Embedded in PluginSettings as `zentao: ZentaoSettings | null`.
// US-831: Password now stored in Obsidian SecretStorage (app.secretStorage)
// Legacy encryptedPassword/encryptionIv fields kept for migration compatibility.

export interface ZentaoSettings {
	/** Zentao server URL, e.g. https://zentao.example.com */
	serverUrl: string;
	/** @deprecated Legacy AES-256-GCM encrypted password (base64). Use SecretStorage instead. */
	encryptedPassword: string;
	/** @deprecated Legacy encryption IV (base64). Use SecretStorage instead. */
	encryptionIv: string;
	/** Zentao account name */
	account: string;
	/** Sync mode: manual execution selection or all assigned to me */
	syncMode: "manual" | "assignedtome";
	/** Selected execution IDs for manual mode */
	selectedExecutionIds: number[];
	/** Sync target: daily-note, specified-file, or project-folder */
	syncTarget: "daily-note" | "specified-file" | "project-folder";
	/** Vault-relative path for specified-file mode */
	specifiedFilePath: string;
	/** Vault-relative folder for project-folder mode (tasks written to {folder}/{projectName}.md) */
	projectFolder: string;
	/** US-833: Vault-relative folder for weekly reports */
	weeklyReportFolder: string;
	/** Cached execution list (avoids re-fetching on settings open) */
	executionListCache: ZentaoExecutionInfo[] | null;
	/** Cache timestamp (epoch ms) */
	executionListCacheTime: number | null;
}

export interface ZentaoExecutionInfo {
	id: number;
	project: number;
	projectName: string;
	name: string;
	status: string;
	begin: string;
	end: string;
}

/** SecretStorage key for Zentao password */
export const ZENTAO_PASSWORD_KEY = "zentao-password";

export const DEFAULT_ZENTAO_SETTINGS: ZentaoSettings = {
	serverUrl: "",
	encryptedPassword: "",
	encryptionIv: "",
	account: "",
	syncMode: "assignedtome",
	selectedExecutionIds: [],
	syncTarget: "project-folder",
	specifiedFilePath: "",
	projectFolder: "ZentaoTasks",
	weeklyReportFolder: "WeeklyReports",
	executionListCache: null,
	executionListCacheTime: null,
};
