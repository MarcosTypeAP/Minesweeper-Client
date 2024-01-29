import {API_URL} from "./Api";
import {makeAuthRequest} from "./Auth";

const SETTINGS_URL = API_URL + "/settings";

const SETTINGS_STORAGE_KEY = "ms-settings";

const defaultSettings: GameSettings = {
	theme: 0,
	syncData: false,
	actionToggle: true,
	defaultAction: "dig",
	longTapDelay: 200,
	easyDigging: false,
	initialZoom: true,
	resolution: 100,
	vibration: true,
	vibrationIntensity: 150,
	modifiedAt: -1
};

export function changeSettings(newSettings: Partial<GameSettings>): void {
	
	const storedSettings: string | null = localStorage.getItem(SETTINGS_STORAGE_KEY);

	let gameSettings: GameSettings = storedSettings
		? JSON.parse(storedSettings)
		: {...defaultSettings};

	const newSettingKeys: (keyof GameSettings)[] = Object.keys(newSettings) as (keyof GameSettings)[];

	let hasChanged: boolean = false;

	for (let i = 0; i < newSettingKeys.length; ++i) {
		if (newSettingKeys[i] === "syncData") {
			continue;
		}

		if (newSettings[newSettingKeys[i]] !== gameSettings[newSettingKeys[i]]) {
			hasChanged = true;
			break;
		}
	}

	gameSettings = {
		...gameSettings,
		...newSettings
	};

	if (hasChanged) {
		gameSettings.modifiedAt = (new Date()).getTime();
	}

	localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(gameSettings));

	if (gameSettings.syncData && hasChanged) {
		makeAuthRequest(SETTINGS_URL, "PUT", JSON.stringify(gameSettings))
			.then((response) => {
				if (response.error) {
					console.error("Error updating Settings:", response.data);
				}
			})
	}
}

export function resetDefaultSettings(): void {

	const theme: number = getSettings().theme;
	
	changeSettings({
		...defaultSettings,
		theme,
		modifiedAt: (new Date()).getTime()
	})
}

export function getSettings(getDefault: boolean = false): GameSettings {

	if (getDefault) {
		return {...defaultSettings};
	}
	
	const storedSettings: string | null = localStorage.getItem(SETTINGS_STORAGE_KEY);

	if (!storedSettings) {
		return {...defaultSettings};
	}

	return JSON.parse(storedSettings);
}
