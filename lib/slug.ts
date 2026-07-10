/**
 * Public-link slug: a readable title stem + a short random suffix for uniqueness.
 * ponytail: 6-char base36 suffix (~2B space) — collision-retry once against the
 * unique(public_slug) constraint (see useShares.togglePublic); swap to nanoid only
 * if it ever actually collides.
 */
export function makeSlug(title: string): string {
  const stem = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 8)
  return stem ? `${stem}-${suffix}` : suffix
}
