import {openSettings, syncDataOnlyGet} from "../main";
import {makeRequest} from "../models/Api";
import {getDeviceID, isTestAccountUsername, logoutDevice, setAuthTokens, setDeviceID, setTestAccountCredentials} from "../models/Auth";
import {getSettings} from "../models/Settings";
import styles from "./AccessAccount.module.css";
import PopupComponent, {PopupProps} from "./Popup";
import getEyeSVG from "../icons/Eye";
import getEyeSlashSVG from "../icons/EyeSlash";

export type AccessMethod = "login" | "signup";

const API_URL = import.meta.env.VITE_API_URL;

const SIGNUP_URL = API_URL + "/auth/signup";
const LOGIN_URL = API_URL + "/auth/tokens";
const TEST_ACCOUNT_URL = API_URL + "/auth/testaccount";

type AccessAccountProps = {};

type AccessAccountState = {
	accessMethod: AccessMethod;
	settings: GameSettings;
	testaccountTimeoutID: number;
};

type AccessAccountDOMElements = {
	pageTitle: HTMLHeadingElement;
	username: HTMLSpanElement;
	usernameInput: HTMLInputElement;
	usernameError: HTMLSpanElement;
	password: HTMLSpanElement;
	passwordInput: HTMLInputElement;
	passwordError: HTMLSpanElement;
	bottomPart: HTMLDivElement;
	signup: HTMLButtonElement;
	login: HTMLButtonElement;
	loading: HTMLDivElement;
};

export default class AccessAccountComponent implements Component {

	private $root: HTMLElement;

	private props: AccessAccountProps;

	private domElements: AccessAccountDOMElements | null;

	private state: AccessAccountState;

	constructor(root: HTMLElement, props: AccessAccountProps) {

		this.$root = root;
		this.props = props;

		this.state = this.getInitState();
		this.domElements = null;
	}

	private getInitState(): AccessAccountState {

		return {
			accessMethod: "signup",
			settings: getSettings(),
			testaccountTimeoutID: -1,
		};
	}

	render(): void {

		this.clean();

		this.$root.className = styles.access_account;

		const $pageTitle: HTMLHeadingElement = document.createElement("h1");
		$pageTitle.className = styles.page_title;
		$pageTitle.innerText = this.state.accessMethod === "signup" ? "Sign Up" : "Log In";

		this.$root.appendChild($pageTitle);

		const $username: HTMLHeadingElement = document.createElement("h2");
		$username.classList.add(styles.input_name);
		$username.innerText = "Username";

		this.$root.appendChild($username);

		const $usernameInput: HTMLInputElement = document.createElement("input");
		$usernameInput.classList.add(styles.input);
		$usernameInput.type = "text";
		$usernameInput.placeholder = "Username";

		this.$root.appendChild($usernameInput);

		const $usernameError: HTMLSpanElement = document.createElement("span");
		$usernameError.classList.add(styles.input_error, styles.hidden);

		this.$root.appendChild($usernameError);

		const $password: HTMLHeadingElement = document.createElement("h2");
		$password.classList.add(styles.input_name);
		$password.innerText = "Password";

		this.$root.appendChild($password);

		const $passwordInputDiv: HTMLDivElement = document.createElement("div");
		$passwordInputDiv.className = styles.password_input_div;

		const $passwordInput: HTMLInputElement = document.createElement("input");
		$passwordInput.className = styles.password_input;
		$passwordInput.classList.add(styles.input);
		$passwordInput.type = "password";
		$passwordInput.placeholder = "Password";
		$passwordInput.onkeydown = (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				if (this.state.accessMethod === "login") {
					this.handleLogin();
					return;
				}

				this.handleSignup();
			}
		}

		$passwordInputDiv.appendChild($passwordInput);

		const $passwordInputEye: SVGElement = getEyeSVG();
		$passwordInputEye.classList.add(styles.eye);
		$passwordInputEye.onclick = () => {
			$passwordInput.setAttribute("type", "text");
			$passwordInputEye.classList.add(styles.hidden);
			$passwordInputEyeSlash.classList.remove(styles.hidden);
		}

		$passwordInputDiv.appendChild($passwordInputEye);

		const $passwordInputEyeSlash: SVGElement = getEyeSlashSVG();
		$passwordInputEyeSlash.classList.add(styles.eye, styles.hidden);
		$passwordInputEyeSlash.onclick = () => {
			$passwordInput.setAttribute("type", "password");
			$passwordInputEyeSlash.classList.add(styles.hidden);
			$passwordInputEye.classList.remove(styles.hidden);
		}

		$passwordInputDiv.appendChild($passwordInputEyeSlash);

