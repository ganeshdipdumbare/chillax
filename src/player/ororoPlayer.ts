import { Html5Player } from "./html5Player";

const KINDS = new Set(["movies", "shows", "channels"]);

function ororoRoute(): { kind: string; slug: string } | null {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && /^[a-z]{2}$/.test(parts[0]) && KINDS.has(parts[1])) {
    parts.shift();
  }
  const [kind, slug] = parts;
  if (!kind || !slug || !KINDS.has(kind)) return null;
  return { kind, slug: decodeURIComponent(slug) };
}

function hashValue(): string {
  return decodeURIComponent(location.hash.replace(/^#/, ""));
}

function playerOpen(): boolean {
  return Boolean(document.querySelector("#ororo-video video"));
}

/**
 * Movies open on `#video`. Shows open on `#season-episode` (for example `#1-3`).
 * The title page itself is not a watch until that hash (or the player) is present,
 * so an invite still carries the hash ororo uses to start playback.
 */
export function ororoContentId(): string | null {
  const route = ororoRoute();
  if (!route) return null;
  const hash = hashValue();
  if (route.kind === "movies") {
    if (hash !== "video" && !playerOpen()) return null;
    return `movies/${route.slug}`;
  }
  if (route.kind === "shows") {
    if (!/^\d+-\d+$/.test(hash)) return null;
    return `shows/${route.slug}/${hash}`;
  }
  // Channel clips are usually a YouTube embed, which this player cannot sync.
  if (!playerOpen() || !hash || hash === "video") return null;
  return `channels/${route.slug}/${hash}`;
}

export class OroroPlayer extends Html5Player {
  constructor() {
    super({
      platform: "ororo",
      getContentId: ororoContentId,
      isPlayerOpen: playerOpen,
    });
  }
}
