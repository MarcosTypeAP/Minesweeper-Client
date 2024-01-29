declare module "*.module.css";

type MinesweeperDifficulty = import("./models/Minesweeper").MinesweeperDifficulty

interface Component {
	render(): void;
	clean(): void;
}

type HTMLElementAndDocumentEventMap = HTMLElementEventMap | DocumentEventMap;

type EventListenerEntry<K extends keyof HTMLElementAndDocumentEventMap = keyof HTMLElementAndDocumentEventMap> = {
	element: HTMLElement | Document;
	type: K;
	listener: (event: HTMLElementAndDocumentEventMap[K]) => any;
	options?: boolean | AddEventListenerOptions | undefined;
};

type AuthRequestCredentials = {
	username: string;
	password: string;
};

type LoginRequestData = AuthRequestCredentials;
type SignupRequestData = AuthRequestCredentials;

type ApiResponse = {
	data: any | null;
	status: number | null;
	error: boolean;
};

type GameClickAction = "mark" | "dig";

type GameSettings = {
	theme: number;
	syncData: boolean;
	initialZoom: boolean;
	actionToggle: boolean;
	defaultAction: GameClickAction;
	longTapDelay: number;
	resolution: number;
	easyDigging: boolean;
	vibration: boolean;
	vibrationIntensity: number;
	modifiedAt: number;
};

type BooleanKeys<T> = {
	[K in keyof T]: T[K] extends boolean ? K : never;
}[keyof T];

type OnlyBoolean<T> = {
	[k in BooleanKeys<T>]: boolean;
};

type NumberKeys<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type OnlyNumber<T> = {
	[k in NumberKeys<T>]: number;
};

type Nullable<T> = {
	[K in keyof T]: T[K] | null;
};

type TimeRecord = {
	id: string;
	time: number;
	createdAt: number;
	difficulty: MinesweeperDifficulty;
};

type SavedGame = {
	encodedGame: string;
	difficulty: MinesweeperDifficulty;
	createdAt: number;
};

type TestAccountCredentials = {
	username: string;
	password: string;
};

type DeviceIDs = {
	[key: string]: number | null;
};
