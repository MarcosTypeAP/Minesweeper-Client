import Minesweeper, {GridCell, GridCellPosition} from "../models/Minesweeper";
import {getSettings} from "../models/Settings";
import {easeOutBack, easeOutQuart} from "../timingFunctions";
import styles from "./GameCanvas.module.css";

const colors: Hex6Colors = {
	background: "#1B1B1B",
	foreground: "#C7C392",
	foregroundAlt: "#9F9C77",
	cellsSeparator: "#582F56",
	cellsNormal: "#B53462",
	cellsMarked: "#61624F",
	dugMineBackground: "#D13434",
}

enum AnimationID {
	NONE = -1,
	GROW,
	ADAPT,
	SHOW_MINE,
	DUG_MINE,
};

// CSS order (0 = up)
type EightBooleans = [
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean
];

enum CellState {
	NONE = -1,
	DUG,
	MARKED
};

type CanvasGridCell = {
	row: number;
	col: number;

	isMine: boolean;
	minesAround: number;

	state: CellState;
	prevState: CellState;

	runningAnimation: AnimationID;
	animationTimeElapsed: number;
	isAnimationReverse: boolean;

	hasSameCell: EightBooleans;
	isExpandedTo: EightBooleans;

	endAnimationCallback: (() => void) | null;
};

type CanvasGrid = CanvasGridCell[][];

type CellDirection = [-1 | 0 | 1, -1 | 0 | 1];

type FourDirections = [CellDirection, CellDirection, CellDirection, CellDirection];

export type EightDirections = [
	CellDirection, CellDirection, CellDirection, CellDirection,
	CellDirection, CellDirection, CellDirection, CellDirection
];

type CellCorners = [number, number, number, number];

// CSS order (0 = up)
const fourDirections: FourDirections = [
	// x,y
	[0, -1], // up
	[1, 0],  // right
	[0, 1],  // down
	[-1, 0]  // left
];

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

type GameCanvasDOMElements = {
	canvas: HTMLCanvasElement;
};

type GameCanvasState = {
	grid: CanvasGrid;
	ctx: CanvasRenderingContext2D | null;
	shouldStopMainLoop: boolean;
	animationFrameID: number;
	isMouseEnabled: boolean;
	dugMine: CanvasGridCell | null;
	shouldTapToBeginFade: boolean;
	tapToBeginAnimationTimeElapsed: number;
	tapToBeginAnimationDuration: number;
	areMinesRevelated: boolean;
	settings: GameSettings
}

type GameCanvasProps = {
	game: Minesweeper;
	onClick: (row: number, col: number, button: number) => void;
	onLowFps: (minFps: number) => void;
};

export default class GameCanvasComponent implements Component {

	private $root: HTMLElement;

	private props: GameCanvasProps;

	private domElements: GameCanvasDOMElements | null;

	private state: GameCanvasState;

	POINTER_MOVING_THRESHOLD = window.innerWidth * 0.05;

	rows: number;
	cols: number;

	constructor(root: HTMLElement, props: GameCanvasProps) {

		this.rows = props.game.rows;
		this.cols = props.game.cols;

		this.$root = root;
		this.props = props;
		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): GameCanvasState {

		return {
			grid: this.initGrid(),
			ctx: null,
			shouldStopMainLoop: true,
			animationFrameID: -1,
			isMouseEnabled: true,
			dugMine: null,
			shouldTapToBeginFade: false,
			tapToBeginAnimationTimeElapsed: 0,
			tapToBeginAnimationDuration: 0,
			areMinesRevelated: false,
			settings: getSettings(),
		};
	}

	render(): void {

		this.clean();

		setNewCellSize(this.state.settings.resolution);

		this.refreshColors();

		const $canvas: HTMLCanvasElement = document.createElement("canvas");
		$canvas.className = styles.canvas;
		$canvas.height = this.rows * cellsSizeNormal;
		$canvas.width = this.cols * cellsSizeNormal;
		$canvas.style.setProperty("--rows-cols-ratio", (this.rows / this.cols).toString());

		this.$root.appendChild($canvas);

		this.state.ctx = $canvas.getContext("2d")!;

		this.domElements = {
			canvas: $canvas
		};

		this.initControls()
	}

	clean(): void {

		this.stopDrawingLoop();
		this.state = this.getInitState();
		
		this.$root.innerHTML = "";
		this.$root.className = "";
	}

	getCanvas(): HTMLCanvasElement | null {

		return this.domElements?.canvas ?? null;
	}

	refreshColors(): void {

		const rootStyles = getComputedStyle(document.querySelector(":root")!);

		colors.background = rootStyles.getPropertyValue("--color-background");
		colors.foreground = rootStyles.getPropertyValue("--color-foreground");
		colors.foregroundAlt = rootStyles.getPropertyValue("--color-foreground-alt");
		colors.cellsSeparator = rootStyles.getPropertyValue("--color-cells-separator");
		colors.cellsNormal = rootStyles.getPropertyValue("--color-cells-normal");
		colors.cellsMarked = rootStyles.getPropertyValue("--color-cells-marked");
		colors.dugMineBackground = rootStyles.getPropertyValue("--color-dug-mine-background");
	}

	startGame(animationDuration: number): void {

		this.state.tapToBeginAnimationDuration = animationDuration;
		this.state.shouldTapToBeginFade = true;
	}

