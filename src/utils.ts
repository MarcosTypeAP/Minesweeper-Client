export function getFormatedTime(totalSeconds: number): string {

	let formatedTime: string = '';
	
	const hours: number = Math.floor(totalSeconds / 60 / 60);
	const minutes: number = Math.floor(totalSeconds / 60 % 60);
	const seconds: number = totalSeconds % 60;

	if (hours) {
		formatedTime += hours + "H ";
	}

	if (minutes) {
		formatedTime += minutes + "M ";
	}

	if (seconds) {
		formatedTime += seconds + "S";
	}

	return formatedTime ? formatedTime : "0S";
}

export function camelToSnakeCase(obj: {[key: string]: any}): {[key: string]: any} {
	
	const camelCaseRegex: RegExp = /[a-z0-9]([A-Z])/g;

	const keys: string[] = Object.keys(obj);
	console.log(keys);

	for (let i = 0; i < keys.length; ++i) {
		const snakeCaseKey: string = keys[i].replaceAll(camelCaseRegex, (match) => match[0] + '_' + match[1].toLowerCase());

		if (snakeCaseKey === keys[i]) {
			continue;
		}

		obj[snakeCaseKey] = obj[keys[i]];
		delete obj[keys[i]];
	}

	return obj;
}

export function snakeToCamelCase(obj: {[key: string]: any}): {[key: string]: any} {
	
	const snakeCaseRegex: RegExp = /_([a-zA-Z0-9])/g;

	const keys: string[] = Object.keys(obj);

	for (let i = 0; i < keys.length; ++i) {
		const camelCaseKey: string = keys[i].replaceAll(snakeCaseRegex, (_, ch) => ch.toUpperCase());

		if (camelCaseKey === keys[i]) {
			continue;
		}

		obj[camelCaseKey] = obj[keys[i]];
		delete obj[keys[i]];
	}

	return obj;
}

