import PopupComponent from "../components/Popup";
import {openSettings} from "../main";
import {API_URL, makeRequest} from "./Api";

const REFRESH_TOKENS_URL = API_URL + "/auth/refresh";
const LOGOUT_URL = API_URL + "/auth/logout";

const REFRESH_TOKEN_STORAGE_KEY = "ms-refresh-token";
const DEVICE_ID_STORAGE_KEY = "ms-device-id";
const TEST_ACCOUNT_CREDENTIALS_STORAGE_KEY = "ms-test-account-credentials";

const API_RETRY_DELAY = 500;

let accessToken: string | null = null;

let testAccountCredentials: TestAccountCredentials | null = null;

const $main: HTMLElement = document.querySelector("#app #main")!;

export function setTestAccountCredentials(username: string | null, password: string | null): void {

	if (username === null || password === null) {
		testAccountCredentials = null;
		localStorage.removeItem(TEST_ACCOUNT_CREDENTIALS_STORAGE_KEY);
		return;
	}

	testAccountCredentials = { username, password };
	localStorage.setItem(TEST_ACCOUNT_CREDENTIALS_STORAGE_KEY, JSON.stringify(testAccountCredentials));
}

export function getTestAccountCredentials(): TestAccountCredentials | null {

	if (testAccountCredentials === null) {
		const storedCredentials: string | null = localStorage.getItem(TEST_ACCOUNT_CREDENTIALS_STORAGE_KEY);

		if (storedCredentials === null) {
			return null;
		}

		testAccountCredentials = JSON.parse(storedCredentials);
	}

	return testAccountCredentials;
}

export function isTestAccountUsername(username: string): boolean {
	
	return username.startsWith("#testaccount");
}

export async function makeAuthRequest(
	url: string,
	method: string,
	body: BodyInit | null = null,
	headers: HeadersInit = {},
	options: RequestInit = {},
	isRetry: boolean = false
): Promise<ApiResponse> {

	if (accessToken === null) {
		return {
			data: "Not logged in.",
			status: null,
			error: true
		};
	}

	headers = {
		...headers,
		Authorization: `Bearer ${accessToken}`
	};

	options = {
		...options,
		mode: "cors",
		credentials: "include"
	};

	const response: ApiResponse = await makeRequest(url, method, body, headers, options);

	if (response.status === 401) {

		const hasError: boolean = await refreshTokens();

		if (hasError) {
			console.error("Error retrying to refresh tokens: Unauthorized.");
			return response;
		}

		if (!isRetry) {
			return new Promise((resolve) => {
				setTimeout(() => resolve(makeAuthRequest(url, method, body, headers, options, true)), API_RETRY_DELAY);
			})
		}
	}

	return response
}

export function isLoggedIn(): boolean {
    // TODO: no API
    return false
	return Boolean(accessToken);
}

export function setAuthTokens(accessToken_: string | null, refreshToken: string | null): void {
	
	accessToken = accessToken_;

	if (refreshToken === null) {
		localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
	} else {
		localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
	}
}

export async function logout(): Promise<void> {

	setAuthTokens(null, null);
	setDeviceID(null);
	setTestAccountCredentials(null, null);
	
	const refreshToken: string | null = getRefreshToken();

	if (!refreshToken) {
		return;
	}

	const requestData = {refreshToken};

	const response: ApiResponse = await makeRequest(LOGOUT_URL, "POST", JSON.stringify(requestData));

	if (response.error) {
		console.error("Error loggin out:", response.data);
		return;
	}
}

export async function logoutDevice(deviceID: number, username: string, password: string): Promise<void> {
	
	setAuthTokens(null, null);
	setDeviceID(null, username);
	setTestAccountCredentials(null, null);

	const requestData = {username, password};

	const response: ApiResponse = await makeRequest(LOGOUT_URL + `/${deviceID}`, "POST", JSON.stringify(requestData))

	if (response.error) {
		console.error("Error loggin out:", response.data);
		return;
	}
}

function getRefreshToken(): string | null {
	
	const refreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

	if (!refreshToken || refreshToken == "undefined") {
		return null;
	}

	return refreshToken;
}

function getDeviceIDs(): DeviceIDs | null {
	const storedDeviceIDs: string | null = localStorage.getItem(DEVICE_ID_STORAGE_KEY);

	if (!storedDeviceIDs || storedDeviceIDs == "undefined") {
		return null;
	}

	return JSON.parse(storedDeviceIDs);
}

export function getDeviceID(username: string = "#last"): number | null {
	const deviceIDs: DeviceIDs | null = getDeviceIDs();

	if (!deviceIDs) {
		return null;
	}

	return deviceIDs[username] ?? null;
}

export function setDeviceID(deviceID: number | null, username: string = "#last"): void {

	const deviceIDs: DeviceIDs = getDeviceIDs() ?? {};

	if (deviceID === null) {
		delete deviceIDs[username];
		delete deviceIDs["#last"];
	} else {
		deviceIDs[username] = deviceIDs["#last"] = deviceID;
	}

	localStorage.setItem(DEVICE_ID_STORAGE_KEY, JSON.stringify(deviceIDs));
}

export async function refreshTokens(): Promise<boolean> {

	const refreshToken: string | null = getRefreshToken();

	if (!refreshToken) {
		return true;
	}

	const requestData = {refreshToken};

	const response: ApiResponse = await makeRequest(REFRESH_TOKENS_URL, "POST", JSON.stringify(requestData));

	if (response.error) {
		console.error("Error refreshing tokens:", response.data);

		if (response.status === 401) {
			setTestAccountCredentials(null, null);
			setAuthTokens(null, null);

			setTimeout(() => {
				const popup: PopupComponent = new PopupComponent(
					$main,
					{
						title: "Your session has expired.",
						message: "Go settings to login again.",
						isError: true,
						buttonText1: "Close",
						buttonText2: "Go Settings",
						onClick2: openSettings
					}
				);

				popup.render();
			}, 1000);
		}

		return true;
	}

	setAuthTokens(response.data.accessToken, response.data.refreshToken);

	return false;
}
