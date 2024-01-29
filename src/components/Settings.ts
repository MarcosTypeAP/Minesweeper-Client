import styles from "./Settings.module.css"
import getMineSVG from "../icons/Mine"
import getFlagSVG from "../icons/Flag"
import getResetSVG from "../icons/Reset"

type SettingsProps = {
	openSignup: () => void;
	openSettings: () => void;
	isLoggedIn: () => boolean;
	logout: () => void;
	changeSettings: (newSettings: Partial<GameSettings>) => void;
	getSettings: (getDefault?: boolean) => GameSettings;
	resetDefaultSettings: () => void;
	reloadSettings: () => void;
	syncData: () => void;
	getTestAccountCredentials: () => TestAccountCredentials | null;
};

type SettingsState = {
};

type SettingsDOMElements = {
	accountButton: HTMLButtonElement;
	defaultActionMineButton: HTMLButtonElement;
	defaultActionFlagButton: HTMLButtonElement;
};

export default class SettingsComponent implements Component {

	private $root: HTMLElement;

	private props: SettingsProps;

	private domElements: SettingsDOMElements | null;

	private state: SettingsState;

	constructor(root: HTMLElement, props: SettingsProps) {

		this.$root = root;
		this.props = props;

		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): SettingsState {

		return {};
	}

