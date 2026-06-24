/** Normalize vendor names for dedup / fuzzy match in the same market cluster. */
export function normalizeVendorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function vendorNamesLikelyMatch(a: string, b: string): boolean {
  return normalizeVendorName(a) === normalizeVendorName(b);
}
