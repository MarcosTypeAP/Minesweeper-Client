export const API_URL = import.meta.env.VITE_API_URL;

export async function makeRequest(
	url: string,
	method: string,
	body: BodyInit | null = null,
	headers: HeadersInit = {},
	options: RequestInit = {}
): Promise<ApiResponse> {

	options = {

		// default options

		...options,
		method,
		headers: {
			"Content-Type": "application/json",
			...headers
		},
		body
	}

	let response: Response;
	try {
		response = await fetch(url, options);

	} catch (error) {
		console.error("Network error:", error);
		return {
			error: true,
			status: null,
			data: null
		};
	}

	let data: any = null;
	try {
		data = await response.json();

	} catch (error) {
		if (response.status !== 204) {
			console.error("Error parsing JSON:", error);
			return {
				error: true,
				status: response.status,
				data: null
			};
		}
	}

	if (response.status >= 200 && response.status < 300) {
		return {
			error: false,
			status: response.status,
			data
		}
	}

	console.error(`Response error. Status code: ${response.status}.`);
	return {
		error: true,
		status: response.status,
		data
	}
}
