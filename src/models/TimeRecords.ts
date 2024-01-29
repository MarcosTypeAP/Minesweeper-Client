import {getSettings} from "./Settings";
import {makeAuthRequest} from "./Auth";
import {API_URL} from "./Api";

const TIME_RECORDS_URL = API_URL + "/timerecords";

const TIME_RECORDS_STORAGE_KEY = "ms-time-records";

export function getTimeRecords(): TimeRecord[] {

	const storedRecords: string | null = localStorage.getItem(TIME_RECORDS_STORAGE_KEY);

	if (!storedRecords) {
		return [];
	}

	return JSON.parse(storedRecords);
}

export function saveTimeRecord(difficulty: MinesweeperDifficulty, time: number, date: Date = new Date()): void {

	const currRecords: TimeRecord[] = getTimeRecords();

	const createdAt: number = date.getTime();
	const id: string = `${difficulty}${time}${createdAt}`;

	const newRecord: TimeRecord = {id, difficulty, time, createdAt};

	currRecords.push(newRecord);

	localStorage.setItem(TIME_RECORDS_STORAGE_KEY, JSON.stringify(currRecords));

	if (getSettings().syncData) {
		makeAuthRequest(TIME_RECORDS_URL, "POST", JSON.stringify(newRecord))
			.then((response) => {
				if (response.error) {
					console.error("Error creating TimeRecord:", response.data);
				}
			})
	}
}

export function updateTimeRecords(newRecords: TimeRecord[]): void {

	localStorage.setItem(TIME_RECORDS_STORAGE_KEY, JSON.stringify(newRecords));
}

export function generateTimeRecords(amount: number): void {

	for (let i = 0; i < amount; ++i) {
		const difficulty: number = Math.round(Math.random() * 2);
		const time: number = Math.round(Math.random() * (600 - 30) + 30);
		const createdAt: Date = new Date(
			(new Date()).getTime() - Math.round(Math.random() * (1000000000 - 10000000) + 10000000)
		);

		saveTimeRecord(difficulty, time, createdAt);
	}
}

export async function deleteTimeRecord(id: string): Promise<boolean> {

	if (getSettings().syncData) {
		const response: ApiResponse = await makeAuthRequest(TIME_RECORDS_URL + `/${id}`, "DELETE");

		if (response.error) {
			console.error("Error deleting TimeRecord:", response.data);
			return true;
		}
	}

	const currRecords: TimeRecord[] = getTimeRecords();

	localStorage.setItem(
		TIME_RECORDS_STORAGE_KEY,
		JSON.stringify(currRecords.filter((record) => record.id !== id))
	);

	return false;
}
