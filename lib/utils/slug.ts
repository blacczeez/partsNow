/** URL-safe slug from a display name (e.g. "Front Brakes" → "front-brakes"). */
export function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'category';
}
