/**
 * This browser's attendance device token.
 *
 * The token is a random id kept in localStorage. On an employee's first QR scan
 * the server binds it to them, and later scans must present the same token — so
 * "their phone" really means "this browser on this phone". Clearing site data
 * or using a different browser loses it, and an admin then has to reset the
 * registration.
 */
const KEY = "lds_device_token";

function randomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** The stored token, creating one on first use. */
export function getDeviceToken(): string {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const token = randomToken();
    window.localStorage.setItem(KEY, token);
    return token;
  } catch {
    // Private mode / storage blocked: the scan still works, but this phone
    // cannot be recognised next time.
    return randomToken();
  }
}

/** Short phone description for the admin's device list, e.g. "Android · Chrome". */
export function describeDevice(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (!ua) return "Unknown device";

  const os =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iPod/i.test(ua) ? "iPhone/iPad" :
    /Windows/i.test(ua) ? "Windows" :
    /Mac OS X/i.test(ua) ? "Mac" :
    /Linux/i.test(ua) ? "Linux" : "Unknown";

  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\//i.test(ua) ? "Opera" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" : "Browser";

  return `${os} · ${browser}`;
}
