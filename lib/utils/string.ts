/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ');
}
