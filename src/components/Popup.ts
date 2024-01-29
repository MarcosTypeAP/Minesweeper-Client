import styles from "./Popup.module.css"

export type PopupProps = {
	title?: string;
	message?: string;
	isError?: boolean;
	isMessageOpaque?: boolean;
	isMessageBold?: boolean;
	buttonText1?: string;
	buttonText2?: string;
	onClick1?: () => void;
	onClick2?: () => void;
	onClose?: () => void;
}

type PopupState = {
}

type PopupDOMElements = {
}

export default class PopupComponent implements Component {

	private $root: HTMLElement;

	private props: PopupProps;

	private domElements: PopupDOMElements | null;

	private state: PopupState;

	private TIME_BEFORE_CLOSE_POPUP = 300;

	constructor(root: HTMLElement, props: PopupProps) {

		this.$root = root;
		this.props = props;

		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): PopupState {

		return {
		};
	}

	render(): void {

		const renderTime: number = (new Date()).getTime();

		const closePopup = (onClick?: () => void): void => {

			if ((new Date()).getTime() - renderTime < this.TIME_BEFORE_CLOSE_POPUP) {
				return;
			}

			$darkBackground.onanimationend = (event: AnimationEvent) => {
				event.stopPropagation();
				this.$root.removeChild($darkBackground);
			};

			$popup.onanimationend = (event: AnimationEvent) => {
				event.stopPropagation();
				this.$root.removeChild($popup);
				onClick && onClick();
				this.props.onClose && this.props.onClose();
			};

			$darkBackground.classList.add(styles.hidden);
			$popup.classList.add(styles.hidden);
		};

		const $darkBackground: HTMLDivElement = document.createElement("div");
		$darkBackground.className = styles.dark_background;
		$darkBackground.onclick = () => closePopup();

		const $popup: HTMLDivElement = document.createElement("div");
		$popup.className = styles.popup;
		$popup.classList.toggle(styles.error, Boolean(this.props.isError));

		if (this.props.title) {
			const $title: HTMLParagraphElement = document.createElement("h1");
			$title.className = styles.popup_title;
			$title.innerText = this.props.title;

			$popup.appendChild($title);
		}

		if (this.props.message) {
			const $message: HTMLParagraphElement = document.createElement("p");
			$message.className = styles.popup_message;
			$message.classList.toggle(styles.opaque, Boolean(this.props.isMessageOpaque));
			$message.classList.toggle(styles.bold, Boolean(this.props.isMessageBold));
			$message.classList.toggle(styles.with_title, Boolean(this.props.title));
			$message.innerText = this.props.message;

			$popup.appendChild($message);
		}

		if (this.props.title && !this.props.message) {
			$popup.classList.add(styles.no_message);
		}

		const $buttons: HTMLDivElement = document.createElement("div");
		$buttons.className = styles.popup_buttons;

		if (this.props.buttonText1) {
			const $button1: HTMLButtonElement = document.createElement("button");
			$button1.classList.add(styles.button);
			$button1.innerText = this.props.buttonText1;
			$button1.onclick = () => closePopup(this.props.onClick1);

			$buttons.appendChild($button1);
		}

		if (this.props.buttonText2) {
			const $button2: HTMLButtonElement = document.createElement("button");
			$button2.classList.add(styles.button);
			$button2.innerText = this.props.buttonText2;
			$button2.onclick = () => closePopup(this.props.onClick2);

			$buttons.appendChild($button2);
		}

		$popup.appendChild($buttons);

		this.$root.appendChild($darkBackground);
		this.$root.appendChild($popup);
	}

	clean(): void {

	}
}
