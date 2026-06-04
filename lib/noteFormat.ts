// Pure formatting helpers for notes. Live here (not in dummyData) so screens and
// hooks can use them without depending on the soon-to-be-removed dummy module.

/**
 * Returns the first ~120 chars of body text from an HTML note as a preview string.
 * Strips the leading h1 (which duplicates the title field) then strips all tags.
 */
export function getPreview(content: string): string {
  const withoutTitle = content.replace(/^<h1[^>]*>.*?<\/h1>/i, '')
  const text = withoutTitle
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 120 ? text.slice(0, 120) + '…' : text
}

/**
 * Human-readable relative time from an ISO timestamp.
 * e.g. "2h ago", "3d ago", "just now"
 */
export function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
