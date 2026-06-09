// US-801~808: Zentao integration settings type.
// Embedded in PluginSettings as `zentao: ZentaoSettings | null`.

export interface ZentaoSettings {
	/** Zentao server URL, e.g. https://zentao.example.com */
	serverUrl: string;
	/** AES-256-GCM encrypted password (base64) */
	encryptedPassword: string;
	/** Encryption IV (base64) */
	encryptionIv: string;
	/** Zentao account name */
	account: string;
	/** Sync mode: manual execution selection or all assigned to me */
	syncMode: "manual" | "assignedtome";
	/** Selected execution IDs for manual mode */
	selectedExecutionIds: number[];
	/** Sync target: daily-note or specified file */
	syncTarget: "daily-note" | "specified-file";
	/** Vault-relative path for specified-file mode */
	specifiedFilePath: string;
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

export const DEFAULT_ZENTAO_SETTINGS: ZentaoSettings = {
	serverUrl: "",
	encryptedPassword: "",
	encryptionIv: "",
	account: "",
	syncMode: "assignedtome",
	selectedExecutionIds: [],
	syncTarget: "daily-note",
	specifiedFilePath: "",
	executionListCache: null,
	executionListCacheTime: null,
};