	private initControls(): void {

		if (!this.domElements) {
			return;
		}

		const $canvas: HTMLCanvasElement = this.domElements.canvas;

		let lastPointerDownTimeoutID: number = -1;
		let wasLastClickButton2: boolean = false;

		const handleClick = (event: MouseEvent, button: number): void => {

			if (!$canvas.parentNode) {
				$canvas.removeEventListener('pointerup', handlePointerUp);
				$canvas.removeEventListener('pointerdown', handlePointerDown);
				return;
			}

			const canvasRect: DOMRect = $canvas.getBoundingClientRect();

			const mouseX: number = event.clientX - canvasRect.x;
			const mouseY: number = event.clientY - canvasRect.y;

			if (mouseX >= canvasRect.width || mouseX < 0) {
				return;
			}

			if (mouseY >= canvasRect.height || mouseY < 0) {
				return;
			}

			const cellsSize: number = canvasRect.width / this.cols;

			const row: number = Math.floor(mouseY / cellsSize);
			const col: number = Math.floor(mouseX / cellsSize);

			this.props.onClick(row, col, button);
		}

		const handlePointerDown = (event: PointerEvent): void => {

			clearTimeout(lastPointerDownTimeoutID);

			lastPointerDownTimeoutID = window.setTimeout(() => {
				handleClick(event, 2);
				wasLastClickButton2 = true;
			}, this.state.settings.longTapDelay)
		}

		$canvas.addEventListener("pointerdown", handlePointerDown);

		const handlePointerUp = (event: PointerEvent): void => {

			clearTimeout(lastPointerDownTimeoutID);
			lastPointerDownTimeoutID = -1;

			if (wasLastClickButton2) {
				wasLastClickButton2 = false;
				return;
			}

			handleClick(event, event.button);
		};

		$canvas.addEventListener("pointerup", handlePointerUp);

		$canvas.addEventListener("contextmenu", (event: MouseEvent) => {
			event.preventDefault();
		})
	}

	updateGrid(): void {

		const gameCells: GridCell[][] = this.props.game.grid;
		const grid: CanvasGrid = this.state.grid;

		for (let row = 0; row < this.rows; ++row) {
			for (let col = 0; col < this.cols; ++col) {

				grid[row][col].isMine = gameCells[row][col].isMine;
				grid[row][col].minesAround = gameCells[row][col].minesAround;
			}
		}
	}

	private initGrid(): CanvasGrid {

		const grid: CanvasGrid = [];

		for (let row = 0; row < this.rows; ++row) {

			grid.push(new Array(this.cols).fill(null));
		}

		const gameCells: GridCell[][] = this.props.game.grid;

		for (let row = 0; row < this.rows; ++row) {
			for (let col = 0; col < this.cols; ++col) {

				const cell: CanvasGridCell = {
					row,
					col,
					isMine: gameCells[row][col].isMine,
					minesAround: gameCells[row][col].minesAround,
					state: CellState.NONE,
					prevState: CellState.NONE,
					runningAnimation: AnimationID.NONE,
					animationTimeElapsed: 0,
					isAnimationReverse: false,
					hasSameCell: [true, true, true, true, true, true, true, true],
					isExpandedTo: [false, false, false, false, false, false, false, false],
					endAnimationCallback: null,
				};

				if (row === 0 || row === this.rows - 1 ||
					col === 0 || col === this.cols - 1) {

					const lastRow: number = this.rows - 1;
					const lastCol: number = this.cols - 1;

					cell.hasSameCell = [
						row > 0,
						row > 0 && col < lastCol,
						col < lastCol,
						row < lastRow && col < lastCol,
						row < lastRow,
						row < lastRow && col > 0,
						col > 0,
						row > 0 && col > 0
					];
				}

				grid[row][col] = cell;
			}
		}

		return grid;
	}

	startDrawingLoop(): void {

		if (!this.state.ctx) {
			return;
		}

		if (!this.domElements) {
			return;
		}

		this.state.shouldStopMainLoop = false;

		let lowFpsTimesCounter: number = 0;

		let isFirstDraw: boolean = true;

		const ctx: CanvasRenderingContext2D = this.state.ctx;
		const grid: CanvasGrid = this.state.grid;

		const rows: number = this.rows;
		const cols: number = this.cols;

		const canvasWidth: number = this.domElements.canvas.width;
		const canvasHeight: number = this.domElements.canvas.height;

		const frameDuration: number = 1000 / FIXED_UPDATE_FPS;

		let lastFrameTime: number = -1;
		let deltaTime: number = 0;
		let accumulatedTime: number = 0;

		const mainLoop = (timestamp: DOMHighResTimeStamp): void => {

			if (this.state.shouldStopMainLoop) {
				cancelAnimationFrame(this.state.animationFrameID);
				return;
			}

			deltaTime = timestamp - lastFrameTime;
			lastFrameTime = timestamp;

			accumulatedTime += deltaTime;

			if (accumulatedTime > frameDuration) {
				accumulatedTime -= frameDuration;

				// fixed fps
			}

			this.draw(ctx, canvasWidth, canvasHeight, grid, rows, cols, isFirstDraw, deltaTime);
			isFirstDraw = false;

			this.state.animationFrameID = requestAnimationFrame(mainLoop);

			const MIN_FPS = 30;

			if (1000 / deltaTime < MIN_FPS) {
				lowFpsTimesCounter++;
			}

			if (lowFpsTimesCounter >= 5) {
				this.props.onLowFps(Math.round(1000 / deltaTime));
				lowFpsTimesCounter = 0;
			}
		}

		requestAnimationFrame(mainLoop);
	}

	private drawTapToBegin(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, opacity: number): void {

		const fontSize: number = canvasHeight * 0.05;

		const hexColor: string = colors.background;

		ctx.fillStyle = (
			"rgba(" +
				parseInt(hexColor.substring(1, 3), 16) + ", " +
				parseInt(hexColor.substring(3, 5), 16) + ", " +
				parseInt(hexColor.substring(5, 7), 16) + ", " +
				opacity +
			")"
		);
		ctx.font = `${fontSize}px Rubik`;
		ctx.fillText(
			"Tap to begin.",
			(canvasWidth / 2) - (fontSize * 2.8),
			(canvasHeight / 2) + (fontSize / 3)
		);
	}

