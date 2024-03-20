import getFlagSVG from "../icons/Flag";
import getMineSVG from "../icons/Mine";
import {haveDisplayedLowFpsPopup, openSettings, setLowFpsPupupDisplayed} from "../main";
import {deleteSavedGame, saveGame} from "../models/Games";
import Minesweeper, {GridCell, GridCellPosition, MinesweeperReturnCode} from "../models/Minesweeper";
import {getSettings} from "../models/Settings";
import {saveTimeRecord} from "../models/TimeRecords";
import {getFormatedTime} from "../utils";
import styles from "./Game.module.css";
import GameCanvasComponent, {EightDirections} from "./GameCanvas";
import PopupComponent from "./Popup";

// CSS order (0 = up)
const eightDirections: EightDirections = [
	// x, y
	[0, -1],  // up
	[1, -1],  // up right
	[1, 0],   // right
	[1, 1],	  // down right
	[0, 1],	  // down
	[-1, 1],  // down left
	[-1, 0],  // left
	[-1, -1], // up left
];

function isMobile(): boolean {
	return window.innerWidth <= 500;
}

type GameProps = {
	game: Minesweeper;
	renderTimeElapsed: (game: Minesweeper | null, hide?: boolean) => void;
	renderMinesCounter: (game: Minesweeper | null, hide?: boolean) => void;
	renderStartNewGame: () => void;
};

type GameDOMElements = {
	actionMark: HTMLButtonElement;
	actionDig: HTMLButtonElement;
	actionToggle: HTMLDivElement;
};

type GameState = {
	moveInitialAvgPointersPos: Position | null;
	moveInitialGridPos: Position;
	moveCurrentGridPos: Position;

	zoomInitialGridScale: number;
	zoomCurrentGridScale: number;
	zoomInitialPtrsRadius: number | null;

	currPointers: PointerEvent[];
	rootRect: DOMRect | null;

	isDragging: boolean;
	canDrag: boolean;

	gameCanvas: GameCanvasComponent;

	startZoomTimeoutID: number;
	shouldZoomAtStart: boolean;

	isReadyToHandleClicks: boolean;

	settings: GameSettings;
	currAction: GameSettings["defaultAction"];
};

export default class GameComponent implements Component {

	$root: HTMLElement;

	props: GameProps;

	domElements: GameDOMElements | null;

	state: GameState;

	eventListeners: Set<EventListenerEntry>;

	private CANVAS_SCALE_FACTOR = 0.1;
	private CANVAS_MIN_CELL_SIZE_FACTOR = 0.01;
	private CANVAS_MAX_CELL_SIZE_FACTOR = 0.1;
	private CANVAS_INIT_MARGIN_FACTOR = isMobile() ? 0.1 : 0.05;
	private CANVAS_FINAL_MARGIN_FACTOR = 0.05;
	private DRAGGING_THRESHOLD = isMobile() ? window.innerWidth * 0.02 : window.innerHeight * 0.005;
	private ZOOMED_CELL_FACTOR = isMobile() ? 0.08 : 0.06;
	private BOTTOM_BUTTONS_HEIGHT_FACTOR = 0.1;
	private END_GAME_ZOOM_OUT_DURATION = 1500;
	private START_GAME_ZOOM_IN_DURATION = 1500;
	private START_GAME_ZOOM_IN_DELAY = 1000;
	private START_GAME_DELAY = 600;

	constructor(root: HTMLElement, props: GameProps) {

		this.$root = root;
		this.props = props;
		this.state = this.getInitState();
		this.domElements = null;

		this.eventListeners = new Set();
	}

	private getInitState(): GameState {

		return {
			moveInitialGridPos: {x: 0, y: 0},
			moveCurrentGridPos: {x: 0, y: 0},
			moveInitialAvgPointersPos: null,

			zoomInitialGridScale: 1,
			zoomCurrentGridScale: 1,
			zoomInitialPtrsRadius: null,

			currPointers: [],
			rootRect: null,

			isDragging: false,
			canDrag: true,

			gameCanvas: new GameCanvasComponent(
				this.$root,
				{
					game: this.props.game,
					onClick: this.handleClick,
					onLowFps: this.handleLowFps,
				}
			),

			startZoomTimeoutID: -1,
			shouldZoomAtStart: true,

			isReadyToHandleClicks: false,

			settings: getSettings(),
			currAction: getSettings().defaultAction,
		};
	}

