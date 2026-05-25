export interface Category {
  slug: string;
  name: string;
  icon: string; // Lucide icon name
}

export const CATEGORIES: Category[] = [
  { slug: 'brakes', name: 'Brakes', icon: 'Disc3' },
  { slug: 'engine', name: 'Engine', icon: 'Wrench' },
  { slug: 'battery', name: 'Battery', icon: 'Battery' },
  { slug: 'suspension', name: 'Suspension', icon: 'Car' },
  { slug: 'electrical', name: 'Electrical', icon: 'Zap' },
  { slug: 'body', name: 'Body', icon: 'Shield' },
  { slug: 'transmission', name: 'Transmission', icon: 'Settings' },
  { slug: 'cooling', name: 'Cooling', icon: 'Thermometer' },
  { slug: 'exhaust', name: 'Exhaust', icon: 'Wind' },
  { slug: 'interior', name: 'Interior', icon: 'Armchair' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);
