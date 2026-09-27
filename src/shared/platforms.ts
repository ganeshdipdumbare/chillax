import type { Platform } from "./types";

export type InviteTokenMode = "query" | "hash";

export type PlatformDef = {
  id: Platform;
  label: string;
  /** Chrome match patterns for host_permissions / content_scripts / WAR. */
  matches: string[];
  contentScript: string;
  inviteToken: InviteTokenMode;
  /**
   * Return true when this hostname (and optional pathname) belongs to the platform.
   * Hostname is already lowercased without a leading www.
   */
  matchHost: (hostname: string, pathname?: string) => boolean;
};

function hostIs(hostname: string, root: string): boolean {
  return hostname === root || hostname.endsWith(`.${root}`);
}

/** Major Amazon retail TLDs that host Prime Video watch pages. */
const AMAZON_HOSTS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.co.jp",
  "amazon.ca",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.com.au",
  "amazon.com.br",
  "amazon.in",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.mx",
];

function isPrimeAmazonPath(pathname: string): boolean {
  return (
    pathname.includes("/gp/video") ||
    pathname.includes("/gp/video/") ||
    pathname.startsWith("/pd/") ||
    /\/detail\//.test(pathname) ||
    /\/video\.amazon/.test(pathname)
  );
}

function isAmazonHost(hostname: string): boolean {
  return AMAZON_HOSTS.some((root) => hostIs(hostname, root));
}

export const PLATFORMS: PlatformDef[] = [
  {
    id: "youtube",
    label: "YouTube",
    matches: ["*://*.youtube.com/*", "*://youtube.com/*"],
    contentScript: "src/content/youtube.ts",
    inviteToken: "query",
    matchHost: (h) => hostIs(h, "youtube.com"),
  },
  {
    id: "netflix",
    label: "Netflix",
    matches: ["*://*.netflix.com/*"],
    contentScript: "src/content/netflix.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "netflix.com"),
  },
  {
    id: "disney",
    label: "Disney+",
    matches: ["*://*.disneyplus.com/*", "*://disneyplus.com/*"],
    contentScript: "src/content/disney.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "disneyplus.com"),
  },
  {
    id: "hulu",
    label: "Hulu",
    matches: ["*://*.hulu.com/*", "*://hulu.com/*"],
    contentScript: "src/content/hulu.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "hulu.com"),
  },
  {
    id: "prime",
    label: "Prime Video",
    matches: [
      "*://*.primevideo.com/*",
      "*://primevideo.com/*",
      ...AMAZON_HOSTS.flatMap((root) => [
        `*://*.${root}/gp/video/*`,
        `*://${root}/gp/video/*`,
        `*://*.${root}/pd/*`,
        `*://${root}/pd/*`,
      ]),
    ],
    contentScript: "src/content/prime.ts",
    inviteToken: "hash",
    matchHost: (h, pathname = "/") => {
      if (hostIs(h, "primevideo.com")) return true;
      if (isAmazonHost(h) && isPrimeAmazonPath(pathname)) return true;
      return false;
    },
  },
  {
    id: "max",
    label: "Max",
    matches: ["*://*.max.com/*", "*://max.com/*", "*://*.hbomax.com/*", "*://hbomax.com/*"],
    contentScript: "src/content/max.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "max.com") || hostIs(h, "hbomax.com"),
  },
  {
    id: "paramount",
    label: "Paramount+",
    matches: ["*://*.paramountplus.com/*", "*://paramountplus.com/*"],
    contentScript: "src/content/paramount.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "paramountplus.com"),
  },
  {
    id: "appletv",
    label: "Apple TV+",
    matches: ["*://tv.apple.com/*"],
    contentScript: "src/content/appletv.ts",
    inviteToken: "hash",
    matchHost: (h) => h === "tv.apple.com",
  },
  {
    id: "twitch",
    label: "Twitch",
    matches: ["*://*.twitch.tv/*", "*://twitch.tv/*"],
    contentScript: "src/content/twitch.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "twitch.tv"),
  },
  {
    id: "crunchyroll",
    label: "Crunchyroll",
    matches: ["*://*.crunchyroll.com/*", "*://crunchyroll.com/*"],
    contentScript: "src/content/crunchyroll.ts",
    inviteToken: "hash",
    matchHost: (h) => hostIs(h, "crunchyroll.com"),
  },
];

const BY_ID = Object.fromEntries(PLATFORMS.map((p) => [p.id, p])) as Record<Platform, PlatformDef>;

export function platformDef(id: Platform): PlatformDef {
  return BY_ID[id];
}

export function detectPlatform(url?: string | null): Platform | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsed.pathname || "/";
    // Prefer Prime’s path-aware match over a bare amazon host hit from matches lists.
    for (const platform of PLATFORMS) {
      if (platform.matchHost(hostname, pathname)) return platform.id;
    }
    return null;
  } catch {
    return null;
  }
}

export function isSupportedHost(url?: string | null): boolean {
  return detectPlatform(url) !== null;
}

export function platformNightLabel(platform: Platform): string {
  return `${BY_ID[platform].label} night`;
}

export function contentScriptForUrl(url?: string | null): string | null {
  const id = detectPlatform(url);
  return id ? BY_ID[id].contentScript : null;
}

export function allHostPermissions(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const platform of PLATFORMS) {
    for (const pattern of platform.matches) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      out.push(pattern);
    }
  }
  return out;
}

/**
 * Origin-level patterns for web_accessible_resources.
 * Chrome rejects path-restricted match patterns in WAR `matches`
 * (e.g. `*://*.amazon.com/gp/video/*`), so collapse every host to `/*`.
 */
export function allWarMatches(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pattern of allHostPermissions()) {
    const slash = pattern.indexOf("/", pattern.indexOf("://") + 3);
    const next = slash === -1 ? pattern : `${pattern.slice(0, slash)}/*`;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function supportedPlatformLabels(): string {
  return PLATFORMS.map((p) => p.label).join(", ");
}
