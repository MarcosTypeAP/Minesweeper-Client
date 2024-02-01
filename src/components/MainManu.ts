import getLeftArrowSVG from "../icons/LeftArrow";
import getListSVG from "../icons/List";
import getMineSVG from "../icons/Mine";
import getRightArrowSVG from "../icons/RightArrow";
import getSettingsSVG from "../icons/Settings";
import {getLastChosenDifficulty, openSettings, openTimesList} from "../main";
import {checkSavedGameExists, deleteSavedGame} from "../models/Games";
import {MinesweeperDifficulty} from "../models/Minesweeper";
import styles from "./MainManu.module.css";
import PopupComponent from "./Popup";

export const MinesweeperDifficultyNames: string[] = [
	"Easy",
	"Medium",
	"Hard",
	"Huge",
	"Extreme",
];

type MainManuProps = {
	startNewGame: (difficulty: MinesweeperDifficulty) => void;
	resumeGame: (difficulty: MinesweeperDifficulty) => void;
};

type MainMenuState = {
	currDifficulty: MinesweeperDifficulty;
};

type MainMenuDOMElements = {
	leftArrow: HTMLButtonElement;
	rightArrow: HTMLButtonElement;
	difficulties: HTMLDivElement;
	resume: HTMLButtonElement;
};

export default class MainMenuComponent implements Component {

	private $root: HTMLElement;

	private state: MainMenuState;

	private domElements: MainMenuDOMElements | null;

	private props: MainManuProps;

	constructor(root: HTMLElement, props: MainManuProps) {

		this.$root = root;
		this.props = props;

		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): MainMenuState {
		
		return {
			currDifficulty: getLastChosenDifficulty(),
		};
	}

	render(): void {
		
		this.clean();

		this.$root.classList.add(styles.main_menu);

		const $mine: SVGSVGElement = getMineSVG();
		$mine.classList.add(styles.center_icon);
		this.$root.appendChild($mine);

		const $difficultyChooser: HTMLDivElement = document.createElement("div");
		$difficultyChooser.className = styles.difficulty_chooser;

		const $leftArrow: HTMLButtonElement = this.createButton(
			getLeftArrowSVG(),
			this.handlePrevDifficulty,
			styles.icon_button,
			styles.left_arrow
		);

		if (this.state.currDifficulty <= MinesweeperDifficulty.EASY) {
			$leftArrow.classList.add(styles.hidden);
			$leftArrow.classList.add(styles.disabled);
		}

		$difficultyChooser.appendChild($leftArrow);

		const $difficulties: HTMLDivElement = document.createElement("div");
		$difficulties.className = styles.difficulties;
		
		for (let i = 0; i < MinesweeperDifficulty.COUNT; ++i) {
			$difficulties.appendChild(
				this.createSpan(MinesweeperDifficultyNames[i], styles.difficulty)
			);
		}

		$difficultyChooser.appendChild($difficulties);

		const $rightArrow: HTMLButtonElement = this.createButton(
			getRightArrowSVG(),
			this.handleNextDifficulty,
			styles.icon_button,
			styles.right_arrow
		);

		if (this.state.currDifficulty >= MinesweeperDifficulty.COUNT - 1) {
			$rightArrow.classList.add(styles.hidden);
			$rightArrow.classList.add(styles.disabled);
		}

		$difficultyChooser.appendChild($rightArrow);

		this.$root.appendChild($difficultyChooser);

		$difficulties.classList.add(styles.no_scroll_animation);
		$difficulties.children[this.state.currDifficulty].scrollIntoView();
		$difficulties.classList.remove(styles.no_scroll_animation);

		this.$root.appendChild(
			this.createButton(this.createSpan("New Game"), this.handleNewGame, styles.text_button, styles.large)
		);

		const $resume: HTMLButtonElement = this.createButton(
			this.createSpan("Resume"),
			this.handleResumeGame,
			styles.text_button,
			styles.large
		);

		if (checkSavedGameExists(this.state.currDifficulty) === false) {
			$resume.classList.add(styles.hidden);
			$resume.classList.add(styles.disabled);
		}

		this.$root.appendChild($resume);

		const $bottomButtons: HTMLDivElement = document.createElement("div");
		$bottomButtons.className = styles.bottom_buttons;

		const $times: HTMLButtonElement = document.createElement("button");
		$times.className = styles.times;
		$times.classList.add(styles.text_button);
		$times.appendChild(getListSVG());
		$times.onclick = this.handleOpenTimes;

		$bottomButtons.appendChild($times);

		const $settings: HTMLButtonElement = document.createElement("button");
		$settings.classList.add(styles.text_button);
		$settings.appendChild(getSettingsSVG());
		$settings.onclick = this.handleOpenSettings;

		$bottomButtons.appendChild($settings);

		this.$root.appendChild($bottomButtons);

		this.domElements = {
			leftArrow: $leftArrow,
			rightArrow: $rightArrow,
			resume: $resume,
			difficulties: $difficulties
		};
	}

