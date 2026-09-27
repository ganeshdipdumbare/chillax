import { Html5Player } from "./html5Player";

const RESERVED = new Set([
  "directory",
  "downloads",
  "inventory",
  "jobs",
  "p",
  "prime",
  "search",
  "settings",
  "subscriptions",
  "turbo",
  "videos",
  "wallet",
]);

function twitchContentId(): string | null {
  const path = location.pathname;
  const vod = path.match(/\/videos\/(\d+)/i);
  if (vod?.[1]) return `vod:${vod[1]}`;
  const clip = path.match(/\/clip\/([^/?#]+)/i);
  if (clip?.[1]) return `clip:${clip[1]}`;
  const channel = path.match(/^\/([^/?#]+)\/?$/i);
  if (channel?.[1] && !RESERVED.has(channel[1].toLowerCase())) {
    return `live:${channel[1].toLowerCase()}`;
  }
  return null;
}

export class TwitchPlayer extends Html5Player {
  constructor() {
    super({
      platform: "twitch",
      getContentId: twitchContentId,
      canSeek: () => {
        const id = twitchContentId();
        return Boolean(id && (id.startsWith("vod:") || id.startsWith("clip:")));
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector(".video-ads") ||
            document.querySelector("[data-a-target='video-ad-label']") ||
            document.querySelector(".avp-p-ad-overlay"),
        ),
    });
  }
}
