import Minesweeper from "./Minesweeper";
import {makeAuthRequest} from "./Auth";
import {getSettings} from "./Settings";
import {API_URL} from "./Api";

const GAMES_URL = API_URL + "/games";

const SAVED_GAMES_STORAGE_KEY = "ms-saved-games";

export function checkSavedGameExists(difficulty: MinesweeperDifficulty): boolean {

	return Boolean(
		getSavedGames()
			.find((savedGame) => savedGame.difficulty === difficulty)
	);
}

export function deleteSavedGame(difficulty: MinesweeperDifficulty): void {

	const newSavedGames: SavedGame[] = getSavedGames()
		.filter((savedGame) => savedGame.difficulty !== difficulty);

	localStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(newSavedGames));

	if (getSettings().syncData) {
		makeAuthRequest(GAMES_URL + `/${difficulty}`, "DELETE")
			.then((response) => {
				if (response.error) {
					console.error("Error deleting Game:", response.data);
				}
			})
	}
}

export function saveGame(game: Minesweeper, should_sync: boolean = false): void {

	const encodedGame: string = game.encodeCurrentGame();

	const newSavedGame: SavedGame = {
		difficulty: game.difficulty,
		encodedGame: encodedGame,
		createdAt: (new Date()).getTime()
	};

	const newSavedGames: SavedGame[] = getSavedGames()
		.filter((savedGame) => savedGame.difficulty !== game.difficulty);

	newSavedGames.push(newSavedGame);

	localStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(newSavedGames));

	if (should_sync && getSettings().syncData) {
		makeAuthRequest(GAMES_URL, "PUT", JSON.stringify(newSavedGame))
			.then((response) => {
				if (response.error) {
					console.error("Error updating Game:", response.data);
				}
			})
	}
}

export function getSavedGames(): SavedGame[] {

	const storedSavedGames: string | null = localStorage.getItem(SAVED_GAMES_STORAGE_KEY);

	if (!storedSavedGames || storedSavedGames === "null") {
		return [];
	}

	return JSON.parse(storedSavedGames);
}

export function getSavedGame(difficulty: MinesweeperDifficulty): SavedGame | null {

	return getSavedGames()
		.find((savedGame) => savedGame.difficulty === difficulty) ?? null;
}

export function updateSavedGames(newSavedGames: SavedGame[]): void {
	
	localStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(newSavedGames));
}