	render(): void {

		this.clean();

		this.state.gameCanvas.render();
		this.state.gameCanvas.startDrawingLoop();

		const $actionToggle: HTMLDivElement = document.createElement("div");
		$actionToggle.className = styles.action_toggle;
		$actionToggle.classList.add(styles.hidden);
		$actionToggle.onpointermove = (event: PointerEvent) => event.stopPropagation();

		const $actionDig: HTMLButtonElement = document.createElement("button");
		$actionDig.classList.add(styles.action_toggle_button);
		$actionDig.classList.toggle(styles.selected, this.state.currAction === "dig");
		$actionDig.appendChild(getMineSVG());
		$actionDig.onclick = this.handleActionToggleDig;

		$actionToggle.appendChild($actionDig);

		const $actionMark: HTMLButtonElement = document.createElement("button");
		$actionMark.className = styles.action_toggle_mark;
		$actionMark.classList.add(styles.action_toggle_button);
		$actionMark.classList.toggle(styles.selected, this.state.currAction === "mark");
		$actionMark.appendChild(getFlagSVG());
		$actionMark.onclick = this.handleActionToggleMark;

		$actionToggle.appendChild($actionMark);

		this.$root.appendChild($actionToggle);

		this.domElements = {
			actionToggle: $actionToggle,
			actionDig: $actionDig,
			actionMark: $actionMark,
		};

		this.state.rootRect = this.$root.getBoundingClientRect();

		this.configureControls();
		this.calculateAndSetInitialZoom();
	}

