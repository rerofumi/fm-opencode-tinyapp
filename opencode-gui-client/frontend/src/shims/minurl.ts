// Minimal browser shim for vfile's internal "#minurl" import
// Provides isUrl and urlToPath used by vfile.

export function isUrl(value: unknown): value is URL {
  return typeof value === 'object' && value !== null && value instanceof URL
}

export function urlToPath(url: URL): string {
  // In browser, return a sensible string path.
  try {
    if (url.protocol === 'file:') {
      // Decode file URL pathname
      return decodeURIComponent(url.pathname)
    }
    return url.toString()
  } catch {
    return String(url)
  }
}
