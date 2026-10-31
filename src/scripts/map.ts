import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { el, place, type Kitchen } from '../lib/shared';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const NASA_ATTRIBUTION = '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>';
const darkMode = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// The glow around the globe. Pale in light mode, deeper blue in dark mode.
const sky = (dark: boolean) => ({
  'sky-color': dark ? '#1b4f8f' : '#8fc1f0',
  'horizon-color': dark ? '#3b86d1' : '#cfe6fa',
  'fog-color': dark ? '#0b1b2b' : '#ffffff',
  'sky-horizon-blend': 0.7,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
});

function createMap(container: HTMLElement, globe: boolean, center: [number, number], zoom: number) {
  // The globe uses NASA satellite imagery, with street detail fading in as you zoom close.
  // Flat maps (a single kitchen's page) use plain streets, which are easier to navigate.
  const layers: any[] = globe
    ? [
        { id: 'earth', type: 'raster', source: 'earth' },
        { id: 'streets', type: 'raster', source: 'osm', minzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 7, 1] } },
      ]
    : [{ id: 'streets', type: 'raster', source: 'osm' }];

  const map = new maplibregl.Map({
    container,
    center,
    zoom,
    minZoom: 0.6,
    maxPitch: 0,
    attributionControl: { compact: true },
    // Wheel zoom is off so the page can still scroll past the map. Use the +/- buttons or pinch.
    scrollZoom: false,
    // On phones, one finger scrolls the page and two fingers move the map.
    cooperativeGestures: window.matchMedia('(pointer: coarse)').matches,
    style: {
      version: 8,
      projection: { type: globe ? 'globe' : 'mercator' },
      sky: sky(darkMode()),
      sources: {
        osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION },
        earth: {
          type: 'raster',
          tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
          tileSize: 256,
          maxzoom: 8,
          attribution: NASA_ATTRIBUTION,
        },
      },
      layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#6f9fc4' } }, ...layers],
    } as unknown as maplibregl.StyleSpecification,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  if (globe) {
    // If the satellite tiles can't be reached, fall back to the street map at every zoom.
    let fellBack = false;
    map.on('error', (e: any) => {
      if (fellBack || e?.sourceId !== 'earth') return;
      fellBack = true;
      map.setLayerZoomRange('streets', 0, 24);
      map.setPaintProperty('streets', 'raster-opacity', 1);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => map.setSky(sky(darkMode()) as any));
  }
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
function spinGlobe(
  map: maplibregl.Map,
  button: HTMLButtonElement,
  padding: () => maplibregl.PaddingOptions,
  onChange: (paused: boolean) => void,
  secondsPerTurn = 240,
) {
  let userPaused = reducedMotion();
  let holding = false;
  let flying = false;
  let resume: number | undefined;
  const canSpin = () => !userPaused && !holding && !flying && map.getZoom() < 4;

  const step = () => {
    if (!canSpin()) return;
    const c = map.getCenter();
    c.lng -= 360 / secondsPerTurn;
    map.easeTo({ center: c, padding: padding(), duration: 1000, easing: (t) => t, essential: true });
  };
  const hold = () => { holding = true; window.clearTimeout(resume); };
  const release = () => { window.clearTimeout(resume); resume = window.setTimeout(() => { holding = false; step(); }, 4000); };

  const paint = () => {
    button.setAttribute('aria-pressed', String(userPaused));
    button.textContent = userPaused ? 'Start animation' : 'Pause animation';
    onChange(userPaused);
  };
  button.addEventListener('click', () => { userPaused = !userPaused; paint(); if (!userPaused) { holding = false; step(); } });

  map.on('moveend', step);
  map.on('mousedown', hold);
  map.on('touchstart', hold);
  map.on('mouseup', release);
  map.on('touchend', release);
  paint();
  step();
  // Called around a fly-to, so the spin never fights the flight.
  return { setFlying(value: boolean) { flying = value; } };
}

export interface Hero { map: maplibregl.Map; focus: (k: Kitchen) => void }

/** The home page globe. Sits off to the right so about half of it shows, clear of the text card. */
export function showGlobe(container: HTMLElement, kitchens: Kitchen[], spinButton: HTMLButtonElement, onMotionChange: (paused: boolean) => void): Hero {
  const first = kitchens.find((k) => k.lat != null && k.lng != null);
  const wide = () => window.innerWidth > 900;
  // Padding shifts where the map treats "the middle" to be. A big left padding pushes the globe to the right edge.
  const globePadding = (): maplibregl.PaddingOptions =>
    wide()
      ? { top: 0, bottom: 40, left: Math.round(window.innerWidth * 0.8), right: 0 }
      : { top: 150, bottom: 70, left: Math.round(window.innerWidth * 0.72), right: 0 };
  // While looking at one kitchen, centre it in the space beside the text card instead.
  const focusPadding = (): maplibregl.PaddingOptions =>
    wide() ? { top: 0, bottom: 40, left: 420, right: 0 } : { top: 200, bottom: 90, left: 0, right: 0 };

  const map = createMap(container, true, first ? [first.lng!, 20] : [-30, 20], wide() ? 2.35 : 1.5);
  map.jumpTo({ padding: globePadding() });

  let popup: maplibregl.Popup | undefined;
  let spin: ReturnType<typeof spinGlobe> | undefined;
  const focus = (k: Kitchen) => {
    popup?.remove();
    spin?.setFlying(true);
    map.flyTo({ center: [k.lng!, k.lat!], zoom: 8, padding: focusPadding(), duration: reducedMotion() ? 0 : 2500, essential: true });
    map.once('moveend', () => { spin?.setFlying(false); popup = popupFor(map, k); });
  };
  map.on('load', () => {
    addPins(map, kitchens, focus);
    spin = spinGlobe(map, spinButton, globePadding, onMotionChange);
  });
  return { map, focus };
}

/** The small map on a kitchen's own page. */
export function showKitchenMap(container: HTMLElement, k: Kitchen) {
  const map = createMap(container, false, [k.lng!, k.lat!], 12);
  map.on('load', () => addPins(map, [k], () => popupFor(map, k)));
  return map;
}