	private addEventListener<K extends keyof HTMLElementEventMap>(
		element: HTMLElement,
		type: K,
		listener: (event: HTMLElementEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions | undefined
	): void {

		element.addEventListener(type, listener, options);
		this.eventListeners.add({element, type, listener, options} as EventListenerEntry)
	}

	private addEventListenerDocument<K extends keyof DocumentEventMap>(
		element: Document,
		type: K,
		listener: (event: DocumentEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions | undefined
	): void {

		element.addEventListener(type, listener, options);
		this.eventListeners.add({element, type, listener, options} as EventListenerEntry)
	}

	private removeEventListeners(): void {

		this.eventListeners.forEach((eventListener) => {
			eventListener.element.removeEventListener(eventListener.type, eventListener.listener, eventListener.options);
		})

		this.eventListeners.clear();
	};

	clean(): void {

		this.removeEventListeners();
		this.state.gameCanvas.clean();

		this.state = this.getInitState();

		this.$root.innerHTML = '';
		this.$root.className = '';
	}

	refreshTheme(): void {

		this.state.gameCanvas.refreshColors();
		this.state.gameCanvas.makeFullRedraw();
	}

	private handleLowFps = (minFps: number): void => {

		if (!this.props.game.hasStarted() || haveDisplayedLowFpsPopup()) {
			return;
		}

		setLowFpsPupupDisplayed();

		const popup: PopupComponent = new PopupComponent(
			this.$root,
			{
				title: "Bad Performance?",
				message: "Try lowering the resolution in settings.",
				buttonText1: "Close",
				buttonText2: "Go Settings",
				onClick2: () => {
                    if (!this.props.game.hasEnded()) {
                        saveGame(this.props.game, true);
                    }
                    openSettings();
                    this.props.renderTimeElapsed(null, true);
                    this.props.renderMinesCounter(null, true);
                }
			}
		);

		setTimeout(() => {
			popup.render();
		}, 1000);
	}

	private displayActionToggle(hide: boolean = false): void {

		if (!this.domElements) {
			return;
		}

		this.domElements.actionToggle.classList.toggle(styles.hidden, hide);
	}

	private handleActionToggleDig = (event: MouseEvent): void => {

		if (!this.domElements) {
			return;
		}

		this.state.currAction = "dig";

		this.domElements.actionDig.classList.add(styles.selected);
		this.domElements.actionMark.classList.remove(styles.selected);

		event.stopPropagation();
	}

	private handleActionToggleMark = (): void => {

		if (!this.domElements) {
			return;
		}

		this.state.currAction = "mark";

		this.domElements.actionMark.classList.add(styles.selected);
		this.domElements.actionDig.classList.remove(styles.selected);
	}

	private handleClick = (row: number, col: number, button: number, forceButton: boolean = false): void => {

		if (this.state.isDragging || this.state.currPointers.length > 1) {
			return;
		}

		if (this.props.game.hasStarted() === false) {

			if (button !== 0) {
				return;
			}

			const game: Minesweeper = this.props.game;

			if (game.savedGameElapsedSeconds !== -1) {

				this.state.gameCanvas.startGame(this.START_GAME_DELAY);

				setTimeout(() => {
					this.resumeSavedGame();
					this.displayActionToggle();
					this.state.isReadyToHandleClicks = true;
				}, this.START_GAME_DELAY);

				return;
			}

			this.state.gameCanvas.startGame(this.START_GAME_DELAY);

			setTimeout(() => {
				this.state.isReadyToHandleClicks = true;

				game.startGame();
				this.props.renderTimeElapsed(game);
				this.displayActionToggle();
				this.handleClick(row, col, button, true);

				if (!this.state.shouldZoomAtStart || !this.state.settings.initialZoom) {
					return;
				}

				this.state.startZoomTimeoutID = window.setTimeout(() => {
					this.zoomToCell({row, col}, this.START_GAME_ZOOM_IN_DURATION);
				}, this.START_GAME_ZOOM_IN_DELAY)

			}, this.START_GAME_DELAY);

			return;
		}

		if (!this.state.isReadyToHandleClicks) {
			return;
		}

		if (!forceButton && this.state.currAction === "mark") {
			switch (button) {
				case 0:
					button = 2;
					break;

				case 2:
					button = 0;
					break;
			}
		}

		if (button === 0) {

			const cell: GridCell = this.props.game.grid[row][col];

			if (this.state.settings.easyDigging && cell.isDug && cell.minesAround > 0) {
				this.handleEasyDigging({row, col});
				return;
			}

			this.handleDigCell({row, col});
			return;
		}

		if (button === 2) {

			if (this.state.settings.vibration) {
				navigator.vibrate(this.state.settings.vibrationIntensity);
			}
			this.handleMarkCell({row, col});
			return;
		}
	}

	private zoomToCell(cellPos: GridCellPosition, duration: number): void {

		if (!this.domElements) {
			return;
		}

		const $canvas: HTMLCanvasElement | null = this.state.gameCanvas.getCanvas();

		if (!$canvas) {
			return;
		}

		const rootRect: DOMRect | null = this.state.rootRect;

		if (!rootRect) {
			return;
		}

		const cols: number = this.props.game.cols;

		const newCellsSize: number = Math.max(rootRect.width, rootRect.height) * this.ZOOMED_CELL_FACTOR;
		const newScale: number = newCellsSize / ($canvas.width / cols);

		this.state.zoomCurrentGridScale = newScale;

		const prevPosX: number = this.state.moveCurrentGridPos.x;
		const prevPosY: number = this.state.moveCurrentGridPos.y;

		this.state.moveCurrentGridPos.x = (rootRect.width / 2) - (newCellsSize * cellPos.col) - (newCellsSize / 2);
		this.state.moveCurrentGridPos.y = (rootRect.height / 2) - (newCellsSize * cellPos.row) - (newCellsSize / 2);

		const posDiffX: number = this.state.moveCurrentGridPos.x - prevPosX;
		const posDiffY: number = this.state.moveCurrentGridPos.y - prevPosY;

		$canvas.style.setProperty("transform", `translate(${posDiffX}px, ${posDiffY}px) scale(${newScale})`);
		$canvas.style.setProperty("transition", `transform ${duration}ms cubic-bezier(.39,.58,.57,1)`);

		$canvas.ontransitionend = () => {
			$canvas.ontransitionend = null;
			$canvas.style.setProperty("transition", "");
			$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);
			$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
			$canvas.style.setProperty("transform", `scale(${newScale})`);
		};
	}

	private getAvgPointersPosition(): Position | null {

		const currPointers: PointerEvent[] = this.state.currPointers;

		if (currPointers.length === 0) {
			return null;
		}

		let avgX: number = 0;
		let avgY: number = 0;

		const topRootSize: number = this.state.rootRect?.top ?? 0;

		for (let i = 0; i < currPointers.length; ++i) {
			avgX += currPointers[i].clientX;
			avgY += currPointers[i].clientY - topRootSize;
		}

		avgX /= currPointers.length;
		avgY /= currPointers.length;

		return {x: avgX, y: avgY};
	}

	private getAvgPointersRadius(): number | null {

		const currPointers: PointerEvent[] = this.state.currPointers;

		if (currPointers.length === 0) {
			return null;
		}

		const avgPointersPosition: Position = this.getAvgPointersPosition()!;

		let avgRadius: number = 0;

		const topRootSize: number = this.state.rootRect?.top ?? 0;

		for (let i = 0; i < currPointers.length; ++i) {
			avgRadius += Math.sqrt(
				(avgPointersPosition.x - currPointers[i].clientX) ** 2
				+
				(avgPointersPosition.y - currPointers[i].clientY - topRootSize) ** 2
			);
		}

		avgRadius /= currPointers.length;

		return avgRadius;
	}

	private configureControls(): void {

		if (this.domElements === null) {
			return;
		}

		const $canvas: HTMLCanvasElement | null = this.state.gameCanvas.getCanvas();

		if (!$canvas) {
			return;
		}

		const rootRect: DOMRect | null = this.state.rootRect;

		if (!rootRect) {
			return;
		}

		const currPointers: PointerEvent[] = this.state.currPointers;

		const setMoveAndZoomVars = () => {

			this.state.moveInitialGridPos.x = this.state.moveCurrentGridPos.x;
			this.state.moveInitialGridPos.y = this.state.moveCurrentGridPos.y;

			this.state.moveInitialAvgPointersPos = this.getAvgPointersPosition();

			this.state.zoomInitialPtrsRadius = this.getAvgPointersRadius();
			this.state.zoomInitialGridScale = this.state.zoomCurrentGridScale;
		};

		this.addEventListener(this.$root, "pointerdown", (event: PointerEvent) => {

			if (!this.state.canDrag) {
				return;
			}

			if (this.state.gameCanvas.hasGameStarted()) {
				this.state.shouldZoomAtStart = false;
			}

			if (this.state.startZoomTimeoutID !== -1) {
				clearTimeout(this.state.startZoomTimeoutID);
			}

			if ($canvas.style.getPropertyValue("transition")) {
				const canvasRect: DOMRect = this.state.gameCanvas.getCanvas()!.getBoundingClientRect();

				this.state.zoomCurrentGridScale = canvasRect.width / $canvas.width;

				this.state.moveCurrentGridPos.x = canvasRect.x;
				this.state.moveCurrentGridPos.y = canvasRect.y - (this.state.rootRect?.top ?? 0);

				$canvas.ontransitionend = null;
				$canvas.style.setProperty("transition", "");
				$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);
				$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
				$canvas.style.setProperty("transform", `scale(${this.state.zoomCurrentGridScale})`);
			}

			if (event.button !== 0) {
				return;
			}

			if (this.domElements === null) {
				return;
			}

			currPointers.push(event);

			setMoveAndZoomVars();
		});

		const checkIfDragging = () => {
			const currGridPos: Position = this.state.moveCurrentGridPos;
			const initGridPos: Position = this.state.moveInitialGridPos;

			return (
				Math.abs(currGridPos.x - initGridPos.x) > this.DRAGGING_THRESHOLD ||
				Math.abs(currGridPos.y - initGridPos.y) > this.DRAGGING_THRESHOLD ||
				this.state.currPointers.length > 1
			);
		}

		const handlePointerUpAndCancell = (event: PointerEvent) => {

			const pointerIndex: number = currPointers.findIndex(
				(pointer) => pointer.pointerId === event.pointerId
			);

			currPointers.splice(pointerIndex, 1);

			if (!this.state.canDrag) {
				return;
			}

			if (event.button !== 0) {
				return;
			}

			if (currPointers.length === 0) {
				this.state.isDragging = false;
			}

			setMoveAndZoomVars();
		}

		this.addEventListener(document.body, "mouseleave", () => {
			currPointers.splice(0, currPointers.length);
			this.state.isDragging = false;
		});

		this.addEventListener(this.$root, "pointerup", handlePointerUpAndCancell);

		this.addEventListener(this.$root, "pointercancel", handlePointerUpAndCancell);

		this.addEventListener(this.$root, "pointermove", (event: PointerEvent) => {

			if (!this.state.canDrag) {
				return;
			}

			if (event.buttons !== 1) {
				return;
			}

			if (this.domElements === null) {
				return;
			}

			const pointerIndex: number = currPointers.findIndex(
				(pointer) => pointer.pointerId === event.pointerId
			);

			currPointers[pointerIndex] = event;

			if (this.state.moveInitialAvgPointersPos === null) {
				return;
			}

			const currentAvgPointersPos: Position | null = this.getAvgPointersPosition();
			const currentAvgPointersRadius: number | null = this.getAvgPointersRadius();

			if (!currentAvgPointersPos || !currentAvgPointersRadius) {
				return;
			}

			if (this.state.zoomInitialPtrsRadius === null) {
				return;
			}

			let scaleFactor: number = currentAvgPointersRadius / this.state.zoomInitialPtrsRadius;

			const cols: number = this.props.game.cols;

			const newScale: number = this.state.zoomInitialGridScale * scaleFactor;
			const currCellSize: number = ($canvas.width * newScale) / cols;

			const maxSide: number = Math.max(rootRect.width, rootRect.height);

			if (currCellSize > maxSide * this.CANVAS_MAX_CELL_SIZE_FACTOR) {
				const scale: number = maxSide * this.CANVAS_MAX_CELL_SIZE_FACTOR * cols / $canvas.width;
				scaleFactor = scale / this.state.zoomInitialGridScale;

			} else if (currCellSize < maxSide * this.CANVAS_MIN_CELL_SIZE_FACTOR) {
				const scale: number = maxSide * this.CANVAS_MIN_CELL_SIZE_FACTOR * cols / $canvas.width;
				scaleFactor = scale / this.state.zoomInitialGridScale;
			}

			const initialAvgPointersToGridPosDelta: Position = {
				x: this.state.moveInitialAvgPointersPos.x - this.state.moveInitialGridPos.x,
				y: this.state.moveInitialAvgPointersPos.y - this.state.moveInitialGridPos.y,
			};

			this.state.zoomCurrentGridScale = this.state.zoomInitialGridScale * scaleFactor;

			this.state.moveCurrentGridPos.x = currentAvgPointersPos.x - (initialAvgPointersToGridPosDelta.x * scaleFactor);
			this.state.moveCurrentGridPos.y = currentAvgPointersPos.y - (initialAvgPointersToGridPosDelta.y * scaleFactor);

			$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
			$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);

			$canvas.style.setProperty("transform", `scale(${this.state.zoomCurrentGridScale})`);

			if (!this.state.isDragging && checkIfDragging()) {
				this.state.isDragging = true;
			}
		});

