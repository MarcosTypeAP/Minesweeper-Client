const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "currentColor");
$svg.setAttribute("stroke-width", "0");
$svg.setAttribute("viewBox", "0 0 512 512");

const $path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute("d", "M64 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM64 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm48-208a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z");

$svg.appendChild($path)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};
