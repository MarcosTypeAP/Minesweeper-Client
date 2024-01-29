import styles from "./Header.module.css";
import getColorPaletteSVG from "../icons/ColorPalette";
import getArrowBackSVG from "../icons/ArrowBack";
import getMineSVG from "../icons/Mine";
import Minesweeper from "../models/Minesweeper";
import {getFormatedTime} from "../utils";

type HeaderProps = {
	getSettings: () => GameSettings;
	changeSettings: (newSettings: Partial<GameSettings>) => void;
	refreshGameTheme: () => void;
};

type HeaderDOMElements = {
	minesCounter: HTMLSpanElement;
	minesCounterContainer: HTMLDivElement;
	timeElapsed: HTMLSpanElement;
	center: HTMLDivElement;
	goBack: HTMLButtonElement;
	colorPalletContainer: HTMLDivElement;
	palletOptions: HTMLDivElement;
	selectedPalletOption: HTMLButtonElement;
};

type HeaderState = {
	settings: GameSettings;
}

export default class HeaderComponent implements Component {

	private $root: HTMLHeadingElement;

	private props: HeaderProps;

	private state: HeaderState;

	private domElements: HeaderDOMElements | null;

	private updateTimeIntervalID: number;

	constructor(root: HTMLHeadingElement, props: HeaderProps) {

		this.$root = root;
		this.props = props;

		this.updateTimeIntervalID = -1;
		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): HeaderState {

		return {
			settings: this.props.getSettings(),
		};
	}

	render() {
		
		this.clean();

		this.$root.classList.add(styles.header);

		const $leftSide: HTMLDivElement = document.createElement("div");
		$leftSide.className = styles.left_side;

		const $goBack: HTMLButtonElement = document.createElement("button");
		$goBack.classList.add(
			styles.button,
			styles.arrow_back,
			styles.hidden,
			styles.disabled
		);
		$goBack.appendChild(getArrowBackSVG());

		$leftSide.appendChild($goBack);

		const $center: HTMLDivElement = document.createElement("div");
		$center.className = styles.center;
		$center.classList.add(styles.hidden);
		$center.classList.add(styles.disabled);

		const $minesCounterContainer: HTMLDivElement = document.createElement("div");
		$minesCounterContainer.className = styles.mines_counter_container;

		const $counter: HTMLSpanElement = document.createElement("span");
		$counter.className = styles.mines_counter;

		const $mineSVG: SVGSVGElement = getMineSVG();
		$mineSVG.classList.add(styles.mine);

		$minesCounterContainer.appendChild($mineSVG);
		$minesCounterContainer.appendChild($counter);

		const $timeElapsed: HTMLSpanElement = document.createElement("span");
		$timeElapsed.className = styles.time_elapsed;
		$timeElapsed.classList.add(styles.hidden);
		$timeElapsed.innerText = "0S";

		$center.appendChild($minesCounterContainer);
		$center.appendChild($timeElapsed);

		const $rightSide: HTMLDivElement = document.createElement("div");
		$rightSide.className = styles.right_side;

		const $colorPalletContainer: HTMLDivElement = document.createElement("div");
		$colorPalletContainer.className = styles.color_pallet_container

		const $colorPallet: HTMLButtonElement = document.createElement("button");
		$colorPallet.classList.add(styles.button, styles.color_pallet);
		$colorPallet.appendChild(getColorPaletteSVG());
		$colorPallet.onclick = this.handleExpandColorPalette;

		const $palletOptions: HTMLDivElement = document.createElement("div");
		$palletOptions.className = styles.pallet_options;
		$palletOptions.classList.add(styles.shadow_right);
		$palletOptions.classList.add(styles.disable_shadow_transitions);

		$palletOptions.addEventListener("wheel", (event: WheelEvent) => {
			event.preventDefault();

			$palletOptions.scrollBy(event.deltaY > 0 ? 100 : -100, 0);
		}, {passive: false});

		const SCROLL_ERROR_WINDOW = 10;

		$palletOptions.onscroll = () => {
			$palletOptions.classList.toggle(
				styles.shadow_left,
				$palletOptions.scrollLeft > 0 + SCROLL_ERROR_WINDOW
			);

			$palletOptions.classList.toggle(
				styles.shadow_right,
				$palletOptions.scrollLeft < $palletOptions.scrollWidth - $palletOptions.offsetWidth - SCROLL_ERROR_WINDOW
			);
		};

		const THEME_COUNT = 10;
		$colorPalletContainer.style.setProperty("--theme-count", THEME_COUNT.toString());

		const $html: HTMLHtmlElement = document.querySelector(":root")!;

		let $selectedPalletOption: HTMLButtonElement | null = null;
		let selectedTheme: number = this.state.settings.theme;

		if (selectedTheme < 0) {
			selectedTheme = 0;
		}

		for (let i = 0; i < THEME_COUNT; ++i) {
			const $palletOption: HTMLButtonElement = document.createElement("button");
			$palletOption.classList.add("pallet-option", styles.pallet_option);

			const handleSelectOption = (): void => {

				const $blackScreen: HTMLDivElement = document.createElement("div");
				$blackScreen.className = styles.black_screen;
				$blackScreen.classList.add(styles.appear);

				$blackScreen.onanimationend = () => {
					if ($blackScreen.classList.contains(styles.appear)) {
						$blackScreen.classList.remove(styles.appear);

						$html.setAttribute("theme", i.toString());
						$palletOption.classList.add(styles.selected);

						if ($selectedPalletOption === null) {
							return;
						}

						$selectedPalletOption.classList.remove(styles.selected);
						$selectedPalletOption = $palletOption;

						this.props.changeSettings({"theme": i});
						this.props.refreshGameTheme();

						$colorPalletContainer.classList.remove(styles.expanded);

						$blackScreen.classList.add(styles.disappear);
						return;
					}

					$blackScreen.remove();
				}

				this.$root.appendChild($blackScreen);
			};

			$palletOption.onclick = handleSelectOption;

			$palletOption.setAttribute("theme", i.toString());

			$palletOptions.appendChild($palletOption);

			if (i === selectedTheme) {
				$selectedPalletOption = $palletOption;
				handleSelectOption();
			}
		}

		$colorPalletContainer.appendChild($colorPallet);
		$colorPalletContainer.appendChild($palletOptions);

		$rightSide.appendChild($colorPalletContainer);

		this.$root.appendChild($leftSide);
		this.$root.appendChild($center);
		this.$root.appendChild($rightSide);

		this.domElements = {
			minesCounterContainer: $minesCounterContainer,
			minesCounter: $counter,
			timeElapsed: $timeElapsed,
			center: $center,
			goBack: $goBack,
			colorPalletContainer: $colorPalletContainer,
			palletOptions: $palletOptions,
			selectedPalletOption: $selectedPalletOption!,
		};
	}

