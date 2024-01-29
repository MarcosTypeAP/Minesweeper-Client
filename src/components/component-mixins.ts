export abstract class ComponentRootAndExternalEventListeners {
	protected eventListeners: Set<EventListenerEntry>;

	constructor() {
		this.eventListeners = new Set();
	}

	protected addEventListener<K extends keyof HTMLElementEventMap>(
		element: HTMLElement,
		type: K,
		listener: (event: HTMLElementEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions | undefined
	): void {

		element.addEventListener(type, listener, options);
		this.eventListeners.add({element, type, listener, options} as EventListenerEntry)
	}

	protected addEventListenerDocument<K extends keyof DocumentEventMap>(
		element: Document,
		type: K,
		listener: (event: DocumentEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions | undefined
	): void {

		element.addEventListener(type, listener, options);
		this.eventListeners.add({element, type, listener, options} as EventListenerEntry)
	}

	protected removeEventListeners(): void {

		this.eventListeners.forEach((eventListener) => {
			eventListener.element.removeEventListener(eventListener.type, eventListener.listener, eventListener.options);
		})

		this.eventListeners.clear();
	};
}