	render(): void {

		this.clean();

		const settings: GameSettings = this.props.getSettings();

		this.$root.className = styles.settings;

		const $pageTitle: HTMLHeadingElement = document.createElement("h1");
		$pageTitle.className = styles.page_title;
		$pageTitle.innerText = "Settings";

		this.$root.appendChild($pageTitle);

		const $accountButton: HTMLButtonElement = document.createElement("button");
		$accountButton.className = styles.account_button;
		$accountButton.classList.add(styles.section_button);
		$accountButton.innerText = this.props.isLoggedIn() ? "LOGOUT" : "SIGN UP";
		$accountButton.onclick = this.props.isLoggedIn() ? this.handleLogout : this.handleOpenSignup;

		const testAccountCredentials: TestAccountCredentials | null = this.props.getTestAccountCredentials();
		let $accountTestCredentials: HTMLElement | undefined = undefined;

		if (testAccountCredentials && this.props.isLoggedIn()) {
			$accountTestCredentials = document.createElement("code");
			$accountTestCredentials.className = styles.account_test_credentials;
			$accountTestCredentials.innerText = `username: ${testAccountCredentials.username}\npassword: ${testAccountCredentials.password}`;
		}

		const $accountSection: HTMLElement = this.createSettingsSection(
			"Account",
			"Sign up to save your times, unfinished games and settings so you can sync them with other devices.",
			$accountButton,
			$accountTestCredentials
		);

		this.$root.appendChild($accountSection);

		const $syncSection: HTMLElement = this.createSettingsSection(
			"Sync Data",
			"Choose whether you want to sync your local data with other devices. You must be logged in.",
			this.createToggle("syncData", settings.syncData, (_, value) => {
				if (value !== undefined && value) {
					this.props.syncData();
				}
			})
		);

		this.$root.appendChild($syncSection);

		const $actionToggleSection: HTMLElement = this.createSettingsSection(
			"Use Action Toggle",
			"Choose whether there is a mine/flag toggle at the bottom of the screen.",
			this.createToggle("actionToggle", settings.actionToggle)
		);

		this.$root.appendChild($actionToggleSection);

		const $defaultActionButtons: HTMLDivElement = document.createElement("div");
		$defaultActionButtons.className = styles.default_action_buttons;

		const $defaultActionMineButton: HTMLButtonElement = document.createElement("button");
		$defaultActionMineButton.className = styles.mine_button;
		$defaultActionMineButton.classList.add(styles.section_button, styles.toggle, styles.icon_button);
		$defaultActionMineButton.classList.toggle(styles.on, settings.defaultAction === "dig");
		$defaultActionMineButton.appendChild(getMineSVG());
		$defaultActionMineButton.onclick = this.handleChangeDefaultActionToDig;

		$defaultActionButtons.appendChild($defaultActionMineButton);

		const $defaultActionFlagButton: HTMLButtonElement = document.createElement("button");
		$defaultActionFlagButton.className = styles.flag_button;
		$defaultActionFlagButton.classList.add(styles.section_button, styles.toggle, styles.icon_button);
		$defaultActionFlagButton.classList.toggle(styles.on, settings.defaultAction === "mark");
		$defaultActionFlagButton.appendChild(getFlagSVG());
		$defaultActionFlagButton.onclick = this.handleChangeDefaultActionToMark;

		$defaultActionButtons.appendChild($defaultActionFlagButton);

		const $defaultActionSection: HTMLElement = this.createSettingsSection(
			"Default Action",
			"Choose, which action in enabled by default. Either dig or mark.",
			$defaultActionButtons
		);

		this.$root.appendChild($defaultActionSection);

		const $longTapDelaySection: HTMLElement = this.createSettingsSection(
			"Long Tap Delay",
			"Choose how long does it take to keep your finger on a cell to use the secondary action.",
			this.createRange("longTapDelay", settings.longTapDelay, 150, 450, 10, "ms")
		);

		this.$root.appendChild($longTapDelaySection);

		const $easyDiggingSection: HTMLElement = this.createSettingsSection(
			"Easy Digging",
			"Clicking a cell with a number will dig all of its surrounding unmarked cells with one tap. It will work only if the amount of surrounding marked cells matches the clicked digit.",
			this.createToggle("easyDigging", settings.easyDigging)
		);

		this.$root.appendChild($easyDiggingSection);

		const $disableInitialZoomSection: HTMLElement = this.createSettingsSection(
			"Initial Zoom",
			"Choose whether there is a zoom animation at the beginning of a game.",
			this.createToggle("initialZoom", settings.initialZoom)
		);

		this.$root.appendChild($disableInitialZoomSection);

		const $cellsResolutionSection: HTMLElement = this.createSettingsSection(
			"Resolution",
			"Adjust cell resolution if you are looking for higher quality or are experiencing performance issues.",
			this.createRange("resolution", settings.resolution, 50, 300, 10, "px")
		);

		this.$root.appendChild($cellsResolutionSection);

		const $vibrationSection: HTMLElement = this.createSettingsSection(
			"Vibration",
			"Choose whether to enable vibration.",
			this.createToggle("vibration", settings.vibration)
		);

		this.$root.appendChild($vibrationSection);

		const $vibrationIntensitySection: HTMLElement = this.createSettingsSection(
			"Vibration Intensity",
			"Adjust the vibration intensity of the secondary action and when you dig a mine.",
			this.createRange("vibrationIntensity", settings.vibrationIntensity, 10, 400, 10, "ms", (event?: Event) => {
				if (!event) {
					return;
				}

				const $input: HTMLInputElement = event.currentTarget as HTMLInputElement;
				navigator.vibrate(parseInt($input.value));
			})
		)

		this.$root.appendChild($vibrationIntensitySection);

		const $resetSettings: HTMLButtonElement = document.createElement("button");
		$resetSettings.className = styles.reset_settings;
		$resetSettings.classList.add(styles.section_button, styles.icon_button);
		$resetSettings.appendChild(getResetSVG());
		$resetSettings.onclick = this.handleResetSettings;

		const $resetSettingsSection: HTMLElement = this.createSettingsSection(
			"Reset Settings",
			"Reset default settings in case you broke something.",
			$resetSettings
		);

		this.$root.appendChild($resetSettingsSection);

		this.domElements = {
			accountButton: $accountButton,
			defaultActionMineButton: $defaultActionMineButton,
			defaultActionFlagButton: $defaultActionFlagButton,
		};
	}

	private handleResetSettings = (): void => {

		this.props.resetDefaultSettings();
		this.props.reloadSettings();
	}

	private handleChangeDefaultActionToDig = (): void => {

		if (!this.domElements) {
			return;
		}

		this.domElements.defaultActionMineButton.classList.add(styles.on);
		this.domElements.defaultActionFlagButton.classList.remove(styles.on);

		this.props.changeSettings({defaultAction: "dig"});
	}

