import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { el, place, type Kitchen } from '../lib/shared';

export function showMap(container: HTMLElement, kitchens: Kitchen[], opts: { zoom?: number } = {}) {
  const map = L.map(container, { scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const points: L.LatLngTuple[] = [];
  for (const k of kitchens) {
    if (k.lat == null || k.lng == null) continue;
    points.push([k.lat, k.lng]);
    const icon = L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
    const popup = el('div', {}, el('strong', {}, k.name), el('br'), place(k), el('br'), el('a', { href: `/kitchen/?id=${k.id}` }, 'View details'));
    L.marker([k.lat, k.lng], { icon, title: k.name, alt: k.name }).bindPopup(popup).addTo(map);
  }

  if (points.length === 1) map.setView(points[0], opts.zoom ?? 13);
  else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  else map.setView([39.5, -98.35], 3);
  return map;
}
