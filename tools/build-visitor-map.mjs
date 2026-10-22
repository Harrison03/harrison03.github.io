// Build-time only: node tools/build-visitor-map.mjs (Node.js >= 18).
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const sources = {
  land: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json',
  countries: 'https://raw.githubusercontent.com/google/dspl/8a9eda10b7caa7c3bfb56a8ae15981b146f1e1e8/samples/google/canonical/countries.csv',
  d3: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  topojson: 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'
};
const files = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return [key, await response.text()];
})));
const context = vm.createContext({});
vm.runInContext(files.d3, context);
vm.runInContext(files.topojson, context);
const {d3, topojson} = context, topology = JSON.parse(files.land);
const land = topojson.feature(topology, topology.objects.land).features[0];
// Antarctica is a separate polygon in Natural Earth's 110m land topology.
land.geometry.coordinates = land.geometry.coordinates.filter(polygon => polygon[0].some(point => point[1] > -60));
const projection = d3.geoEqualEarth().fitExtent([[16, 16], [784, 384]], land);
const geoPath = d3.geoPath(projection).digits(1), path = geoPath(land);
// Crop the viewport, preserving the projection shared by all country markers.
const [[x0, y0], [x1, y1]] = geoPath.bounds(land);
const padX = (x1 - x0) * .01, padY = (y1 - y0) * .01;
const viewBox = [x0 - padX, y0 - padY, x1 - x0 + 2 * padX, y1 - y0 + 2 * padY]
  .map(n => n.toFixed(2)).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><!-- Natural Earth 110m land; world-atlas 2.0.2; Equal Earth; no Antarctica. --><path fill="var(--map-land, #E3E1DA)" d="${path}"/></svg>\n`;
if (Buffer.byteLength(svg) > 80000) throw new Error('Map exceeds 80 KB');
const centroids = {};
for (const row of d3.csvParse(files.countries)) {
  if (!row.latitude || !row.longitude || row.country === 'AQ') continue;
  centroids[row.country] = projection([+row.longitude, +row.latitude]).map(n => +n.toFixed(2));
}
await mkdir(new URL('data/', root), {recursive: true});
await writeFile(new URL('assets/img/world.svg', root), svg);
// Inline inert template also works on file://, where external SVG masks are blocked.
const page = new URL('index.html', root), html = await readFile(page, 'utf8');
const template = `<template id="visitor-map-template">${svg.trim()}</template>`;
await writeFile(page, html.includes('<template id="visitor-map-template">')
  ? html.replace(/<template id="visitor-map-template">[\s\S]*?<\/template>/, template)
  : html.replace('</body>', `${template}\n</body>`));
await writeFile(new URL('data/country-centroids.js', root), `// Google DSPL country coordinates (BSD-3-Clause; see country-centroids-LICENSE.txt); projected with the map's Equal Earth transform.\n// Source: ${sources.countries}\nwindow.COUNTRY_CENTROIDS = ${JSON.stringify(centroids)};\n`);
console.log(`world.svg: ${Buffer.byteLength(svg)} bytes; ${Object.keys(centroids).length} country coordinates`);
