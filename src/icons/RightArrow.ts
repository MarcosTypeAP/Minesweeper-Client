const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "none");
$svg.setAttribute("stroke-width", "2");
$svg.setAttribute("stroke-linecap", "round");
$svg.setAttribute("stroke-linejoin", "round");
$svg.setAttribute("viewBox", "0 0 24 24");

const $polyline: SVGPolylineElement = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
$polyline.setAttribute("points", "9 18 15 12 9 6");

$svg.appendChild($polyline)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};