	private draw(
		ctx: CanvasRenderingContext2D,
		canvasWidth: number,
		canvasHeight: number,
		grid: CanvasGrid,
		rows: number,
		cols: number,
		isFirstDraw: boolean,
		deltaTime: number
	): void {

		if (isFirstDraw) {
			ctx.fillStyle = colors.cellsNormal;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			this.drawTapToBegin(ctx, canvasWidth, canvasHeight, 1);
		}

		drawCells(ctx, grid, rows, cols, deltaTime);

		if (this.state.shouldTapToBeginFade) {
			const timeElapsed: number = this.state.tapToBeginAnimationTimeElapsed += deltaTime;
			let progress: number = 1 - (timeElapsed / this.state.tapToBeginAnimationDuration);

			if (progress < 0) {
				progress = 0;
				this.state.tapToBeginAnimationTimeElapsed = 0;
				this.state.shouldTapToBeginFade = false;
			}

			ctx.fillStyle = colors.cellsNormal;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			this.drawTapToBegin(ctx, canvasWidth, canvasHeight, progress);
		}

		// this.drawGridLines(ctx);
	}

	private drawGridLines(ctx: CanvasRenderingContext2D): void {

		ctx.strokeStyle = "#AAA";
		ctx.lineWidth = 1;

		for (let row = 0; row < this.rows + 1; ++row) {

			ctx.beginPath();
			ctx.moveTo(0, row * cellsSizeNormal);
			ctx.lineTo(this.cols * cellsSizeNormal, row * cellsSizeNormal)
			ctx.stroke();
		}

		for (let col = 0; col < this.cols + 1; ++col) {

			ctx.beginPath();
			ctx.moveTo(col * cellsSizeNormal, 0);
			ctx.lineTo(col * cellsSizeNormal, this.rows * cellsSizeNormal)
			ctx.stroke();
		}
	}

	makeFullRedraw(): void {

		if (!this.domElements) {
			return;
		}

		const ctx: CanvasRenderingContext2D | null = this.state.ctx;

		if (!ctx) {
			return;
		}

		const $canvas: HTMLCanvasElement = this.domElements.canvas;

		ctx.fillStyle = colors.cellsNormal;
		ctx.fillRect(0, 0, $canvas.width, $canvas.height);

		const dugMine: CanvasGridCell | null = this.state.dugMine;

		const grid: CanvasGrid = this.state.grid;

		for (let row = 0; row < this.rows; ++row) {
			for (let col = 0; col < this.cols; ++col) {

				const cell: CanvasGridCell = grid[row][col];

				if (cell.state === CellState.DUG) {
					cell.runningAnimation = AnimationID.ADAPT;
					cell.animationTimeElapsed = ANIMATION_DURATION_NORMAL;
					continue;
				}

				if (cell.isMine && dugMine) {
					cell.runningAnimation = cell === dugMine
						? AnimationID.DUG_MINE
						: AnimationID.SHOW_MINE;
					cell.animationTimeElapsed = ANIMATION_DURATION_MINE;
					continue;
				}

				if (cell.state === CellState.MARKED) {
					cell.runningAnimation = AnimationID.ADAPT;
					cell.animationTimeElapsed = ANIMATION_DURATION_NORMAL;
					continue;
				}
			}
		}
	}

	stopDrawingLoop(): void {

		cancelAnimationFrame(this.state.animationFrameID);
		this.state.shouldStopMainLoop = true;
	}

	digCell(cellPos: GridCellPosition): void {

		const grid: CanvasGrid = this.state.grid;
		const cell: CanvasGridCell = grid[cellPos.row][cellPos.col];

		cell.prevState = cell.state;
		cell.state = CellState.DUG;

		cell.runningAnimation = AnimationID.GROW;
		cell.animationTimeElapsed = 0;
		cell.isAnimationReverse = false;

		cell.endAnimationCallback = () => {

			adaptToCellsAround(grid, cell, this.state.areMinesRevelated, true);
			adaptSurroundingCells(grid, cell, this.state.areMinesRevelated, true);

			cell.endAnimationCallback = null;
		};
	}

	digCells(firstCellPos: GridCellPosition, cellsPos: GridCellPosition[], onAnimationEnd?: () => void): void {

		if (cellsPos.length === 1) {
			this.digCell(firstCellPos);
			return;
		}

		const firstCellRow: number = firstCellPos.row;
		const firstCellCol: number = firstCellPos.col;

		let largestDistance: number = 0;

		const grid: CanvasGrid = this.state.grid;

		for (let i = 0; i < cellsPos.length; ++i) {

			const row: number = cellsPos[i].row;
			const col: number = cellsPos[i].col;

			const cell: CanvasGridCell = grid[row][col];

			const distanceFromDugCell: number = Math.sqrt(
				(firstCellRow - row) ** 2 + (firstCellCol - col) ** 2
			);

			if (distanceFromDugCell > largestDistance) {
				largestDistance = distanceFromDugCell;
			}

			cell.prevState = cell.state;
			cell.state = CellState.DUG;

			setTimeout(() => {

				cell.runningAnimation = AnimationID.GROW;
				cell.animationTimeElapsed = 0;
				cell.isAnimationReverse = false;

				cell.endAnimationCallback = () => {
					setTimeout(() => {
						adaptToCellsAround(grid, cell, this.state.areMinesRevelated, true);
						adaptSurroundingCells(grid, cell, this.state.areMinesRevelated, true);

					}, distanceFromDugCell * ANIMATION_DELAY_MANY);

					cell.endAnimationCallback = null;
				};

			}, distanceFromDugCell * ANIMATION_TIME_BETWEEN_CELLS);
		}

		if (onAnimationEnd) {
			setTimeout(onAnimationEnd, largestDistance * ANIMATION_TIME_BETWEEN_CELLS);
		}
	}