		this.$root.appendChild($passwordInputDiv);

		const $passwordError: HTMLSpanElement = document.createElement("span");
		$passwordError.classList.add(styles.input_error, styles.hidden);

		this.$root.appendChild($passwordError);

		const $bottomPart: HTMLDivElement = document.createElement("div");
		$bottomPart.className = styles.bottom_part;
		$bottomPart.classList.add(this.state.accessMethod === "signup" ? styles.signup_layout : styles.login_layout);

		const $signup: HTMLButtonElement = document.createElement("button");
		$signup.className = styles.signup_button;
		$signup.classList.add(styles.button);
		$signup.innerText = "Sign up";
		$signup.onclick = () => this.state.accessMethod === "signup"
			? this.handleSignup()
			: this.changeAccessMethod("signup");

		$bottomPart.appendChild($signup);

		const $login: HTMLButtonElement = document.createElement("button");
		$login.className = styles.login_button;
		$login.classList.add(styles.button);
		$login.innerText = "Log in";
		$login.onclick = () => this.state.accessMethod === "login"
			? this.handleLogin()
			: this.changeAccessMethod("login");

		$bottomPart.appendChild($login);

		const $changeToSignupMessage: HTMLSpanElement = document.createElement("span");
		$changeToSignupMessage.className = styles.change_to_signup_message;
		$changeToSignupMessage.classList.add(styles.change_access_method_message);
		$changeToSignupMessage.innerText = "Don't have an account yet? Sign up."

		$bottomPart.appendChild($changeToSignupMessage);

		const $changeToLoginMessage: HTMLSpanElement = document.createElement("span");
		$changeToLoginMessage.className = styles.change_to_login_message;
		$changeToLoginMessage.classList.add(styles.change_access_method_message);
		$changeToLoginMessage.innerText = "Already have an account? Log in!"

		$bottomPart.appendChild($changeToLoginMessage);

		const $loading: HTMLDivElement = document.createElement("div");
		$loading.className = styles.loading;
		$loading.classList.add(styles.hidden);

		const $loadingInnerCircle: HTMLDivElement = document.createElement("div");
		$loadingInnerCircle.className = styles.loading_inner_circle;

		$loading.appendChild($loadingInnerCircle);

		const $loadingCircleCutter1: HTMLDivElement = document.createElement("div");
		$loadingCircleCutter1.className = styles.loading_circle_cutter;
		$loadingCircleCutter1.classList.add(styles.first);

		$loading.appendChild($loadingCircleCutter1);

		const $loadingCircleCutter2: HTMLDivElement = document.createElement("div");
		$loadingCircleCutter2.className = styles.loading_circle_cutter;
		$loadingCircleCutter2.classList.add(styles.second);

		$loading.appendChild($loadingCircleCutter2);

		$bottomPart.appendChild($loading);

		this.$root.appendChild($bottomPart);

		const handleCancelTestAccountPopup = (): void => {
			clearTimeout(this.state.testaccountTimeoutID);
			this.$root.removeEventListener("click", handleCancelTestAccountPopup);
		}

		this.$root.addEventListener("click", handleCancelTestAccountPopup);

		this.state.testaccountTimeoutID = setTimeout(() => {
			(new PopupComponent(
				this.$root,
				{
					title: "Don't want to have an account?",
					message: "Get one for testing! But it will only persist as long as you are logged in.",
					buttonText1: "Close",
					buttonText2: "Get Test Account",
					onClick2: this.handleTestAccount
				}
			)).render();
		}, 1500);

