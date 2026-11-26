/**
 * Returns the trimmed URL string only if its protocol is http: or https:;
 * returns null for javascript:, data:, ftp:, or malformed values.
 */
export function safeHref(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return urlStr;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts hostname from a URL string for safe monospace display.
 */
export function getHostname(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return urlStr;
  }
}
