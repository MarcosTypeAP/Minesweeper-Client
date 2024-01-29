export enum MinesweeperDifficulty {
	UNSET = -1,
	EASY,
	MEDIUM,
	HARD,
	HUGE, 
	EXTREME,
	COUNT,
};

export enum MinesweeperReturnCode {
	ERROR = -1,
	SUCCESS,
	DUG_MINE,
	HAS_WON,
	MINES_CHANGED,
};

export type GridCell = {
	isMine: boolean,
	isDug: boolean,
	isMarked: boolean,
	minesAround: number,
};

export type GridCellPosition = {
	col: number,
	row: number
};

const eightDirections: number[][] = [
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

export default class Minesweeper {
	grid: GridCell[][];

	cols: number;
	rows: number;

	difficulty: MinesweeperDifficulty;

	mines: number;
	minePositions: GridCellPosition[];

	markedMinesCount: number;
	dugCellsCount: number;

	private startTimestamp: number;
	private endTimestamp: number;

	savedGameElapsedSeconds: number;

	firstDugCellPos: GridCellPosition | null;

	constructor(difficulty: MinesweeperDifficulty) {

		this.difficulty = difficulty;

		if (this.difficulty < -1 || difficulty >= MinesweeperDifficulty.COUNT) {
			throw new Error("Invalid difficulty.");
		}

		switch(this.difficulty) {
			case MinesweeperDifficulty.UNSET:
				this.mines = -1;
				this.cols = -1;
				this.rows = -1;
				this.firstDugCellPos = null;
				this.startTimestamp = -1;
				this.endTimestamp = -1;
				this.markedMinesCount = -1;
				this.dugCellsCount = -1;
				this.minePositions = [];
				this.grid = [];
				this.savedGameElapsedSeconds = -1;
				return;

			case MinesweeperDifficulty.EASY:
				this.mines = 10;
				this.cols = 8;
				this.rows = 10;
				break;

			case MinesweeperDifficulty.MEDIUM:
				this.mines = 40;
				this.cols = 12;
				this.rows = 22;
				break;

			case MinesweeperDifficulty.HARD:
				this.mines = 100;
				this.cols = 20;
				this.rows = 36;
				break;

			// performance sucks on mobile
			case MinesweeperDifficulty.HUGE:
				this.mines = 220;
				this.cols = 28;
				this.rows = 48;
				break;

			case MinesweeperDifficulty.EXTREME:
				this.mines = 150;
				this.cols = 18;
				this.rows = 32
				break;

			default:
				throw new Error("Invalid difficulty.");
		}

		this.savedGameElapsedSeconds = -1;

		this.firstDugCellPos = null;
		this.startTimestamp = -1;
		this.endTimestamp = -1;
		this.markedMinesCount = 0;
		this.dugCellsCount = 0;

		this.minePositions = this.genMines();
		this.grid = this.initGrid();
	}

	printGrid() {
		for (let i = 0; i < this.rows; ++i) {
			console.log(this.grid[i]);
		}
	}

	printNotDugCells() {

		this.printGridCellsProperty("isDug", "Dug Mines", '-', 'X');
	}

	printMarkedCells() {

		this.printGridCellsProperty("isMarked", "Marked Mines", 'X', '-');
	}

	printMines() {

		this.printGridCellsProperty("isMine", "Mines", 'X', '-');
	}

	printMinesAround() {

		this.printGridCellsProperty("minesAround", "Mines Around");
	}

	printGridCellsProperty<GridCellProperty extends keyof GridCell>(
		property: GridCellProperty,
		headerMessage: string,
		trueCharacter?: string,
		falseCharacter?: string) {

		let printText: string = `/// ${headerMessage} ///`;

		for (let row = 0; row < this.rows; ++row) {
			printText += '\n';

			for (let col = 0; col < this.cols; ++col) {
				const propertyValue: GridCell[keyof GridCell] = this.grid[row][col][property];

				if (typeof propertyValue == "boolean") {
					printText += this.grid[row][col][property] ? trueCharacter : falseCharacter;
					printText += ' ';

				} else if (typeof propertyValue == "number") {
					printText += propertyValue < 0 ? 'X' : propertyValue;
					printText += ' ';
				}
			}
		}

		console.log(printText);
	}

	hasStarted(): boolean {
		return this.startTimestamp !== -1;
	}

	hasEnded(): boolean {
		return this.endTimestamp !== -1;
	}

	getElapsedSeconds(): number {

		if (this.startTimestamp === -1) {
			return -1;
		}

		const lastTimestamp: number = this.endTimestamp === -1
			? (new Date()).getTime()
			: this.endTimestamp;

		return Math.floor((lastTimestamp - this.startTimestamp) / 1000);
	}

	private genMines(): GridCellPosition[] {
		const minePositions: GridCellPosition[] = new Array(this.mines);

		// mine
		let isNearFirstTouch: boolean;
		let doAlreadyExists: boolean;

		for (let i = 0; i < this.mines; ++i) {
			do {
				minePositions[i] = {
					col: Math.floor(Math.random() * this.cols),
					row: Math.floor(Math.random() * this.rows)
				};

				isNearFirstTouch = this.firstDugCellPos !== null && (
					minePositions[i].col >= this.firstDugCellPos.col - 1 &&
					minePositions[i].col <= this.firstDugCellPos.col + 1
				) && (
					minePositions[i].row >= this.firstDugCellPos.row - 1 &&
					minePositions[i].row <= this.firstDugCellPos.row + 1
				);

				doAlreadyExists = false;

				for (let j = 0; j < minePositions.length; ++j) {

					if (j === i) {
						continue;
					}

					if (minePositions[i].row === minePositions[j]?.row &&
						minePositions[i].col === minePositions[j]?.col) {

						doAlreadyExists = true;
					}
				}

			} while (isNearFirstTouch || doAlreadyExists);
		}

		return minePositions;
	}

	private initGrid(): GridCell[][] {

		const grid: GridCell[][] = new Array(this.rows);

		for (let row = 0; row < this.rows; ++row) {
			grid[row] = new Array(this.cols);

			for (let col = 0; col < this.cols; ++col) {
				grid[row][col] = {
					isMine: false,
					isDug: false,
					isMarked: false,
					minesAround: 0
				}
			}
		}

		for (let i = 0; i < this.mines; ++i) {
			const minePos: GridCellPosition = this.minePositions[i];

			grid[minePos.row][minePos.col].isMine = true;
			grid[minePos.row][minePos.col].minesAround = -1;
		}

		for (let mineIndex = 0; mineIndex < this.mines; ++mineIndex) {

			const minePos: GridCellPosition = this.minePositions[mineIndex];

			for (let i = 0; i < eightDirections.length; ++i) {

				const levelOneCellPos: GridCellPosition = {
					col: minePos.col + eightDirections[i][0],
					row: minePos.row + eightDirections[i][1]
				};

				let mineCount = 0;

				if (this.checkWithinGrid(levelOneCellPos) === false) {
					continue;
				}

				if (grid[levelOneCellPos.row][levelOneCellPos.col].isMine) {
					continue;
				}

				for (let j = 0; j < eightDirections.length; ++j) {

					const levelTwoCellPos: GridCellPosition = {
						col: levelOneCellPos.col + eightDirections[j][0],
						row: levelOneCellPos.row + eightDirections[j][1]
					}

					if (this.checkWithinGrid(levelTwoCellPos) === false) {
						continue;
					}

					if (grid[levelTwoCellPos.row][levelTwoCellPos.col].isMine) {
						mineCount++;
					}
				}

				grid[levelOneCellPos.row][levelOneCellPos.col].minesAround = mineCount;
			}
		}

		return grid;
	}

	startGame(): void {

		if (this.hasStarted()) {
			return;
		}

		this.startTimestamp = (new Date()).getTime();
	}

	endGame(): void {

		if (this.hasEnded()) {
			return;
		}

		this.endTimestamp = (new Date()).getTime();
	}

	checkWithinGrid(cellPos: GridCellPosition): boolean {

		if (cellPos.col < 0 || cellPos.col >= this.cols ||
		   	cellPos.row < 0 || cellPos.row >= this.rows) {
			
			return false;
		}
		return true;
	}

	markCell(cellPos: GridCellPosition): MinesweeperReturnCode {

		if (this.hasStarted() === false || this.hasEnded()) {
			return MinesweeperReturnCode.ERROR;
		}

		if (!this.checkWithinGrid(cellPos)) {
			return MinesweeperReturnCode.ERROR;
		}

		const gridCell: GridCell = this.grid[cellPos.row][cellPos.col];

		if (gridCell.isMarked || gridCell.isDug) {
			return MinesweeperReturnCode.ERROR;
		}

		gridCell.isMarked = true;
		this.markedMinesCount++;

		const hasWon: boolean = this.dugCellsCount === this.rows * this.cols - this.mines;

		if (hasWon) {
			this.endGame();
			return MinesweeperReturnCode.HAS_WON;
		}

		return MinesweeperReturnCode.SUCCESS;
	}

	unmarkCell(cellPos: GridCellPosition): MinesweeperReturnCode {

		if (this.hasStarted() === false || this.hasEnded()) {
			return MinesweeperReturnCode.ERROR;
		}

		if (!this.checkWithinGrid(cellPos)) {
			return MinesweeperReturnCode.ERROR;
		}

		if (this.grid[cellPos.row][cellPos.col].isMarked === false) {
			return MinesweeperReturnCode.ERROR;
		}

		if (this.grid[cellPos.row][cellPos.col].isDug) {
			return MinesweeperReturnCode.ERROR;
		}

		this.grid[cellPos.row][cellPos.col].isMarked = false;
		this.markedMinesCount--;

		return MinesweeperReturnCode.SUCCESS;
	}

	digCell(
		cellPos: GridCellPosition,
		haveMinesChanged: boolean = false,
	): [GridCellPosition[] | null, GridCellPosition[] | null, MinesweeperReturnCode] {

		if (this.hasEnded()) {
			return [null, null, MinesweeperReturnCode.ERROR];
		}

		if (!this.checkWithinGrid(cellPos)) {
			return [null, null, MinesweeperReturnCode.ERROR];
		}

		const gridCell: GridCell = this.grid[cellPos.row][cellPos.col];

		if (gridCell.minesAround !== 0 && (!this.firstDugCellPos || haveMinesChanged)) {
			this.firstDugCellPos = cellPos;
			this.minePositions = this.genMines();
			this.grid = this.initGrid()

			return this.digCell(cellPos, true);
		}

		if (gridCell.isDug) {
			return [null, null, MinesweeperReturnCode.ERROR];
		}

		if (gridCell.isMarked) {
			return [null, null, MinesweeperReturnCode.ERROR];
		}

		if (gridCell.isMine) {
			this.endGame();
			gridCell.isDug = true;
			return [null, null, MinesweeperReturnCode.DUG_MINE];
		}

		const dugCells: GridCellPosition[] = [];
		const shores: GridCellPosition[] = [];

		if (gridCell.minesAround == 0) {
			const seen: boolean[][] = []
			
			for (let i = 0; i < this.rows; ++i) {
				seen.push(new Array(this.cols).fill(false));
			}

			this.digAdjacentEmptyCells(cellPos, dugCells, shores, seen);

		} else {
			gridCell.isDug = true;
			dugCells.push(cellPos);
			shores.push(cellPos);
			this.dugCellsCount++;
		}

		const hasWon: boolean = this.dugCellsCount === this.rows * this.cols - this.mines;

		if (hasWon && (!this.firstDugCellPos || haveMinesChanged)) {
			this.minePositions = this.genMines();
			this.grid = this.initGrid()
			this.dugCellsCount = 0;

			return this.digCell(cellPos, true);
		}

		if (this.firstDugCellPos === null) {
			this.firstDugCellPos = cellPos;
		}

		if (hasWon) {
			this.markedMinesCount = this.mines;
		}

		const returnCode: MinesweeperReturnCode = haveMinesChanged
			? MinesweeperReturnCode.MINES_CHANGED
			: hasWon
				? MinesweeperReturnCode.HAS_WON
				: MinesweeperReturnCode.SUCCESS

		return [
			dugCells,
			shores,
			returnCode
		];
	}

	private digAdjacentEmptyCells(
		cellPos: GridCellPosition,
		dugCells: GridCellPosition[],
		shores: GridCellPosition[],
		seen: boolean[][]
	) {

		if (!this.checkWithinGrid(cellPos)) {
			return;
		}

		if (seen[cellPos.row][cellPos.col]) {
			return;
		}

		seen[cellPos.row][cellPos.col] = true;

		if (this.grid[cellPos.row][cellPos.col].isMarked) {
			return;
		}

		if (this.grid[cellPos.row][cellPos.col].isDug) {
			return;
		}

		this.grid[cellPos.row][cellPos.col].isDug = true;
		dugCells.push(cellPos);
		this.dugCellsCount++;

		if (this.grid[cellPos.row][cellPos.col].minesAround > 0) {
			shores.push(cellPos);
			return;
		}

		for (let i = 0; i < eightDirections.length; ++i) {
			const nextCellPos: GridCellPosition = {
				col: cellPos.col + eightDirections[i][0],
				row: cellPos.row + eightDirections[i][1]
			};

			this.digAdjacentEmptyCells(nextCellPos, dugCells, shores, seen);
		}
	}

	resumeGame(): void {

		if (this.savedGameElapsedSeconds === -1) {
			return;
		}

		this.startTimestamp = (new Date()).getTime() - this.savedGameElapsedSeconds * 1000;
		this.savedGameElapsedSeconds = -1;
	}

	encodeCurrentGame(): string {
		// All numbers
		// State = <isMine><isDug><isMarked> = 3 bits integer
		// GridCell = "<state><minesAround>;"
		let encodedGrid: string = "";

		for (let row = 0; row < this.rows; ++row) {
			for (let col = 0; col < this.cols; ++col) {

				const cell: GridCell = this.grid[row][col];
				const cellState: number = parseInt(`${cell.isMine ? 1 : 0}${cell.isDug ? 1 : 0}${cell.isMarked ? 1 : 0}`, 2);
				encodedGrid += `${cellState}${cell.minesAround};`;
			}
		}

		return JSON.stringify({
			difficulty: this.difficulty,
			mines: this.mines,
			markedMinesCount: this.markedMinesCount,
			dugCellsCount: this.dugCellsCount,
			elapsedSeconds: this.getElapsedSeconds(),
			firstDugCellPos: this.firstDugCellPos,
			minePositions: this.minePositions,
			rows: this.rows,
			cols: this.cols,
			encodedGrid
		});
	}

	loadGame(encodedGame: string): void {
		const decodedGame: any = JSON.parse(encodedGame);

		const rows: number = decodedGame.rows;
		const cols: number = decodedGame.cols;

		const decodedGrid: GridCell[][] = new Array(rows);

		const encodedCells: string[] = (decodedGame.encodedGrid as string).split(';');

		for (let row = 0; row < rows; ++row) {
			decodedGrid[row] = new Array(cols);

			for (let col = 0; col < cols; ++col) {
				const cellIndex: number = row * cols + col;
				const cellState: number = parseInt(encodedCells[cellIndex][0]);

				decodedGrid[row][col] = {
					isMine: Boolean(cellState & 0b100),
					isDug: Boolean(cellState & 0b010),
					isMarked: Boolean(cellState & 0b001),
					minesAround: parseInt(encodedCells[cellIndex].slice(1))
				}
			}
		}

		// for (let i = 0; i < encodedCells.length; ++i) {

			// if (row < rows) {

			// }
		// }

		// for (let row = 0; row < this.rows; ++row) {
			// decodedGrid[row] = new Array(this.cols);

			// for (let col = 0; col < this.cols; ++col) {
				// decodedGrid[row][col] = {
					// isMine: false,
					// isDug: false,
					// isMarked: false,
					// minesAround: 0
				// }
			// }
		// }

		// for (let row = 0; row < this.rows; ++row) {
			// for (let col = 0; col < this.cols; ++col) {

				// const cell: GridCell = this.grid[row][col];
				// const cellState: number = parseInt(`${cell.isMine ? 1 : 0}${cell.isDug ? 1 : 0}${cell.isMarked ? 1 : 0}`, 2);
				// encodedGrid += `${cellState}${cell.minesAround};`;
			// }
		// }

		this.difficulty = decodedGame.difficulty;
		this.mines = decodedGame.mines;
		this.markedMinesCount = decodedGame.markedMinesCount;
		this.dugCellsCount = decodedGame.dugCellsCount;
		this.savedGameElapsedSeconds = decodedGame.elapsedSeconds;
		this.firstDugCellPos = decodedGame.firstDugCellPos;
		this.minePositions = decodedGame.minePositions;
		this.rows = rows;
		this.cols = cols;
		this.grid = decodedGrid;
	}
}
