export interface Kitchen {
  id: number;
  name: string;
  kitchen_type: string;
  street_address: string | null;
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lng: number | null;
  equipment: string[];
  equipment_other: string | null;
  website: string | null;
  photo_key: string | null;
  year_electric: number | null;
  build_type: string;
  notes: string | null;
  approved_at: string | null;
}

export const KITCHEN_TYPES = [
  'restaurant', 'cafe', 'bakery', 'school (K-12)', 'college', 'hospital',
  'corporate cafeteria', 'food truck', 'ghost kitchen', 'caterer', 'other',
];

export const EQUIPMENT = [
  'induction range', 'induction wok', 'combi oven', 'convection oven', 'electric fryer',
  'electric griddle/plancha', 'electric charbroiler', 'heat-pump water heater',
];

export async function fetchKitchens(params: Record<string, string> = {}): Promise<Kitchen[]> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  const res = await fetch(`/api/kitchens?${qs}`);
  if (!res.ok) throw new Error('Could not load kitchens');
  return res.json();
}

export function place(k: Kitchen): string {
  return [k.city, k.region].filter(Boolean).join(', ');
}

// Builds elements with textContent only, so text from the database can never inject HTML.
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

export function kitchenCard(k: Kitchen): HTMLElement {
  const tags = el('ul', { class: 'tags', 'aria-label': 'Equipment' }, ...k.equipment.slice(0, 3).map((e) => el('li', {}, e)));
  return el(
    'li',
    { class: 'card' },
    el('h3', {}, el('a', { href: `/kitchen/?id=${k.id}` }, k.name)),
    el('p', { class: 'meta' }, `${k.kitchen_type} · ${place(k)}`),
    tags,
  );
}
