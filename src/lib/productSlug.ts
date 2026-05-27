// Stable, URL-safe slug from a product name + pharmacy.
// Used to build /prodotto/:active/:slug routes.

export function slugifyText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function productSlug(name: string, pharmacyName: string): string {
  const n = slugifyText(name);
  const p = slugifyText(pharmacyName);
  return p ? `${n}--${p}` : n;
}