	private handleOpenSettings = (): void => {

		openSettings();
	}

	private handleOpenTimes = (): void => {

		openTimesList();
	}

	updateRender(): void {

		if (this.domElements === null) {
			return;
		}

		this.domElements.leftArrow.classList.remove(styles.disabled);
		this.domElements.rightArrow.classList.remove(styles.disabled);
		this.domElements.resume.classList.remove(styles.disabled);

		this.domElements.leftArrow.classList.toggle(
			styles.hidden,
			this.state.currDifficulty <= MinesweeperDifficulty.EASY
		);

		this.domElements.rightArrow.classList.toggle(
			styles.hidden,
			this.state.currDifficulty >= MinesweeperDifficulty.COUNT - 1
		);

		this.domElements.resume.classList.toggle(
			styles.hidden,
			checkSavedGameExists(this.state.currDifficulty) === false
		);
	}

	private handleNewGame = (): void => {

		if (checkSavedGameExists(this.state.currDifficulty)) {

			const popupComponent: PopupComponent = new PopupComponent(
				this.$root,
				{
					message: "Your saved progress of previous game will be lost. Are you sure you want to continue?",
					buttonText1: "Cancel",
					buttonText2: "New Game",
					onClick2: () => {
						deleteSavedGame(this.state.currDifficulty);
						this.handleNewGame();
					},
				}
			);

			popupComponent.render();

			return;
		}

		this.props.startNewGame(this.state.currDifficulty);
	}

	private handleResumeGame = (): void => {

		this.props.resumeGame(this.state.currDifficulty);
	}

	private handlePrevDifficulty = (): void => {

		if (this.domElements === null) {
			return;
		}

		const prevDifficulty: number = this.state.currDifficulty - 1;

		if (prevDifficulty < MinesweeperDifficulty.EASY) {
			return;
		}

		this.domElements.difficulties.children[prevDifficulty].scrollIntoView();

		this.state.currDifficulty--;

		this.updateRender();
	}

	private handleNextDifficulty = (): void => {

		if (this.domElements === null) {
			return;
		}

		const nextDifficulty: number = this.state.currDifficulty + 1;

		if (nextDifficulty >= MinesweeperDifficulty.COUNT) {
			return;
		}

		this.domElements.difficulties.children[nextDifficulty].scrollIntoView();

		this.state.currDifficulty++;

		this.updateRender();
	}

	private createSpan(text: string, ...classNames: string[]): HTMLSpanElement {
		const $span: HTMLSpanElement = document.createElement("span");

		for (let i = 0; i < classNames.length; ++i) {
			$span.classList.add(classNames[i]);
		}

		$span.innerText = text;

		return $span;
	}

	private createButton(content: Node, onClick: (event: Event) => void, ...classNames: string[]): HTMLButtonElement {
		
		const $button: HTMLButtonElement = document.createElement("button")

		$button.className = styles.button;

		for (let i = 0; i < classNames.length; ++i) {
			$button.classList.add(classNames[i]);
		}

		$button.onclick = onClick;

		$button.appendChild(content);

		return $button;
	}

	clean(): void {

		this.state = this.getInitState();

		this.$root.innerHTML = '';
		this.$root.className = '';
	}
}