		this.addEventListener(this.$root, "wheel", (event: WheelEvent) => {

			event.preventDefault();

			if (this.domElements === null) {
				return;
			}

			this.state.shouldZoomAtStart = false;

			if (this.state.startZoomTimeoutID !== -1) {
				clearTimeout(this.state.startZoomTimeoutID);
			}

			if ($canvas.style.getPropertyValue("transition")) {
				const canvasRect: DOMRect = this.state.gameCanvas.getCanvas()!.getBoundingClientRect();

				this.state.zoomCurrentGridScale = canvasRect.width / $canvas.width;

				this.state.moveCurrentGridPos.x = canvasRect.x;
				this.state.moveCurrentGridPos.y = canvasRect.y - (rootRect?.top ?? 0);

				$canvas.ontransitionend = null;
				$canvas.style.setProperty("transition", "");
				$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);
				$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
				$canvas.style.setProperty("transform", `scale(${this.state.zoomCurrentGridScale})`);
			}

			const scaleFactor: number = event.deltaY < 0 ? this.CANVAS_SCALE_FACTOR : -this.CANVAS_SCALE_FACTOR;

			const cols: number = this.props.game.cols;

			const newScale: number = this.state.zoomCurrentGridScale * (1 + scaleFactor);
			const currCellSize: number = ($canvas.width * newScale) / cols;

			const maxSide: number = Math.max(rootRect.width, rootRect.height);

			if (scaleFactor > 0 && currCellSize > maxSide * this.CANVAS_MAX_CELL_SIZE_FACTOR) {
				return;
			}

			if (scaleFactor < 0 && currCellSize < maxSide * this.CANVAS_MIN_CELL_SIZE_FACTOR) {
				return;
			}

			const mousePos: Position = {
				x: event.clientX,
				y: event.clientY - rootRect.top,
			};

			const mouseToGridPosDelta: Position = {
				x: mousePos.x - this.state.moveCurrentGridPos.x,
				y: mousePos.y - this.state.moveCurrentGridPos.y
			};

			this.state.zoomCurrentGridScale = newScale;

			this.state.moveCurrentGridPos.x = mousePos.x - (mouseToGridPosDelta.x * (1 + scaleFactor));
			this.state.moveCurrentGridPos.y = mousePos.y - (mouseToGridPosDelta.y * (1 + scaleFactor));

			$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
			$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);