	private handleChangeDefaultActionToMark = (): void => {

		if (!this.domElements) {
			return;
		}

		this.domElements.defaultActionFlagButton.classList.add(styles.on);
		this.domElements.defaultActionMineButton.classList.remove(styles.on);

		this.props.changeSettings({defaultAction: "mark"});
	}

	private createToggle(
		property: BooleanKeys<GameSettings>,
		value: boolean,
		onClick?: (event?: MouseEvent, value?: boolean) => void
	): HTMLButtonElement {

		const $toggle: HTMLButtonElement = document.createElement("button");
		$toggle.classList.add(
			styles.section_button,
			styles.toggle,
		);
		$toggle.classList.toggle(styles.on, value);

		$toggle.onclick = (event: MouseEvent) => {
			value = !value;
			$toggle.classList.toggle(styles.on, value);
			this.props.changeSettings({[property]: value});
			onClick && onClick(event, value);
		};

		return $toggle;
	}

	private createRange<Setting extends NumberKeys<GameSettings>>(
		settingProperty: Setting,
		value: GameSettings[Setting],
		min: number,
		max: number,
		step: number,
		unit: string,
		onChange?: (event?: Event) => void
	): HTMLDivElement {

		const $range: HTMLDivElement = document.createElement("div");
		$range.classList.add(styles.section_range);

		const $rangeCurrentValue: HTMLSpanElement = document.createElement("span");
		$rangeCurrentValue.classList.add(styles.section_range_value);
		$rangeCurrentValue.innerText = `${value} ${unit}`;

		$range.appendChild($rangeCurrentValue);

		const $rangeInput: HTMLInputElement = document.createElement("input");
		$rangeInput.classList.add(styles.section_range_input);
		$rangeInput.type = "range";
		$rangeInput.min = min.toString();
		$rangeInput.max = max.toString();
		$rangeInput.step = step.toString();
		$rangeInput.value = value.toString();
		$rangeInput.oninput = () => {
			$rangeCurrentValue.innerText = $rangeInput.value + " " + unit;
			const currRangePersentage: number = (100 / (max - min)) * (parseInt($rangeInput.value) - min);
			$rangeInput.style.setProperty("--range-persentage", `${Math.round(currRangePersentage)}%`);
		}
		$rangeInput.onchange = (event: Event) => {
			this.props.changeSettings({[settingProperty]: parseInt($rangeInput.value)});
			onChange && onChange(event);
		};

		$rangeInput.oninput({} as Event);

		$range.appendChild($rangeInput);

		const $rangeEdgeValues: HTMLDivElement = document.createElement("div");
		$rangeEdgeValues.className = styles.section_range_edge_values;

		const $rangeMin: HTMLSpanElement = document.createElement("span");
		$rangeMin.classList.add(styles.section_range_edge_value);
		$rangeMin.innerText = $rangeInput.min + " " + unit;

		$rangeEdgeValues.appendChild($rangeMin);

		const $rangeMax: HTMLSpanElement = document.createElement("span");
		$rangeMax.classList.add(styles.section_range_edge_value);
		$rangeMax.innerText = $rangeInput.max + " " + unit;

		$rangeEdgeValues.appendChild($rangeMax);

		$range.appendChild($rangeEdgeValues);

		return $range;
	}

	private createSettingsSection(title: string, description: string, $input: HTMLElement, $extra?: HTMLElement): HTMLElement {

		const $section: HTMLElement = document.createElement("section");
		$section.classList.add(styles.section);

		const $title: HTMLHeadingElement = document.createElement("h2");
		$title.classList.add(styles.section_title);
		$title.innerText = title;

		$section.appendChild($title);

		const $description: HTMLParagraphElement = document.createElement("p");
		$description.classList.add(styles.section_description);
		$description.innerText = description;

		$section.appendChild($description);

		$extra && $section.appendChild($extra);

		$section.appendChild($input);

		return $section;
	}

	private handleLogout = (): void => {

		if (!this.domElements) {
			return;
		}

		this.domElements.accountButton.innerText = "SIGN UP";

		this.props.logout();
		this.props.openSettings();
	}

	private handleOpenSignup = (): void => {

		this.props.openSignup();
	}

	clean(): void {

		this.state = this.getInitState();
		
		this.$root.innerHTML = '';
		this.$root.className = '';
	}
}
