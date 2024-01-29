const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "currentColor");
$svg.setAttribute("stroke-width", "0");
$svg.setAttribute("viewBox", "0 0 512 512");

const $path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute("fill", "none");
$path.setAttribute("stroke-linecap", "round");
$path.setAttribute("stroke-linejoin", "round");
$path.setAttribute("stroke-width", "48");
$path.setAttribute("d", "M244 400L100 256l144-144M120 256h292");

$svg.appendChild($path)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};