	markCell(cellPos: GridCellPosition): void {

		const grid: CanvasGrid = this.state.grid;
		const cell: CanvasGridCell = grid[cellPos.row][cellPos.col];

		cell.prevState = cell.state;
		cell.state = CellState.MARKED;

		cell.runningAnimation = AnimationID.GROW;
		cell.animationTimeElapsed = 0;
		cell.isAnimationReverse = false;

		cell.endAnimationCallback = () => {

			adaptToCellsAround(grid, cell, this.state.areMinesRevelated, true);
			adaptSurroundingCells(grid, cell, this.state.areMinesRevelated, true);

			cell.endAnimationCallback = null;
		};
	}

	unmarkCell(cellPos: GridCellPosition): void {

		const cell: CanvasGridCell = this.state.grid[cellPos.row][cellPos.col];
		const grid: CanvasGrid = this.state.grid;

		cell.prevState = cell.state;
		cell.state = CellState.NONE;

		cell.runningAnimation = AnimationID.GROW;
		cell.animationTimeElapsed = 0;
		cell.isAnimationReverse = true;

		adaptSurroundingCells(grid, cell, this.state.areMinesRevelated, true);
	}

	revealMines(dugCellPos: GridCellPosition | null = null, displayMineCallback?: () => void): void {

		this.state.areMinesRevelated = true;

		const mines: GridCellPosition[] = this.props.game.minePositions;
		const grid: CanvasGrid = this.state.grid;

		let startRow: number = Math.floor(grid.length / 2);
		let startCol: number = Math.floor(grid[0].length / 2);

		if (dugCellPos) {
			this.state.dugMine = grid[dugCellPos.row][dugCellPos.col];

			startRow = dugCellPos.row;
			startCol = dugCellPos.col;

			const dugMine: CanvasGridCell = grid[startRow][startCol];

			dugMine.runningAnimation = AnimationID.DUG_MINE;
			dugMine.animationTimeElapsed = 0;
			dugMine.isAnimationReverse = false;

			adaptSurroundingCells(grid, dugMine, this.state.areMinesRevelated, true);
		}

		for (let i = 0; i < mines.length; ++i) {
			const mineRow: number = mines[i].row;
			const mineCol: number = mines[i].col;

			if (dugCellPos) {
				if (mineRow === startRow && mineCol === startCol) {
					continue;
				}
			}

			const mine: CanvasGridCell = grid[mineRow][mineCol];

			const distanceFromDugCell: number = Math.sqrt(
				(startRow - mineRow) ** 2 + (startCol - mineCol) ** 2
			);

			setTimeout(() => {
				mine.runningAnimation = AnimationID.SHOW_MINE;
				mine.animationTimeElapsed = 0;
				mine.isAnimationReverse = false;

				adaptSurroundingCells(grid, mine, this.state.areMinesRevelated, true);

				displayMineCallback && displayMineCallback();

			}, distanceFromDugCell * ANIMATION_TIME_BETWEEN_CELLS);
		}
	}
}

const FIXED_UPDATE_FPS = 60;

const ANIMATION_DURATION_NORMAL = 400;
const ANIMATION_DELAY_MANY = 100;
const ANIMATION_TIME_BETWEEN_CELLS = 150;
const ANIMATION_DURATION_MINE = 400;

const CELLS_SHRUNKEN_FACTOR = 0.8;
const CELLS_BORDER_RADIUS_FACTOR = 0.1;
const CELLS_SVG_FACTOR = 0.5;
const CELLS_MINES_AROUND_FACTOR = 0.35;

let cellsSizeNormal = 100;

let cellsSizeShrunken = cellsSizeNormal * CELLS_SHRUNKEN_FACTOR;
let cellsSizeDiff = cellsSizeNormal - cellsSizeShrunken;

let cellsSideNormal = cellsSizeNormal * 0.5;
let cellsSideShrunken = cellsSideNormal * CELLS_SHRUNKEN_FACTOR;
let cellsSideDiff = cellsSideNormal - cellsSideShrunken;

let cellsBorderRadius = cellsSizeNormal * CELLS_BORDER_RADIUS_FACTOR;

let cellsSvgWidth = cellsSizeNormal * CELLS_SVG_FACTOR;

let cellsMinesAroundSize = cellsSizeNormal * CELLS_MINES_AROUND_FACTOR;

const FLAG_SVG_D = "m14.303 6-3-2H6V2H4v20h2v-8h4.697l3 2H20V6z";
const FLAG_SVG_HEIGHT = 24;
const FLAG_SVG_WIDTH = 24;
const flagSvgD: Path2D = new Path2D(FLAG_SVG_D);

