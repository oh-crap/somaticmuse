// apps/admin/src/lib/redirect.ts
// Helper for safely handling user-supplied redirect targets.
//
// User-supplied redirect URLs (e.g. ?redirect_to=... or hidden form fields)
// must be validated to prevent open-redirect attacks where an attacker
// crafts a link that bounces a logged-in user to a phishing site through
// our trusted domain.

/**
 * Returns the redirect target if it is a safe same-origin path, otherwise
 * returns the fallback. A safe path is one that starts with "/" and does
 * not start with "//" (protocol-relative URL) or "/\" (path traversal).
 */
export function safeRedirect(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate || typeof candidate !== "string") return fallback;
  // Must be relative and start with a single slash.
  // Reject protocol-relative ("//evil.com"), backslash tricks, and
  // anything that looks like an absolute URL.
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.startsWith("/\\")) return fallback;
  return candidate;
}