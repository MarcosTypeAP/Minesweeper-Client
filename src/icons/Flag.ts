const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "currentColor");
$svg.setAttribute("stroke-width", "0");
$svg.setAttribute("viewBox", "0 0 24 24");

const $path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute("d", "m14.303 6-3-2H6V2H4v20h2v-8h4.697l3 2H20V6z");

$svg.appendChild($path)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};