	renderMines = (game: Minesweeper | null, hide: boolean = false): void => {
		
		if (this.domElements === null) {
			return;
		}

		this.domElements.center.classList.remove(styles.disabled);

		this.domElements.center.classList.toggle(styles.hidden, hide);

		if (hide || game === null) {
			return;
		}

		this.domElements.minesCounter.innerText = (game.mines - game.markedMinesCount).toString();
	}

	renderTimeElapsed = (game: Minesweeper | null, hide: boolean = false): void => {

		if (this.domElements === null) {
			return;
		}

		this.domElements.timeElapsed.classList.toggle(styles.hidden, hide);

		if (hide || game === null) {
			clearInterval(this.updateTimeIntervalID);
			this.updateTimeIntervalID = -1;
			return;
		}

		if (game && this.updateTimeIntervalID !== -1) {
			return;
		}

		const updateTimeElapsed = (): void => {

			if (game.hasStarted() && game.hasEnded()) {
				clearInterval(this.updateTimeIntervalID);
				this.updateTimeIntervalID = -1;
				return;
			}

			if (!this.domElements) {
				clearInterval(this.updateTimeIntervalID);
				this.updateTimeIntervalID = -1;
				return;
			}

			this.domElements.timeElapsed.classList.remove(styles.hide)

			this.domElements.timeElapsed.innerText = game.hasStarted()
				? getFormatedTime(game.getElapsedSeconds())
				: "0S";
		}

		updateTimeElapsed();
		this.updateTimeIntervalID = window.setInterval(updateTimeElapsed, 1000);
	}

	renderGoBack(onClick: ((event: MouseEvent) => void) | null, hide: boolean = false): void {

		if (this.domElements === null) {
			return;
		}

		this.domElements.goBack.classList.remove(styles.disabled);

		this.domElements.goBack.classList.toggle(styles.hidden, hide);
		this.domElements.goBack.onclick = onClick;
	}

	private handleExpandColorPalette = (): void => {

		if (this.domElements === null) {
			return;
		}

		if (this.domElements.palletOptions.classList.contains(styles.disable_shadow_transitions)) {

			const $palletOptions: HTMLDivElement = this.domElements.palletOptions;

			const PALLET_FULL_EXPANDED_ERROR_WINDOW = 40;

			if ($palletOptions.offsetWidth + PALLET_FULL_EXPANDED_ERROR_WINDOW > $palletOptions.scrollWidth) {
				$palletOptions.classList.remove(styles.shadow_right);
			}

			setTimeout(() => {
				$palletOptions.classList.remove(styles.disable_shadow_transitions);
			}, 1000);

			$palletOptions.scroll(0, 0);
		}

		this.domElements.colorPalletContainer.classList.toggle(styles.expanded);
	}

	clean() {

		clearInterval(this.updateTimeIntervalID);
		this.updateTimeIntervalID = -1;

		this.$root.innerHTML = '';
		this.$root.className = '';
	}
}