		this.domElements = {
			pageTitle: $pageTitle,
			username: $username,
			usernameInput: $usernameInput,
			usernameError: $usernameError,
			password: $password,
			passwordInput: $passwordInput,
			passwordError: $passwordError,
			bottomPart: $bottomPart,
			signup: $signup,
			login: $login,
			loading: $loading,
		};
	}

	private handleTestAccount = async (): Promise<void> => {

		this.setLoading(true);
		const response: ApiResponse = await makeRequest(TEST_ACCOUNT_URL, "POST");
		this.setLoading(false);

		if (response.error) {
			console.error("Error requesting a test account:", response.data);
			this.popupError({
				title: "It seems like we have problems on the other side.",
				message: "We are trying to solve it. Please be patient and try to login later."
			});
			return;
		}

		setTestAccountCredentials(response.data.username, response.data.password);

		const currDeviceID: number | null = getDeviceID(response.data.username);

		if (currDeviceID !== null) {
			await logoutDevice(currDeviceID, response.data.username, response.data.password);
		}

		this.handleLogin(response.data.username, response.data.password);
	}

	private changeAccessMethod = (accessMethod: AccessMethod): void => {

		if (!this.domElements) {
			return;
		}

		const $pageTitle: HTMLHeadingElement = this.domElements.pageTitle;
		const $bottomPart: HTMLDivElement = this.domElements.bottomPart;

		const $login: HTMLButtonElement = this.domElements.login;
		const $signup: HTMLButtonElement = this.domElements.signup;

		const $usernameInput: HTMLInputElement = this.domElements.usernameInput;
		const $usernameError: HTMLSpanElement = this.domElements.usernameError;

		const $passwordInput: HTMLInputElement = this.domElements.passwordInput;
		const $passwordError: HTMLSpanElement = this.domElements.passwordError;

		$login.disabled = true;
		$signup.disabled = true;

		this.state.accessMethod = accessMethod;

		this.$root.classList.add("hidden");

		this.$root.onanimationend = () => {
			this.$root.onanimationend = null;

			$bottomPart.classList.toggle(styles.signup_layout, accessMethod === "signup");
			$bottomPart.classList.toggle(styles.login_layout, accessMethod === "login");

			$pageTitle.innerText = this.state.accessMethod === "signup" ? "Sign Up" : "Log In";

			this.setInputError($usernameInput, $usernameError, null);
			this.setInputError($passwordInput, $passwordError, null);

			$login.disabled = false;
			$signup.disabled = false;

			this.$root.classList.remove("hidden");
		};
	}

	private setLoading(isLoading: boolean = true): void {

		if (!this.domElements) {
			return;
		}

		this.domElements.loading.classList.toggle(styles.hidden, !isLoading);
		this.domElements.username.classList.toggle(styles.disabled, isLoading);
		this.domElements.usernameInput.disabled = isLoading;
		this.domElements.password.classList.toggle(styles.disabled, isLoading);
		this.domElements.passwordInput.disabled = isLoading;
		this.domElements.login.disabled = isLoading;
		this.domElements.signup.disabled = isLoading;
	}

	private setInputError($input: HTMLInputElement, $errorMessage: HTMLSpanElement, message: string | null): void {

		$input.classList.toggle(styles.error, Boolean(message));

		$errorMessage.classList.toggle(styles.hidden, !Boolean(message));

		if (!message) {
			return;
		}

		$errorMessage.innerText = message;
	}

	private validateUsername(username: string, isForSignup: boolean): boolean {

		if (!this.domElements) {
			return false;
		}

		const $usernameInput: HTMLInputElement = this.domElements.usernameInput;
		const $usernameError: HTMLSpanElement = this.domElements.usernameError;

		const setUsernameError = (message: string | null) => this.setInputError($usernameInput, $usernameError, message);

		if (username.length === 0) {
			setUsernameError(isForSignup ? "Please enter a username." : "Please enter your username.");
			return false;
		}

		if (!isForSignup) {
			setUsernameError(null);
			return true;
		}

		if (username.length > 20) {
			setUsernameError("Please use a shorter name, the maximum length is 20.");
			return false;
		}

		const validCharactersRegex: RegExp = /^[a-zA-Z0-9_\-. ]+$/;

		if (!validCharactersRegex.test(username)) {
			setUsernameError("Please use only letters, numbers, spaces, periods, hyphens and underscores.");
			return false;
		}

		this.setInputError($usernameInput, $usernameError, null);
		return true;
	}

	private validatePassword(password: string, isForSignup: boolean): boolean {

		if (!this.domElements) {
			return false;
		}

		const $passwordInput: HTMLInputElement = this.domElements.passwordInput;
		const $passwordError: HTMLSpanElement = this.domElements.passwordError;

		const setPasswordError = (message: string | null) => this.setInputError($passwordInput, $passwordError, message);

		if (password.length === 0) {
			setPasswordError(isForSignup ? "Please enter a password." : "Please enter your password.");
			return false;
		}

		if (!isForSignup) {
			setPasswordError(null);
			return true;
		}

		if (password.length < 12) {
			setPasswordError("Please use a longer password, at least 12 characters long.");
			return false;
		}

		const oneLowercaseRegex: RegExp = /[a-z]/;
		if (!oneLowercaseRegex.test(password)) {
			setPasswordError("Please include at least 1 lowercase letter.");
			return false;
		}

		const oneUppercaseRegex: RegExp = /[A-Z]/;
		if (!oneUppercaseRegex.test(password)) {
			setPasswordError("Please include at least 1 uppercase letter.");
			return false;
		}

		const oneNumberRegex: RegExp = /[0-9]/;
		if (!oneNumberRegex.test(password)) {
			setPasswordError("Please include at least 1 number.");
			return false;
		}

		const sameConsecutiveCharactersRegex: RegExp = /([a-zA-Z0-9._\- ])\1{2}/;
		if (sameConsecutiveCharactersRegex.test(password)) {
			setPasswordError("Please try not to use the same character consecutively more than twice.");
			return false;
		}

		const numbersRegex: RegExp = /([0-9]+)/;
		const passwordNumbers: string[] = numbersRegex.exec(password) ?? [];

		for (let i = 0; i < passwordNumbers.length; ++i) {
			const numbers: string = passwordNumbers[i];

			if (numbers.length <= 2) {
				continue;
			}

			for (let j = 0; j < numbers.length - 2; ++j) {
				if (parseInt(numbers[j]) + 1 === parseInt(numbers[j + 1]) && parseInt(numbers[j + 1]) + 1 === parseInt(numbers[j + 2])) {
					setPasswordError("Please try not to use consecutive numbers in increasing order more than twice.");
					return false;
				}

				if (parseInt(numbers[j]) - 1 === parseInt(numbers[j + 1]) && parseInt(numbers[j + 1]) - 1 === parseInt(numbers[j + 2])) {
					setPasswordError("Please try not to use consecutive numbers in decreasing order more than twice.");
					return false;
				}
			}
		}

		setPasswordError(null);
		return true;
	}

	private handleLogin = async (username?: string, password?: string): Promise<void> => {

		if (!this.domElements) {
			return;
		}

		if (!username || !password) {
			username = this.domElements.usernameInput.value.trim();
			password = this.domElements.passwordInput.value;

			const isValidUsername: boolean = this.validateUsername(username, false);
			const isValidPassword: boolean = this.validatePassword(password, false);

			if (!isValidUsername || !isValidPassword) {
				return;
			}
		}

		const requestData: LoginRequestData = {
			username,
			password
		};

		const deviceID: number | null = getDeviceID(username);
		const queryParams: string = deviceID !== null ? `?device_id=${deviceID}` : "";

		this.setLoading(true);
		const response: ApiResponse = await makeRequest(LOGIN_URL + queryParams, "POST", JSON.stringify(requestData));
		this.setLoading(false);

		if (response.error) {
			if (response.status == 401) {
				this.popupError({
					title: "Invalid username or password.",
					message: "Please try again with the correct credentials or create an account if you haven't registered yet.",
					buttonText2: "Go Sign Up",
					onClick2: () => this.changeAccessMethod("signup")
				});

				return;
			}

			console.error("Login error:", response.data);
			this.popupError({
				title: "It seems like we have problems on the other side.",
				message: "We are trying to solve it. Please be patient and try to login later."
			});
			return;
		}

		setAuthTokens(response.data.accessToken, response.data.refreshToken);
		setDeviceID(response.data.deviceId, username);
		
		if (isTestAccountUsername(username)) {
			setTestAccountCredentials(username, password);
		}

		if (this.state.settings.syncData) {
			syncDataOnlyGet();
		}

		openSettings();
	}

	private handleSignup = async (): Promise<void> => {

		if (!this.domElements) {
			return;
		}

		const username: string = this.domElements.usernameInput.value.trim();
		const password: string = this.domElements.passwordInput.value;

		const isValidUsername: boolean = this.validateUsername(username, true);
		const isValidPassword: boolean = this.validatePassword(password, true);

		if (!isValidUsername || !isValidPassword) {
			return;
		}

		if (!this.validatePassword(password, true)) {
			return;
		}

		const requestData: SignupRequestData = {
			username,
			password
		};

		this.setLoading(true);
		const response: ApiResponse = await makeRequest(SIGNUP_URL, "POST", JSON.stringify(requestData));
		this.setLoading(false);

		if (response.error) {

			if (response.data.detail.username_in_use) {
				this.setInputError(
					this.domElements.usernameInput,
					this.domElements.usernameError,
					"Please choose another username, this one is already taken."
				)

				return;
			}
			 
			console.error("Signup error:", response.data);
			this.popupError({
				title: "It seems like we have problems on the other side.",
				message: "We are trying to solve it. Please be patient and try to sign up later."
			});
			return;
		}

		this.popupError({
			isError: false,
			title: "Account created successfuly.",
			buttonText2: "Go Log in",
			onClick2: () => this.changeAccessMethod("login")
		});
	}

	private popupError(props: PopupProps = {}): void {

		const popupComponent: PopupComponent = new PopupComponent(
			this.$root,
			{
				isError: true,
				buttonText1: "Close",
				...props
			}
		);

		popupComponent.render();
	}

	clean(): void {

		this.state = this.getInitState();
		
		this.$root.innerHTML = '';
		this.$root.className = '';
	}
}
