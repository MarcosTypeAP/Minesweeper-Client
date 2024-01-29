export function linear(x: number): number {
	return x;
}

export function easeInOutQuad(x: number): number {
	return x < 0.5
		? 2 * x ** 2
		: 1 - (-2 * x + 2) ** 2 / 2;
}

export function easeInBack(x: number): number {

	const c1 = 0.50158;
	const c2 = c1 + 1;

	return c2 * (x ** 3) - c1 * (x ** 2);
}

export function easeInExpo(x: number): number {
	return x === 0
		? 0
		: 2 ** (10 * x - 10);
}

export function easeOutQuart(x: number): number {
	return 1 - (1 - x) ** 4;
}

export function easeInCubic(x: number): number {
	return x ** 3;
}

export function easeOutQuad(x: number): number {
	return 1 - (1 - x) ** 2;
}

export function easeInQuad(x: number): number {
	return x ** 2;
}

export function easeOutElastic(x: number): number {

	const c4 = (2 * Math.PI) / 3;

	if (x === 0) {
		return 0;
	}

	if (x === 1) {
		return 1;
	}

	return  Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(x: number): number {

	const n1 = 7.5625;
	const d1 = 2.75;

	if (x < 1 / d1) {
		return n1 * x * x;
	}

	if (x < 2 / d1) {
		return n1 * (x -= 1.5 / d1) * x + 0.75;
	}

	if (x < 2.5 / d1) {
		return n1 * (x -= 2.25 / d1) * x + 0.9375;
	}

	return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

export function easeOutBack(x: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;

	return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
