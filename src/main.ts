import './style.css';
import Minesweeper, {MinesweeperDifficulty} from './models/Minesweeper';
import HeaderComponent from './components/Header';
import MainMenuComponent from './components/MainManu';
import GameComponent from './components/Game';
import TimesComponent from './components/Times';
import SettingsComponent from './components/Settings';
import AccessAccountComponent from './components/AccessAccount';
import {isLoggedIn, makeAuthRequest, refreshTokens} from './models/Auth';
import {changeSettings, getSettings} from './models/Settings';
import {getTimeRecords, updateTimeRecords} from './models/TimeRecords';
import {getSavedGame, getSavedGames, saveGame, updateSavedGames} from './models/Games';
import {API_URL} from './models/Api';

const SYNC_DATA_URL = API_URL + "/users/sync"

const LAST_DIFFICULTY_STORAGE_KEY = "ms-last-difficulty";
const LOW_FPS_POPUP_STORAGE_KEY = "ms-low-fps-popup";

export async function syncDataOnlyGet(): Promise<void> {

	if (!isLoggedIn()) {
		return;
	}

	const response: ApiResponse = await makeAuthRequest(SYNC_DATA_URL, "GET");

	if (response.error) {
		console.error("Error on getSyncData response:", response.data);
		return;
	}

	if (response.data.settings !== null) {
		changeSettings(response.data.settings);
	}

	if (response.data.timeRecords.length > 0) {
		updateTimeRecords(response.data.timeRecords);
	}

	if (response.data.games.length > 0) {
		updateSavedGames(response.data.games);
	}
}

export async function syncData(): Promise<void> {

	if (!isLoggedIn()) {
		return;
	}

	const settings: GameSettings = getSettings();

	const requestData = {
		timeRecords: getTimeRecords(),
		games: getSavedGames(),
		settings: {
			theme: settings.theme,
			initialZoom: settings.initialZoom,
			actionToggle: settings.actionToggle,
			defaultAction: settings.defaultAction,
			longTapDelay: settings.longTapDelay,
			easyDigging: settings.easyDigging,
			vibration: settings.vibration,
			vibrationIntensity: settings.vibrationIntensity,
			modifiedAt: settings.modifiedAt,
		}
	};

	const response: ApiResponse = await makeAuthRequest(SYNC_DATA_URL, "PUT", JSON.stringify(requestData));

	if (response.error) {
		console.error("Error on syncData response:", response.data);
		return;
	}

	if (response.data.settings !== null) {
		changeSettings(response.data.settings);
	}

	updateTimeRecords(response.data.timeRecords);
	updateSavedGames(response.data.games);
}

const $header: HTMLHeadingElement = document.querySelector("#app #header")!;
const $main: HTMLElement = document.querySelector("#app #main")!;

let currGame: Minesweeper | null = null;

let currComponent: Component | null = null;

function changeMainComponent(newComponent: Component): void {

	$main.onanimationend = (): void => {
		$main.onanimationend = null;

		if (currComponent) {
			currComponent.clean();
		}

		newComponent.render();

		currComponent = newComponent;

		$main.classList.remove("hidden");
	}

	$main.classList.add("hidden");
}

window.addEventListener("popstate", () => {

	if (history.length <= 1) {
		history.forward();
	}

	switch (currComponent) {
		case gameComponent:
			openMainMenu();
			break;

		case timesComponent:
			openMainMenu();
			break;

		case settingsComponent:
			openMainMenu();
			break;

		case accessAccountComponent:
			openSettings();
			break;
	}
});

export function getLastChosenDifficulty(): MinesweeperDifficulty {

	const storedDifficulty: string | null = localStorage.getItem(LAST_DIFFICULTY_STORAGE_KEY);

	if (!storedDifficulty) {
		return MinesweeperDifficulty.EASY;
	}

	return parseInt(storedDifficulty) as MinesweeperDifficulty;
}

function saveLastChosenDifficulty(difficulty: MinesweeperDifficulty): void {

	localStorage.setItem(LAST_DIFFICULTY_STORAGE_KEY, difficulty.toString());
}

