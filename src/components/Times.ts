import styles from "./Times.module.css"
import getLeftArrowSVG from "../icons/LeftArrow"
import getRightArrowSVG from "../icons/RightArrow"
import getTrashSVG from "../icons/Trash"
import {MinesweeperDifficultyNames} from "./MainManu"
import {getFormatedTime} from "../utils"
import PopupComponent from "./Popup"
import {MinesweeperDifficulty} from "../models/Minesweeper"

type TimesProps = {
	getTimeRecords: () => TimeRecord[];
	deleteTimeRecord: (id: string) => Promise<boolean>;
	getLastChosenDifficulty: () => MinesweeperDifficulty;
	generateTimeRecords: (amount: number) => void;
}

type TimesState = {
	currDifficulty: MinesweeperDifficulty;
}

type TimesDOMElements = {
	records: HTMLTableElement;
	difficulties: HTMLDivElement;
	leftArrow: HTMLButtonElement;
	rightArrow: HTMLButtonElement;
}

export default class TimesComponent implements Component {

	private $root: HTMLElement;

	private props: TimesProps;

	private domElements: TimesDOMElements | null;

	private state: TimesState;

	constructor(root: HTMLElement, props: TimesProps) {

		this.$root = root;
		this.props = props;

		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): TimesState {

		return {
			currDifficulty: this.props.getLastChosenDifficulty(),
		};
	}

	render(): void {

		this.clean();

		this.$root.className = styles.times_page;

		const $pageTitle: HTMLHeadingElement = document.createElement("h1");
		$pageTitle.className = styles.page_title;
		$pageTitle.innerText = "Times";

		this.$root.appendChild($pageTitle);

		const $difficultyChooser: HTMLDivElement = document.createElement("div");
		$difficultyChooser.className = styles.difficulty_chooser;

		const $leftArrow: HTMLButtonElement = document.createElement("button");
		$leftArrow.className = styles.left_arrow;
		$leftArrow.classList.add(styles.icon_button);
		$leftArrow.appendChild(getLeftArrowSVG());
		$leftArrow.onclick = this.handlePrevDifficulty;

		if (this.state.currDifficulty <= MinesweeperDifficulty.EASY) {
			$leftArrow.classList.add(styles.hidden);
			$leftArrow.classList.add(styles.disabled);
		}

		$difficultyChooser.appendChild($leftArrow);

		const $difficulties: HTMLDivElement = document.createElement("div");
		$difficulties.className = styles.difficulties;
		
		for (let i = 0; i < MinesweeperDifficulty.COUNT; ++i) {
			const $difficulty: HTMLSpanElement = document.createElement("span");
			$difficulty.className = styles.difficulty;
			$difficulty.innerText = MinesweeperDifficultyNames[i];

			$difficulties.appendChild($difficulty);
		}

		$difficultyChooser.appendChild($difficulties);

		const $rightArrow: HTMLButtonElement = document.createElement("button");
		$rightArrow.className = styles.right_arrow;
		$rightArrow.classList.add(styles.icon_button);
		$rightArrow.appendChild(getRightArrowSVG());
		$rightArrow.onclick = this.handleNextDifficulty;

		if (this.state.currDifficulty >= MinesweeperDifficulty.COUNT - 1) {
			$rightArrow.classList.add(styles.hidden);
			$rightArrow.classList.add(styles.disabled);
		}

		$difficultyChooser.appendChild($rightArrow);

		this.$root.appendChild($difficultyChooser);

		$difficulties.classList.add(styles.no_scroll_animation);
		$difficulties.children[this.state.currDifficulty].scrollIntoView();
		$difficulties.classList.remove(styles.no_scroll_animation);

		const $recordsScrollWrapper: HTMLDivElement = document.createElement("div");
		$recordsScrollWrapper.className = styles.records_wrapper;

		const $records: HTMLTableElement = document.createElement("table");
		$records.className = styles.records;

		$recordsScrollWrapper.appendChild($records);

		this.$root.appendChild($recordsScrollWrapper);

		if (this.props.getTimeRecords().length === 0) {
			setTimeout(() => {
				(new PopupComponent(this.$root, {
					title: "No time records yet?",
					message: "Generate some to see what they look like!",
					buttonText1: "Close",
					buttonText2: "Generate",
					onClick2: () => {
						this.props.generateTimeRecords(20)
						this.renderUpdate();
					}
				})).render()
			}, 1000);
		}

		this.domElements = {
			records: $records,
			difficulties: $difficulties,
			leftArrow: $leftArrow,
			rightArrow: $rightArrow,
		};

		this.renderRecords();
	}

