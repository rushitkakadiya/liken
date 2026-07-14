const OAUTH_ORIGIN_KEY = "sm_oauth_origin";
const OAUTH_NEXT_KEY = "sm_oauth_next";

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

/** Browser origin — on phone this is your LAN IP, not localhost. */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return normalizeOrigin(window.location.origin);
}

export function rememberOAuthOrigin() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OAUTH_ORIGIN_KEY, getAppOrigin());
}

export function getRememberedOAuthOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(OAUTH_ORIGIN_KEY);
  return stored ? normalizeOrigin(stored) : null;
}

export function rememberOAuthNext(nextPath: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OAUTH_NEXT_KEY, nextPath);
}

export function consumeOAuthNext(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;
  const next = sessionStorage.getItem(OAUTH_NEXT_KEY) || fallback;
  sessionStorage.removeItem(OAUTH_NEXT_KEY);
  return next;
}

/** Keep this URL exact — no query params — so Supabase redirect allowlist matches. */
export function buildAuthCallbackUrl() {
  const origin = getRememberedOAuthOrigin() || getAppOrigin();
  return `${origin}/auth/callback`;
}

export function isLanDevOrigin(origin = getAppOrigin()) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:") return false;
    return (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

export function isLocalhostOrigin(origin = getAppOrigin()) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function isPublicHttpsOrigin(origin = getAppOrigin()) {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && !isLocalhostOrigin(origin) && !isLanDevOrigin(origin);
  } catch {
    return false;
  }
}

/**
 * Supabase Auth rejects HTTP redirects to private LAN IPs (192.168.x.x).
 * It falls back to Site URL (localhost:8080), which fails on a phone.
 */
export function getMobileOAuthBlockReason() {
  if (typeof window === "undefined") return null;
  if (!isLanDevOrigin()) return null;

  return (
    "Google sign-in cannot return to a LAN IP like 192.168.x.x — Supabase blocks that for security " +
    "and sends you to localhost instead. Use one of the phone options below."
  );
}

export function getSupabaseRedirectHint() {
  return buildAuthCallbackUrl();
}

export function getSupabaseRedirectAllowlist() {
  const origin = getAppOrigin();
  return [`${origin}/auth/callback`, `${origin}/**`];
}

export function isMobileLocalhostRedirectTrap() {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  const onLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return onLocalhost && isMobile;
}

export function validateOAuthRedirectTarget(expectedCallbackUrl: string) {
  const origin = getAppOrigin();
  const blockReason = getMobileOAuthBlockReason();
  if (blockReason) return blockReason;

  if (!expectedCallbackUrl.startsWith(`${origin}/auth/callback`)) {
    return `OAuth callback mismatch. Expected ${origin}/auth/callback`;
  }

  return null;
}

export function getMobileSignInInstructions() {
  return {
    iphone: {
      title: "iPhone (Cloudflare tunnel — free, no account)",
      steps: [
        "On PC: keep npm run dev running on port 8080",
        "On PC in a second terminal: npm run tunnel",
        "Copy the https://….trycloudflare.com URL from the tunnel output",
        "Supabase → Authentication → Redirect URLs → add https://YOUR-URL.trycloudflare.com/**",
        "On iPhone Safari, open that https URL (never 192.168.x.x)",
        "Sign in with Google from that URL",
      ],
    },
    androidUsb: {
      title: "Android (USB — recommended)",
      steps: [
        "Connect phone to PC with USB and enable USB debugging",
        "On PC run: adb reverse tcp:8080 tcp:8080",
        "On phone open: http://localhost:8080/login",
        "In Supabase add: http://localhost:8080/**",
      ],
    },
    tunnel: {
      title: "Alternative: ngrok (requires free account)",
      steps: [
        "Sign up at ngrok.com and run: ngrok config add-authtoken YOUR_TOKEN",
        "Run: npx ngrok http 8080",
        "Add https://YOUR-SUBDOMAIN.ngrok-free.app/** in Supabase",
        "Open that URL on your phone",
      ],
    },
  };
}