const MINE_SVG_D = "M39.08125,56.36069L32.44826,49.7277c-1.40935-1.40935-1.39544-3.70827.03108-5.13478L44.53301,32.53925c1.42651-1.42651,3.72543-1.44043,5.13478-.03108l6.62318,6.62318c8.38457-6.03149,18.06602-10.37336,28.54585-12.52712v-12.2785c0-2.54291,2.03663-4.60434,4.54895-4.60434h21.22844c2.51232,0,4.54895,2.06143,4.54895,4.60434v12.2785c10.41295,2.14001,20.03766,6.44029,28.38514,12.41183l6.5804-6.5804c1.42651-1.42651,3.72543-1.44043,5.13478-.03108l11.90865,11.90865c1.40935,1.40935,1.39544,3.70827-.03108,5.13478l-6.51192,6.51192c6.12041,8.41134,10.53305,18.14527,12.72845,28.69228h12.18745c2.51232,0,4.54895,2.06143,4.54895,4.60434v21.48692c0,2.54291-2.03663,4.60434-4.54895,4.60434h-12.18745c-2.1671,10.41108-6.49467,20.0299-12.49267,28.36641l6.41081,6.41081c1.40935,1.40935,1.39544,3.70827-.03108,5.13478l-12.05367,12.05367c-1.42651,1.42651-3.72543,1.44043-5.13478.03108l-6.42208-6.42208c-8.36731,6.00351-18.0223,10.32596-28.47095,12.4733v12.2785c0,2.54291-2.03663,4.60434-4.54895,4.60434h-21.22844c-2.51232,0-4.54895-2.06143-4.54895-4.60434v-12.2785c-10.51552-2.16109-20.22721-6.52522-28.63146-12.58879l-6.61009,6.61009c-1.42651,1.42651-3.72543,1.44043-5.13478.03108L32.55184,155.53951c-1.40935-1.40935-1.39544-3.70827.03108-5.13478l6.61009-6.61009c-6.02807-8.35505-10.37654-18.00225-12.55061-28.44683h-12.18745c-2.51232,0-4.54895-2.06143-4.54895-4.60434v-21.48692c0-2.54291,2.03663-4.60434,4.54895-4.60434h12.18745C28.80301,74.27229,33.11118,64.6799,39.08124,56.3607l.00001-.00001Zm71.53297,58.98711c2.51232,0,4.54895-2.06143,4.54895-4.60434v-21.48692c0-2.54291-2.03663-4.60434-4.54895-4.60434h-21.22844c-2.51232,0-4.54895,2.06143-4.54895,4.60434v21.48692c0,2.54291,2.03663,4.60434,4.54895,4.60434h21.22844Z";
const MINE_SVG_HEIGHT = 200;
const MINE_SVG_WIDTH = 200;
const mineSvgD: Path2D = new Path2D(MINE_SVG_D);

function setNewCellSize(newSize: number): void {
	cellsSizeNormal = newSize;

	cellsSizeShrunken = cellsSizeNormal * CELLS_SHRUNKEN_FACTOR;
	cellsSizeDiff = cellsSizeNormal - cellsSizeShrunken;

	cellsSideNormal = cellsSizeNormal * 0.5;
	cellsSideShrunken = cellsSideNormal * CELLS_SHRUNKEN_FACTOR;
	cellsSideDiff = cellsSideNormal - cellsSideShrunken;

	cellsBorderRadius = cellsSizeNormal * CELLS_BORDER_RADIUS_FACTOR;
	cellsSvgWidth = cellsSizeNormal * CELLS_SVG_FACTOR;

	cellsMinesAroundSize = cellsSizeNormal * CELLS_MINES_AROUND_FACTOR;
}

function drawCells(ctx: CanvasRenderingContext2D, grid: CanvasGrid, rows: number, cols: number, deltaTime: number): void {
	for (let row = 0; row < rows; ++row) {
		for (let col = 0; col < cols; ++col) {

			const cell: CanvasGridCell = grid[row][col];

			switch (cell.runningAnimation) {
				case AnimationID.GROW:
					animationGrow(ctx, deltaTime, cell);
					continue;

				case AnimationID.ADAPT:
					animationAdapt(ctx, deltaTime, cell);
					continue;

				case AnimationID.SHOW_MINE:
					animationSpawnMine(ctx, deltaTime, cell, false);
					continue;

				case AnimationID.DUG_MINE:
					animationSpawnMine(ctx, deltaTime, cell, true);
					continue;
			}
		}
	}
}

function adaptToCellsAround(grid: CanvasGrid, cell: CanvasGridCell, areMinesRevelated: boolean, animate: boolean): void {

	const rows: number = grid.length;
	const cols: number = grid[0].length;

	const hasSameCellInDirection: EightBooleans = [true, true, true, true, true, true, true, true];

	const cellState: CellState = cell.state;

	if (cellState === CellState.NONE) {
		return;
	}

	const row: number = cell.row;
	const col: number = cell.col;

	for (let i = 0; i < eightDirections.length; ++i) {

		const nextRow: number = row + eightDirections[i][1];

		if (nextRow < 0 || nextRow >= rows) {
			hasSameCellInDirection[i] = false;
			continue;
		}

		const nextCol: number = col + eightDirections[i][0];

		if (nextCol < 0 || nextCol >= cols) {
			hasSameCellInDirection[i] = false;
			continue;
		}

		const nextCell: CanvasGridCell = grid[nextRow][nextCol];

		if (cellState === CellState.MARKED && areMinesRevelated && nextCell.isMine) {
			hasSameCellInDirection[i] = false;
			continue;
		}

		if (cellState === CellState.DUG && nextCell.state === CellState.DUG) {
			hasSameCellInDirection[i] = true;
			continue;
		}

		if (cellState === CellState.MARKED && nextCell.state === CellState.MARKED) {
			hasSameCellInDirection[i] = true;
			continue;
		}

		hasSameCellInDirection[i] = false;
	}

	const hasSameCell: EightBooleans = cell.hasSameCell;

	for (let i = 0; i < hasSameCellInDirection.length; ++i) {

		hasSameCell[i] = hasSameCellInDirection[i];
	}

	if (!animate) {
		return;
	}

	if (cell.animationTimeElapsed > 0) {
		return;
	}

	cell.animationTimeElapsed = 0;
	cell.runningAnimation = AnimationID.ADAPT;
}