			$canvas.style.setProperty("transform", `scale(${this.state.zoomCurrentGridScale})`);

		}, {passive: false});
	}

	private calculateAndSetInitialZoom(): void {

		if (this.domElements === null) {
			return;
		}

		const $canvas: HTMLCanvasElement | null = this.state.gameCanvas.getCanvas();

		if (!$canvas) {
			return;
		}

		const rootRect: DOMRect = this.state.rootRect = this.$root.getBoundingClientRect();

		const canvasInitMargin: number = rootRect.width * this.CANVAS_INIT_MARGIN_FACTOR;

		const newCanvasWidth: number = rootRect.width - canvasInitMargin * 2;

		let newScale: number = newCanvasWidth / $canvas.width;

		if ($canvas.height * newScale > rootRect.height - canvasInitMargin * 2) {
			const newCanvasHeight: number = rootRect.height - canvasInitMargin * 2;

			newScale = newCanvasHeight / $canvas.height;
		}

		this.state.zoomCurrentGridScale = newScale;

		$canvas.style.setProperty("transform", `scale(${this.state.zoomCurrentGridScale})`);

		this.state.moveCurrentGridPos.x = (rootRect.width - ($canvas.width * newScale)) / 2;
		this.state.moveCurrentGridPos.y = (rootRect.height - ($canvas.height * newScale)) / 2;

		$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
		$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);
	}

	private zoomOutCanvas(duration: number): void {

		if (!this.domElements) {
			return;
		}

		const $canvas: HTMLCanvasElement | null = this.state.gameCanvas.getCanvas();

		if (!$canvas) {
			return;
		}

		const rootRect: DOMRect | null = this.state.rootRect;

		if (!rootRect) {
			return;
		}

		const canvasFinalMargin: number = rootRect.height * this.CANVAS_FINAL_MARGIN_FACTOR;
		const bottomButtonsHeight: number = rootRect.height * this.BOTTOM_BUTTONS_HEIGHT_FACTOR;

		const newCanvasHeight: number = rootRect.height - bottomButtonsHeight - canvasFinalMargin * 2;

		let newScale: number = newCanvasHeight / $canvas.height;

		if ($canvas.width * newScale > rootRect.width - canvasFinalMargin * 2) {
			const newCanvasWidth: number = rootRect.width - canvasFinalMargin * 2;

			newScale = newCanvasWidth / $canvas.width;
		}

		this.state.zoomCurrentGridScale = newScale;

		const prevPosX: number = this.state.moveCurrentGridPos.x;
		const prevPosY: number = this.state.moveCurrentGridPos.y;

		this.state.moveCurrentGridPos.x = (rootRect.width - $canvas.width * newScale) / 2;
		this.state.moveCurrentGridPos.y = (rootRect.height - bottomButtonsHeight - $canvas.height * newScale) / 2;

		const posDiffX: number = this.state.moveCurrentGridPos.x - prevPosX;
		const posDiffY: number = this.state.moveCurrentGridPos.y - prevPosY;

		$canvas.style.setProperty("transform", `translate(${posDiffX}px, ${posDiffY}px) scale(${newScale})`);
		$canvas.style.setProperty("transition", `transform ${duration}ms cubic-bezier(.39,.58,.57,1)`);

		$canvas.ontransitionend = () => {
			$canvas.ontransitionend = null;
			$canvas.style.setProperty("transition", "");
			$canvas.style.setProperty("top", `${this.state.moveCurrentGridPos.y}px`);
			$canvas.style.setProperty("left", `${this.state.moveCurrentGridPos.x}px`);
			$canvas.style.setProperty("transform", `scale(${newScale})`);
		};
	}

	private renderWinPopup(onClose: () => void): void {

		const popupComponent: PopupComponent = new PopupComponent(
			this.$root,
			{
				title: "That's the way!",
				message: "Time: " + getFormatedTime(this.props.game.getElapsedSeconds()),
				isMessageOpaque: true,
				isMessageBold: true,
				buttonText1: "Got it!",
				onClose
			}
		);

		popupComponent.render();
	}

	private renderStartNewGameButton = (): void => {

		const $bottomButtons: HTMLDivElement = document.createElement("div");
		$bottomButtons.className = styles.bottom_buttons;
		$bottomButtons.style.setProperty("--height-factor", this.BOTTOM_BUTTONS_HEIGHT_FACTOR.toString());

		const $startNewGame: HTMLButtonElement = document.createElement("button");
		$startNewGame.className = styles.start_new_game;
		$startNewGame.classList.add(styles.text_button);
		$startNewGame.innerText = "Start new game";
		$startNewGame.onclick = this.props.renderStartNewGame;

		$bottomButtons.appendChild($startNewGame);

		this.$root.appendChild($bottomButtons);
	}

	private handleWonGame(): void {

		this.props.game.endGame();

		this.props.renderMinesCounter(this.props.game);

		this.displayActionToggle(true);

		this.renderWinPopup(() => {
			this.state.gameCanvas.revealMines();

			setTimeout(() => {
				this.state.canDrag = false;
				this.zoomOutCanvas(this.END_GAME_ZOOM_OUT_DURATION);

				setTimeout(() => {
					this.state.canDrag = true;
					this.renderStartNewGameButton();
				}, this.END_GAME_ZOOM_OUT_DURATION);
			}, 200);
		});

		const game: Minesweeper = this.props.game;

		saveTimeRecord(game.difficulty, game.getElapsedSeconds());
		deleteSavedGame(game.difficulty);
	}

	private handleLostGame(dugMinePos: GridCellPosition): void {

		this.props.game.endGame();

		this.state.gameCanvas.revealMines(
			dugMinePos,
			() => {
				if (this.state.settings.vibration) {
					navigator.vibrate(this.state.settings.vibrationIntensity);
				}
			}
		);

		this.displayActionToggle(true);

		setTimeout(() => {
			this.state.canDrag = false;
			this.zoomOutCanvas(this.END_GAME_ZOOM_OUT_DURATION);

			setTimeout(() => {
				this.state.canDrag = true;
				this.renderStartNewGameButton();
			}, this.END_GAME_ZOOM_OUT_DURATION);
		}, 400);

		deleteSavedGame(this.props.game.difficulty);
	}

	private handleMarkCell = (cellPos: GridCellPosition): void => {

		if (this.props.game.hasStarted() === false) {
			return;
		}

		const game: Minesweeper = this.props.game;

		const isMarked: boolean = game.grid[cellPos.row][cellPos.col].isMarked;

		const returnCode = isMarked
			? game.unmarkCell(cellPos)
			: game.markCell(cellPos);

		if (returnCode === MinesweeperReturnCode.SUCCESS ||
		    returnCode === MinesweeperReturnCode.HAS_WON) {

			this.props.renderMinesCounter(game);

			saveGame(game);

			if (isMarked) {
				this.state.gameCanvas.unmarkCell(cellPos);
			} else {
				this.state.gameCanvas.markCell(cellPos);
			}

			if (returnCode === MinesweeperReturnCode.HAS_WON) {
				this.handleWonGame();
			}
		}
	}

	private resumeSavedGame(): void {

		const game: Minesweeper = this.props.game;
		const gameCanvas: GameCanvasComponent = this.state.gameCanvas;

		const dugCellsToRender: GridCellPosition[] = [];
		const markedCellsToRender: GridCellPosition[] = [];

		for (let row = 0; row < game.grid.length; ++row) {
			for (let col = 0; col < game.grid[0].length; ++col) {

				if (game.grid[row][col].isDug) {
					dugCellsToRender.push({row, col});
					continue;
				}

				if (game.grid[row][col].isMarked) {
					markedCellsToRender.push({row, col});
					continue;
				}
			}
		}

		gameCanvas.digCells(game.firstDugCellPos!, dugCellsToRender, () => {
			for (let i = 0; i < markedCellsToRender.length; ++i) {
				gameCanvas.markCell(markedCellsToRender[i]);
			}
		});

		setTimeout(() => {
			game.resumeGame();
			this.props.renderTimeElapsed(game);
		}, 1000);
	}

	private handleDigCell = (cellPos: GridCellPosition): void => {

		if (this.domElements === null) {
			return;
		}

		const game: Minesweeper = this.props.game;
		const gameCanvas: GameCanvasComponent = this.state.gameCanvas;

		const [dugCells, _, returnCode] = game.digCell(cellPos);

		if (returnCode === MinesweeperReturnCode.MINES_CHANGED) {
			gameCanvas.updateGrid();
		}

		if (returnCode === MinesweeperReturnCode.DUG_MINE) {
			this.handleLostGame(cellPos);
			return;
		}

		if (returnCode === MinesweeperReturnCode.SUCCESS ||
			returnCode === MinesweeperReturnCode.HAS_WON ||
		    returnCode === MinesweeperReturnCode.MINES_CHANGED) {

			gameCanvas.digCells(cellPos, dugCells!);

			saveGame(game);

			if (returnCode === MinesweeperReturnCode.HAS_WON) {
				this.handleWonGame();
			}
		}
	}

	private handleEasyDigging(cellPos: GridCellPosition): void {

		const grid: GridCell[][] = this.props.game.grid;

		const cellsToDig: GridCellPosition[] = [];
		let markedCellsCount: number = 0;

		for (let i = 0; i < eightDirections.length; ++i) {

			const nextCol: number = cellPos.col + eightDirections[i][0];
			const nextRow: number = cellPos.row + eightDirections[i][1];

			if (!this.props.game.checkWithinGrid({row: nextRow, col: nextCol})) {
				continue;
			}

			if (grid[nextRow][nextCol].isMarked) {
				markedCellsCount++;
				continue;
			}

			if (!grid[nextRow][nextCol].isDug) {
				cellsToDig.push({row: nextRow, col: nextCol});
			}
		}

		if (markedCellsCount !== grid[cellPos.row][cellPos.col].minesAround) {
			return;
		}

		for (let i = 0; i < cellsToDig.length; ++i) {
			this.handleDigCell(cellsToDig[i]);
		}
	}
}
