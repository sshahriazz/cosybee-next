/**
 * The two XML primitives every feed and sitemap the site publishes needs.
 *
 * Extracted because there are now four documents built by hand — `/rss.xml`
 * (plus its two syndication siblings), `/video-sitemap.xml` and
 * `/news-sitemap.xml` — and an escaping rule that differs between them is a bug
 * nobody notices until a post title contains an ampersand and one file stops
 * parsing. One definition, imported by all of them.
 */

/**
 * Escape a string for inclusion in XML text or attribute content.
 *
 * All five predefined entities, deliberately: `&` and `<` are what actually
 * break a document, but `>`, `"` and `'` cost nothing to escape and make the
 * function safe to use for attribute values too, which callers do.
 *
 * `&` MUST be replaced first — doing it later would re-escape the ampersands
 * introduced by the other four and emit `&amp;lt;`.
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A W3C datetime — the format sitemap date fields are specified in — or `null`
 * when the input can't be parsed.
 *
 * Null rather than a substituted `new Date()`: every caller is describing when
 * something was published, and a confidently wrong date is worse than an absent
 * one. Callers either omit the optional field (`video:publication_date`) or drop
 * the entry entirely when the field is required (`news:publication_date`).
 *
 * `toISOString()` emits `2026-09-08T10:30:00.000Z`, which is the "complete date
 * plus hours, minutes, seconds and a decimal fraction of a second" form Google
 * lists as acceptable. `Z` and `+00:00` are the same offset written two ways.
 */
export function w3cDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