	private renderRecords(): void {

		if (!this.domElements) {
			return;
		}

		const $records: HTMLTableElement = this.domElements.records;

		$records.innerHTML = '';

		const records: TimeRecord[] = this.props.getTimeRecords()
			.filter((record) => record.difficulty === this.state.currDifficulty)
			.sort((record1, record2) => record1.time - record2.time);

		if (records.length === 0) {
			const $noRecords: HTMLSpanElement = document.createElement("span");
			$noRecords.className = styles.no_records;
			$noRecords.innerText = "No times yet."

			$records.appendChild($noRecords);
		}

		for (let i = 0; i < records.length; ++i) {

			const $record: HTMLTableRowElement = document.createElement("tr");
			$record.className = styles.record;
			$record.setAttribute("record-id", records[i].id.toString());

			const $position: HTMLTableCellElement = document.createElement("th");
			$position.className = styles.position;
			$position.innerText = `${i + 1}.`;

			$record.appendChild($position)

			// "Wed Feb 23 2023"
			const recordDate: Date = new Date(records[i].createdAt);
			const dateParts: string[] = recordDate.toDateString().split(' ');

			const $date: HTMLTableCellElement = document.createElement("td");
			$date.className = styles.date;

			const $innerDate: HTMLTimeElement = document.createElement("time");
			$innerDate.dateTime = recordDate.toISOString();
			$innerDate.innerText = `${dateParts[2]} ${dateParts[1]} ${dateParts[3]}`;

			$date.appendChild($innerDate);

			$record.appendChild($date);

			const $emptyCell: HTMLTableCellElement = document.createElement("td");
			$emptyCell.className = styles.empty_cell;

			$record.appendChild($emptyCell);

			const $time: HTMLTableCellElement = document.createElement("td");
			$time.className = styles.time;
			$time.innerText = getFormatedTime(records[i].time);

			$record.appendChild($time);

			const $deleteRecord: HTMLButtonElement = document.createElement("button");
			$deleteRecord.className = styles.delete_record;
			$deleteRecord.classList.add(styles.icon_button);
			$deleteRecord.appendChild(getTrashSVG());
			$deleteRecord.onclick = () => this.spawnDeleteConfirmationPopup(records[i].id);

			$record.appendChild($deleteRecord);

			$records.appendChild($record);
		}
	}

	private spawnDeleteConfirmationPopup(id: string): void {

		const popupComponent: PopupComponent = new PopupComponent(
			this.$root,
			{
				message: "Are you sure you want to delete this time?",
				buttonText1: "Cancel",
				buttonText2: "Delete",
				onClick2: async () => {
					const hasError: boolean = await this.props.deleteTimeRecord(id);

					if (hasError) {
						return;
					}

					this.renderUpdate();
				}
			}
		);

		popupComponent.render();
	}

	private renderUpdate(): void {

		if (!this.domElements) {
			return;
		}

		const $records: HTMLTableElement = this.domElements.records;

		$records.ontransitionend = () => {
			$records.ontransitionend = null;

			this.renderRecords();
			$records.classList.remove(styles.hidden);
		};

		if ($records.classList.contains(styles.hidden)) {
			const animations: Animation[] = $records.getAnimations();

			for (let i = 0; i < animations.length; ++i) {
				animations[i].cancel();
				animations[i].play();
			}
		}

		$records.classList.add(styles.hidden);

		this.domElements.leftArrow.classList.toggle(
			styles.hidden,
			this.state.currDifficulty <= MinesweeperDifficulty.UNSET + 1
		);
		this.domElements.leftArrow.classList.toggle(
			styles.disabled,
			this.state.currDifficulty <= MinesweeperDifficulty.UNSET + 1
		);

		this.domElements.rightArrow.classList.toggle(
			styles.hidden,
			this.state.currDifficulty >= MinesweeperDifficulty.COUNT - 1
		);
		this.domElements.rightArrow.classList.toggle(
			styles.disabled,
			this.state.currDifficulty >= MinesweeperDifficulty.COUNT - 1
		);
	}

	private handlePrevDifficulty = (): void => {

		if (!this.domElements) {
			return;
		}

		const prevDifficulty: number = this.state.currDifficulty - 1;

		if (prevDifficulty < MinesweeperDifficulty.UNSET + 1) {
			return;
		}

		this.state.currDifficulty = prevDifficulty;

		this.domElements.difficulties.children[prevDifficulty].scrollIntoView();

		this.renderUpdate();
	}

	private handleNextDifficulty = (): void => {

		if (!this.domElements) {
			return;
		}

		const nextDifficulty: number = this.state.currDifficulty + 1;

		if (nextDifficulty > MinesweeperDifficulty.COUNT - 1) {
			return;
		}

		this.state.currDifficulty = nextDifficulty;

		this.domElements.difficulties.children[nextDifficulty].scrollIntoView();

		this.renderUpdate();
	}

	clean(): void {

		this.state = this.getInitState();
		
		this.$root.innerHTML = '';
		this.$root.className = '';
	}
}
