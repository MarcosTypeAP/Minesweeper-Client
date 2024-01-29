const $svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
$svg.setAttribute("stroke", "currentColor");
$svg.setAttribute("fill", "currentColor");
$svg.setAttribute("stroke-width", "0");
$svg.setAttribute("viewBox", "0 0 200 200");

const $path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute("d", "M39.08125,56.36069L32.44826,49.7277c-1.40935-1.40935-1.39544-3.70827.03108-5.13478L44.53301,32.53925c1.42651-1.42651,3.72543-1.44043,5.13478-.03108l6.62318,6.62318c8.38457-6.03149,18.06602-10.37336,28.54585-12.52712v-12.2785c0-2.54291,2.03663-4.60434,4.54895-4.60434h21.22844c2.51232,0,4.54895,2.06143,4.54895,4.60434v12.2785c10.41295,2.14001,20.03766,6.44029,28.38514,12.41183l6.5804-6.5804c1.42651-1.42651,3.72543-1.44043,5.13478-.03108l11.90865,11.90865c1.40935,1.40935,1.39544,3.70827-.03108,5.13478l-6.51192,6.51192c6.12041,8.41134,10.53305,18.14527,12.72845,28.69228h12.18745c2.51232,0,4.54895,2.06143,4.54895,4.60434v21.48692c0,2.54291-2.03663,4.60434-4.54895,4.60434h-12.18745c-2.1671,10.41108-6.49467,20.0299-12.49267,28.36641l6.41081,6.41081c1.40935,1.40935,1.39544,3.70827-.03108,5.13478l-12.05367,12.05367c-1.42651,1.42651-3.72543,1.44043-5.13478.03108l-6.42208-6.42208c-8.36731,6.00351-18.0223,10.32596-28.47095,12.4733v12.2785c0,2.54291-2.03663,4.60434-4.54895,4.60434h-21.22844c-2.51232,0-4.54895-2.06143-4.54895-4.60434v-12.2785c-10.51552-2.16109-20.22721-6.52522-28.63146-12.58879l-6.61009,6.61009c-1.42651,1.42651-3.72543,1.44043-5.13478.03108L32.55184,155.53951c-1.40935-1.40935-1.39544-3.70827.03108-5.13478l6.61009-6.61009c-6.02807-8.35505-10.37654-18.00225-12.55061-28.44683h-12.18745c-2.51232,0-4.54895-2.06143-4.54895-4.60434v-21.48692c0-2.54291,2.03663-4.60434,4.54895-4.60434h12.18745C28.80301,74.27229,33.11118,64.6799,39.08124,56.3607l.00001-.00001Zm71.53297,58.98711c2.51232,0,4.54895-2.06143,4.54895-4.60434v-21.48692c0-2.54291-2.03663-4.60434-4.54895-4.60434h-21.22844c-2.51232,0-4.54895,2.06143-4.54895,4.60434v21.48692c0,2.54291,2.03663,4.60434,4.54895,4.60434h21.22844Z");

$svg.appendChild($path)

export default function getSVG(): SVGSVGElement {
	return $svg.cloneNode(true) as SVGSVGElement;
};