function startGame(difficulty: MinesweeperDifficulty, resume: boolean): void {

	currGame = getGame(difficulty, resume);

	saveLastChosenDifficulty(difficulty);

	headerComponent.renderTimeElapsed(null, true);

	function changeToMainMenu(): void {
		changeMainComponent(mainMenuComponent);
		headerComponent.renderMines(null, true);
		headerComponent.renderGoBack(null, true);
		headerComponent.renderTimeElapsed(null, true);
		if (currGame && currGame.hasEnded() === false) {
			saveGame(currGame, true);
		}
	}

	gameComponent = new GameComponent(
		$main,
		{
			game: currGame,
			renderTimeElapsed: headerComponent.renderTimeElapsed,
			renderMinesCounter: headerComponent.renderMines,
			renderStartNewGame: () => startGame(difficulty, false),
		}
	);

	changeMainComponent(gameComponent);
	headerComponent.renderMines(currGame);
	headerComponent.renderGoBack(changeToMainMenu);
	history.pushState(null, "");
}

export function setLowFpsPupupDisplayed(): void {

	localStorage.setItem(LOW_FPS_POPUP_STORAGE_KEY, "true");
}

export function haveDisplayedLowFpsPopup(): boolean {

	return localStorage.getItem(LOW_FPS_POPUP_STORAGE_KEY) !== null;
}

function getGame(difficulty: MinesweeperDifficulty, resume: boolean): Minesweeper {

	const savedGame: SavedGame | null = getSavedGame(difficulty);

	if (resume && savedGame) {
		currGame = new Minesweeper(MinesweeperDifficulty.UNSET);
		currGame.loadGame(savedGame.encodedGame);

		return currGame;
	}

	currGame = new Minesweeper(difficulty);

	return currGame;
}

function openMainMenu(): void {

	changeMainComponent(mainMenuComponent);
	headerComponent.renderGoBack(null, true);
}

export function openTimesList(): void {

	changeMainComponent(timesComponent);
	headerComponent.renderGoBack(openMainMenu);
	history.pushState(null, "");
}

export function openSettings(): void {

	changeMainComponent(settingsComponent);
	headerComponent.renderGoBack(openMainMenu);
	history.pushState(null, "");
}

export function openAccessAccount(): void {

	changeMainComponent(accessAccountComponent);
	headerComponent.renderGoBack(openSettings);
	history.pushState(null, "");
}

const headerComponent: HeaderComponent = new HeaderComponent(
	$header,
	{
		// changeSettings,
		// getSettings,
		refreshGameTheme: () => gameComponent?.refreshTheme(),
	}
);

const mainMenuComponent: MainMenuComponent = new MainMenuComponent(
	$main,
	{
		startNewGame: (difficulty: MinesweeperDifficulty) => startGame(difficulty, false),
		resumeGame: (difficulty: MinesweeperDifficulty) => startGame(difficulty, true),
		// checkSavedGameExists,
		// deleteSavedGame,
		// openTimesList,
		// openSettings,
		// getLastChosenDifficulty
	}
);

const timesComponent: TimesComponent = new TimesComponent(
	$main,
	{
		// getTimeRecords,
		// deleteTimeRecord,
		// getLastChosenDifficulty,
		// generateTimeRecords
	}
);

const settingsComponent: SettingsComponent = new SettingsComponent(
	$main,
	{
		// openSignup: openAccessAccount,
		// isLoggedIn,
		// getSettings,
		// changeSettings,
		// resetDefaultSettings,
		// reloadSettings: openSettings,
		// openSettings,
		// logout,
		// syncData,
		// getTestAccountCredentials,
	}
);

const accessAccountComponent: AccessAccountComponent = new AccessAccountComponent(
	$main,
	{
		// openSettings,
		// getSettings,
		// syncDataOnlyGet,
		// setAuthTokens,
		// setDeviceID,
		// getDeviceID,
		// setTestAccountCredentials,
		// isTestAccountUsername,
		// logoutDevice,
	}
);

let gameComponent: GameComponent | null = null;

headerComponent.render();

refreshTokens().then(() => {

	history.pushState(null, "");

	if (getSettings().syncData) {
		syncDataOnlyGet().then(() => {
			changeMainComponent(mainMenuComponent);
		})
		return;
	}

	changeMainComponent(mainMenuComponent);
})
