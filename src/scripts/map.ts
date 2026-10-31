import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { el, place, type Kitchen } from '../lib/shared';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createMap(container: HTMLElement, globe: boolean, center: [number, number], zoom: number) {
  const map = new maplibregl.Map({
    container,
    center,
    zoom,
    minZoom: 0.6,
    maxPitch: 0,
    attributionControl: { compact: true },
    // Wheel zoom is off so the page can still scroll past the map. Use the +/- buttons or pinch.
    scrollZoom: false,
    style: {
      version: 8,
      projection: { type: globe ? 'globe' : 'mercator' },
      sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#9cc3d5' } },
        { id: 'osm', type: 'raster', source: 'osm' },
      ],
    },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  return map;
}

function addPins(map: maplibregl.Map, kitchens: Kitchen[], onSelect: (k: Kitchen) => void) {
  const located = kitchens.filter((k) => k.lat != null && k.lng != null);
  map.addSource('kitchens', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: located.map((k) => ({
        type: 'Feature',
        properties: { id: k.id },
        geometry: { type: 'Point', coordinates: [k.lng!, k.lat!] },
      })),
    },
  });
  map.addLayer({
    id: 'pin-glow',
    type: 'circle',
    source: 'kitchens',
    paint: { 'circle-radius': 16, 'circle-color': '#f6b93b', 'circle-opacity': 0.35, 'circle-blur': 0.5 },
  });
  map.addLayer({
    id: 'pin',
    type: 'circle',
    source: 'kitchens',
    paint: { 'circle-radius': 7, 'circle-color': '#f6b93b', 'circle-stroke-color': '#0b2f2e', 'circle-stroke-width': 2.5 },
  });
  map.on('click', 'pin', (e) => {
    const id = e.features?.[0]?.properties?.id;
    const k = located.find((x) => x.id === id);
    if (k) onSelect(k);
  });
  map.on('mouseenter', 'pin', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'pin', () => (map.getCanvas().style.cursor = ''));
  return located;
}

function popupFor(map: maplibregl.Map, k: Kitchen) {
  const content = el(
    'div',
    { class: 'popup' },
    el('strong', {}, k.name),
    el('span', {}, `${k.kitchen_type} · ${place(k)}`),
    el('a', { href: `/kitchen/?id=${k.id}` }, 'View details'),
  );
  return new maplibregl.Popup({ offset: 14, closeButton: true }).setLngLat([k.lng!, k.lat!]).setDOMContent(content).addTo(map);
}

/** Slowly turns the globe. Pauses while someone touches the map, and stays off if they ask for less motion. */
function spinGlobe(map: maplibregl.Map, button: HTMLButtonElement, secondsPerTurn = 240) {
  let userPaused = reducedMotion();
  let holding = false;
  let resume: number | undefined;
  const canSpin = () => !userPaused && !holding && map.getZoom() < 4;

  const step = () => {
    if (!canSpin()) return;
    const c = map.getCenter();
    c.lng -= 360 / secondsPerTurn;
    map.easeTo({ center: c, duration: 1000, easing: (t) => t, essential: true });
  };
  const hold = () => { holding = true; window.clearTimeout(resume); };
  const release = () => { window.clearTimeout(resume); resume = window.setTimeout(() => { holding = false; step(); }, 4000); };

  const paint = () => {
    button.setAttribute('aria-pressed', String(userPaused));
    button.textContent = userPaused ? 'Start rotation' : 'Pause rotation';
  };
  button.addEventListener('click', () => { userPaused = !userPaused; paint(); if (!userPaused) { holding = false; step(); } });

  map.on('moveend', step);
  map.on('mousedown', hold);
  map.on('touchstart', hold);
  map.on('mouseup', release);
  map.on('touchend', release);
  paint();
  step();
}

export interface Hero { map: maplibregl.Map; focus: (k: Kitchen) => void }

/** The home page globe. */
export function showGlobe(container: HTMLElement, kitchens: Kitchen[], spinButton: HTMLButtonElement): Hero {
  const first = kitchens.find((k) => k.lat != null && k.lng != null);
  const narrow = window.innerWidth < 700;
  const map = createMap(container, true, first ? [first.lng!, 20] : [-30, 20], narrow ? 1.1 : 1.95);
  // Keep the globe clear of the text card: beside it on wide screens, below it on phones.
  const padding = narrow ? { top: 170, bottom: 120, left: 0, right: 0 } : window.innerWidth > 900 ? { top: 0, bottom: 60, left: 420, right: 0 } : { top: 200, bottom: 100, left: 0, right: 0 };
  map.jumpTo({ padding });
  let popup: maplibregl.Popup | undefined;
  const focus = (k: Kitchen) => {
    popup?.remove();
    map.flyTo({ center: [k.lng!, k.lat!], zoom: 5.5, duration: reducedMotion() ? 0 : 2500, essential: true });
    map.once('moveend', () => { popup = popupFor(map, k); });
  };
  map.on('load', () => {
    addPins(map, kitchens, focus);
    spinGlobe(map, spinButton);
  });
  return { map, focus };
}

/** The small map on a kitchen's own page. */
export function showKitchenMap(container: HTMLElement, k: Kitchen) {
  const map = createMap(container, false, [k.lng!, k.lat!], 12);
  map.on('load', () => addPins(map, [k], () => popupFor(map, k)));
  return map;
}