function adaptSurroundingCells(grid: CanvasGrid, cell: CanvasGridCell, areMinesRevelated: boolean, animate: boolean): void {

	const rows: number = grid.length;
	const cols: number = grid[0].length;

	const row: number = cell.row;
	const col: number = cell.col;

	for (let i = 0; i < eightDirections.length; ++i) {

		const nextRow: number = row + eightDirections[i][1];

		if (nextRow < 0 || nextRow >= rows) {
			continue;
		}

		const nextCol: number = col + eightDirections[i][0];

		if (nextCol < 0 || nextCol >= cols) {
			continue;
		}

		adaptToCellsAround(grid, grid[nextRow][nextCol], areMinesRevelated, animate);
	}
}

function drawSVGOnCell(
	ctx: CanvasRenderingContext2D,
	cell: CanvasGridCell,
	path: Path2D,
	height: number,
	width: number,
	color: string,
	scale: number,
	shake: number,
): void {

	const svgScale: number = (cellsSvgWidth / width) * scale;

	let shakeX: number = 0;
	let shakeY: number = 0;

	if (shake) {
		const shakeSize: number = cellsSizeNormal * 0.1;
		const c1: number = 12.6;

		if (shake < 0.5) {
			shakeX = shakeSize * Math.sin(shake * c1);
		} else {
			shakeY = shakeSize * Math.sin(shake * c1);
		}
	}

	const svgHeight: number = height * svgScale;
	const svgWidth: number = width * svgScale;
	
	const svgMarginTop: number = (cellsSizeNormal - svgHeight) / 2;
	const svgMarginLeft: number = (cellsSizeNormal - svgWidth) / 2;

	ctx.fillStyle = color;
	ctx.translate(
		cell.col * cellsSizeNormal + shakeX + svgMarginLeft,
		cell.row * cellsSizeNormal + shakeY + svgMarginTop
	);
	ctx.scale(svgScale, svgScale);
	ctx.fill(path);

	// reset scale and transform
	ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawTextOnCell(ctx: CanvasRenderingContext2D, cell: CanvasGridCell, text: string, color: string, scale: number) {

	const fontSize: number = cellsMinesAroundSize * scale;

	ctx.fillStyle = color;
	ctx.font = `${fontSize}px Rubik`;
	ctx.fillText(
		text,
		cell.col * cellsSizeNormal + (cellsSizeNormal / 2) - (fontSize / 4),
		cell.row * cellsSizeNormal + (cellsSizeNormal / 2) + (fontSize / 3),
	);
}

function animationSpawnMine(ctx: CanvasRenderingContext2D, deltaTime: number, cell: CanvasGridCell, isDugMine: boolean): void {

	const cellState: CellState = cell.state;

	const timeElapsed: number = cell.animationTimeElapsed = cell.animationTimeElapsed + deltaTime;

	let progress: number = easeOutBack(timeElapsed / ANIMATION_DURATION_MINE);

	if (timeElapsed >= ANIMATION_DURATION_MINE) {
		progress = 1;
		cell.runningAnimation = AnimationID.NONE;
		cell.animationTimeElapsed = 0;
	}

	if (cellState === CellState.NONE) {
		ctx.fillStyle = colors.cellsNormal;
		ctx.fillRect(
			cell.col * cellsSizeNormal,
			cell.row * cellsSizeNormal,
			cellsSizeNormal,
			cellsSizeNormal
		);

		if (isDugMine) {
			ctx.fillStyle = colors.dugMineBackground;
			ctx.beginPath();
			ctx.roundRect(
				cell.col * cellsSizeNormal + cellsSideDiff,
				cell.row * cellsSizeNormal + cellsSideDiff,
				cellsSizeShrunken,
				cellsSizeShrunken,
				cellsBorderRadius
			);
			ctx.fill();
		}

		drawSVGOnCell(ctx, cell, mineSvgD, MINE_SVG_HEIGHT, MINE_SVG_WIDTH, colors.background, 1, progress);

		return;
	}

	if (cellState === CellState.MARKED) {
		ctx.fillStyle = colors.cellsNormal;
		ctx.fillRect(
			cell.col * cellsSizeNormal,
			cell.row * cellsSizeNormal,
			cellsSizeNormal,
			cellsSizeNormal
		);

		ctx.fillStyle = colors.cellsMarked;
		ctx.beginPath();
		ctx.roundRect(
			cell.col * cellsSizeNormal + cellsSideDiff,
			cell.row * cellsSizeNormal + cellsSideDiff,
			cellsSizeShrunken,
			cellsSizeShrunken,
			cellsBorderRadius
		);
		ctx.fill();

		drawSVGOnCell(ctx, cell, mineSvgD, MINE_SVG_HEIGHT, MINE_SVG_WIDTH, colors.background, 1, progress);

		return;
	}
}

function animationGrow(ctx: CanvasRenderingContext2D, deltaTime: number, cell: CanvasGridCell): void {

	const isReverse: boolean = cell.isAnimationReverse;
	
	const timeElapsed: number = cell.animationTimeElapsed = cell.animationTimeElapsed + deltaTime;

	let progress: number = isReverse
		? 1 - easeOutQuart(timeElapsed / ANIMATION_DURATION_NORMAL)
		: easeOutBack(timeElapsed / ANIMATION_DURATION_NORMAL);

	if (timeElapsed >= ANIMATION_DURATION_NORMAL) {
		progress = isReverse ? 0 : 1;
		cell.runningAnimation = AnimationID.NONE;
		cell.animationTimeElapsed = 0;

		cell.endAnimationCallback && cell.endAnimationCallback();
	}

	const positionX: number = cell.col * cellsSizeNormal;
	const positionY: number = cell.row * cellsSizeNormal;

	ctx.fillStyle = colors.cellsNormal;
	ctx.fillRect(
		positionX,
		positionY,
		cellsSizeNormal,
		cellsSizeNormal
	);

	const cellState: CellState = cell.state;

	const shouldDrawMarked: boolean = cellState === CellState.MARKED || (cellState === CellState.NONE && cell.prevState === CellState.MARKED);

	ctx.fillStyle = shouldDrawMarked ? colors.cellsMarked : colors.background;
	ctx.beginPath();
	ctx.roundRect(
		positionX + progress * (-cellsSideShrunken) + cellsSideNormal,
		positionY + progress * (-cellsSideShrunken) + cellsSideNormal,
		progress * cellsSizeShrunken,
		progress * cellsSizeShrunken,
		progress * cellsBorderRadius
	);
	ctx.fill();

	if (shouldDrawMarked) {
		drawSVGOnCell(ctx, cell, flagSvgD, FLAG_SVG_HEIGHT, FLAG_SVG_WIDTH, colors.background, progress, 0);
		return;
	}

	if (cell.minesAround <= 0) {

		return;
	}

	drawTextOnCell(ctx, cell, cell.minesAround.toString(), colors.foreground, progress);
}

function animationAdapt(ctx: CanvasRenderingContext2D, deltaTime: number, cell: CanvasGridCell): void {

	const corners: CellCorners = [0, 0, 0, 0];

	const hasSameCell: EightBooleans = cell.hasSameCell;
	const isExpandedTo: EightBooleans = cell.isExpandedTo;

	const timeElapsed: number = cell.animationTimeElapsed = cell.animationTimeElapsed + deltaTime;

	let progress: number = easeOutQuart(timeElapsed / ANIMATION_DURATION_NORMAL);

	if (timeElapsed >= ANIMATION_DURATION_NORMAL - ANIMATION_DURATION_NORMAL * 0.5) {
		progress = 1;
		cell.runningAnimation = AnimationID.NONE;
		cell.animationTimeElapsed = 0;

		for (let i = 0; i < hasSameCell.length; ++i) {
			isExpandedTo[i] = hasSameCell[i]; 
		}

		cell.endAnimationCallback && cell.endAnimationCallback();
	}

	const row: number = cell.row;
	const col: number = cell.col;

	ctx.fillStyle = colors.cellsNormal;
	ctx.fillRect(
		col * cellsSizeNormal,
		row * cellsSizeNormal,
		cellsSizeNormal,
		cellsSizeNormal
	);

	let positionX: number = 0;
	let positionY: number = 0;
	let width: number = 0;
	let height: number = 0;

	// PositionX
	if (hasSameCell[6]) {
		if (isExpandedTo[6]) {
			positionX = col * cellsSizeNormal;
		} else {
			positionX = col * cellsSizeNormal + progress * (-cellsSideDiff) + cellsSideDiff;
		}
	} else {
		if (isExpandedTo[6]) {
			positionX = col * cellsSizeNormal + progress * cellsSideDiff;
		} else {
			positionX = col * cellsSizeNormal + cellsSideDiff;
		}
	}

	// PositionY
	if (hasSameCell[0]) {
		if (isExpandedTo[0]) {
			positionY = row * cellsSizeNormal;
		} else {
			positionY = row * cellsSizeNormal + progress * (-cellsSideDiff) + cellsSideDiff;
		}
	} else {
		if (isExpandedTo[0]) {
			positionY = row * cellsSizeNormal + progress * cellsSideDiff;
		} else {
			positionY = row * cellsSizeNormal + cellsSideDiff;
		}
	}

	// Height
	if (hasSameCell[0]) {
		if (isExpandedTo[0]) {
			height += cellsSideNormal;
		} else {
			height += progress * cellsSideDiff + cellsSideShrunken;
		}
	} else {
		if (isExpandedTo[0]) {
			height += progress * (-cellsSideDiff) + cellsSideNormal;
		} else {
			height += cellsSideShrunken;
		}
	}

	// Height
	if (hasSameCell[4]) {
		if (isExpandedTo[4]) {
			height += cellsSideNormal;
		} else {
			height += progress * cellsSideDiff + cellsSideShrunken;
		}
	} else {
		if (isExpandedTo[4]) {
			height += progress * (-cellsSideDiff) + cellsSideNormal;
		} else {
			height += cellsSideShrunken;
		}
	}

	// Width
	if (hasSameCell[2]) {
		if (isExpandedTo[2]) {
			width += cellsSideNormal;
		} else {
			width += progress * cellsSideDiff + cellsSideShrunken;
		}
	} else {
		if (isExpandedTo[2]) {
			width += progress * (-cellsSideDiff) + cellsSideNormal;
		} else {
			width += cellsSideShrunken;
		}
	}

	// Width
	if (hasSameCell[6]) {
		if (isExpandedTo[6]) {
			width += cellsSideNormal;
		} else {
			width += progress * cellsSideDiff + cellsSideShrunken;
		}
	} else {
		if (isExpandedTo[6]) {
			width += progress * (-cellsSideDiff) + cellsSideNormal;
		} else {
			width += cellsSideShrunken;
		}
	}

	/**
	 *   ---------   ---------   ---------   ---------
	 *   | X |   |   |   |   |   |   | X |   | X |   |
	 *   ---------   ---------   ---------   ---------
	 *   | 0 |   |   | 0 | X |   | 1 |   |   |-1 | X |
	 *   ---------   ---------   ---------   ---------
	 *                                      
	 *   ---------   ---------   ---------   ---------
	 *   | X | X |   |   | X |   | X | X |   |   |   |
	 *   ---------   ---------   ---------   ---------
	 *   | 0 |   |   | 0 | X |   | 0 | X |   | 1 |   |
	 *   ---------   ---------   ---------   ---------
	 */

	// Corners
	if (!hasSameCell[6] && !hasSameCell[0]) {
		if (!isExpandedTo[6] && !isExpandedTo[0]) {
			corners[0] = cellsBorderRadius;
		} else {
			corners[0] = progress * cellsBorderRadius;
		}
	} else {
		if (!isExpandedTo[6] && !isExpandedTo[0]) {
			corners[0] = progress * (-cellsBorderRadius) + cellsBorderRadius;
		} else {
			corners[0] = 0;
		}
	}

	// Corners
	if (!hasSameCell[0] && !hasSameCell[2]) {
		if (!isExpandedTo[0] && !isExpandedTo[2]) {
			corners[1] = cellsBorderRadius;
		} else {
			corners[1] = progress * cellsBorderRadius;
		}
	} else {
		if (!isExpandedTo[0] && !isExpandedTo[2]) {
			corners[1] = progress * (-cellsBorderRadius) + cellsBorderRadius;
		} else {
			corners[1] = 0;
		}
	}

	// Corners
	if (!hasSameCell[2] && !hasSameCell[4]) {
		if (!isExpandedTo[2] && !isExpandedTo[4]) {
			corners[2] = cellsBorderRadius;
		} else {
			corners[2] = progress * cellsBorderRadius;
		}
	} else {
		if (!isExpandedTo[2] && !isExpandedTo[4]) {
			corners[2] = progress * (-cellsBorderRadius) + cellsBorderRadius;
		} else {
			corners[2] = 0;
		}
	}

	// Corners
	if (!hasSameCell[4] && !hasSameCell[6]) {
		if (!isExpandedTo[4] && !isExpandedTo[6]) {
			corners[3] = cellsBorderRadius;
		} else {
			corners[3] = progress * cellsBorderRadius;
		}
	} else {
		if (!isExpandedTo[4] && !isExpandedTo[6]) {
			corners[3] = progress * (-cellsBorderRadius) + cellsBorderRadius;
		} else {
			corners[3] = 0;
		}
	}

	const cellState: CellState = cell.state;

	const shouldDrawMarked: boolean = cellState === CellState.MARKED || (cellState === CellState.NONE && cell.prevState === CellState.MARKED);

	ctx.fillStyle = shouldDrawMarked ? colors.cellsMarked : colors.background;
	ctx.beginPath();
	ctx.roundRect(positionX, positionY, width, height, corners);
	ctx.fill();

	ctx.fillStyle = colors.cellsNormal;

	// Negative Corners
	if (hasSameCell[6] && hasSameCell[7] && hasSameCell[0]) {
		if (isExpandedTo[6] && isExpandedTo[7] && isExpandedTo[0]) {
			// 0
		} else {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal,
				row * cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal,
				row * cellsSizeNormal,
				progress * (-cellsBorderRadius) + cellsBorderRadius,
				0,
				Math.PI * 0.5
			);
			ctx.fill();
		}
	} else {
		if (hasSameCell[6] && hasSameCell[0]) {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal,
				row * cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal,
				row * cellsSizeNormal,
				cellsBorderRadius,
				0,
				Math.PI * 0.5
			);
			ctx.fill();
		} else {
			// 0
		}
	}

	// Negative Corners
	if (hasSameCell[0] && hasSameCell[1] && hasSameCell[2]) {
		if (isExpandedTo[0] && isExpandedTo[1] && isExpandedTo[2]) {
			// 0
		} else {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal,
				progress * (-cellsBorderRadius) + cellsBorderRadius,
				Math.PI * 0.5,
				Math.PI
			);
			ctx.fill();
		}
	} else {
		if (hasSameCell[0] && hasSameCell[2]) {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal,
				cellsBorderRadius,
				Math.PI * 0.5,
				Math.PI
			);
			ctx.fill();
		} else {
			// 0
		}
	}

	// Negative Corners
	if (hasSameCell[2] && hasSameCell[3] && hasSameCell[4]) {
		if (isExpandedTo[2] && isExpandedTo[3] && isExpandedTo[4]) {
			// 0
		} else {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal,
				progress * (-cellsBorderRadius) + cellsBorderRadius,
				Math.PI,
				Math.PI * 1.5
			);
			ctx.fill();
		}
	} else {
		if (hasSameCell[2] && hasSameCell[4]) {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal + cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal,
				cellsBorderRadius,
				Math.PI,
				Math.PI * 1.5
			);
			ctx.fill();
		} else {
			// 0
		}
	}

	if (hasSameCell[4] && hasSameCell[5] && hasSameCell[6]) {
		if (isExpandedTo[4] && isExpandedTo[5] && isExpandedTo[6]) {
			// 0
		} else {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal,
				progress * (-cellsBorderRadius) + cellsBorderRadius,
				Math.PI * 1.5,
				0,
			);
			ctx.fill();
		}
	} else {
		if (hasSameCell[4] && hasSameCell[6]) {
			ctx.beginPath();
			ctx.moveTo(
				col * cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal
			);
			ctx.arc(
				col * cellsSizeNormal,
				row * cellsSizeNormal + cellsSizeNormal,
				cellsBorderRadius,
				Math.PI * 1.5,
				0,
			);
			ctx.fill();
		} else {
			// 0
		}
	}

	if (shouldDrawMarked) {
		drawSVGOnCell(ctx, cell, flagSvgD, FLAG_SVG_HEIGHT, FLAG_SVG_WIDTH, colors.background, 1, 0);
		return;
	}

	if (cell.minesAround <= 0) {
		return;
	}

	drawTextOnCell(ctx, cell, cell.minesAround.toString(), colors.foreground, 1);
}
