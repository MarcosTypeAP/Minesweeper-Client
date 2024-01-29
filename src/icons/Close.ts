const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "currentColor");
$svg.setAttribute("stroke-width", "0");
$svg.setAttribute("viewBox", "0 0 512 512");

const $path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute("d", "M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z");

$svg.appendChild($path)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};
