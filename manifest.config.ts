import { defineManifest } from "@crxjs/vite-plugin";
import { version } from "./package.json";
import { allHostPermissions, allWarMatches, PLATFORMS } from "./src/shared/platforms";

const hosts = allHostPermissions();
const warMatches = allWarMatches();

export default defineManifest({
  manifest_version: 3,
  name: "Chillax",
  version,
  description:
    "Watch together on YouTube, Netflix, Disney+, Hulu, Prime Video, Max, Paramount+, Apple TV+, Twitch, and Crunchyroll — synced playback, chat, and free voice/video.",
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  action: {
    default_title: "Chillax",
    default_icon: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
    },
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  permissions: ["storage", "scripting"],
  host_permissions: hosts,
  content_scripts: [
    {
      matches: hosts,
      js: ["src/content/inviteCapture.ts"],
      run_at: "document_start",
    },
    {
      matches: PLATFORMS.flatMap((platform) => platform.matches),
      js: ["src/content/keyShield.ts"],
      run_at: "document_start",
    },
    ...PLATFORMS.map((platform) => ({
      matches: platform.matches,
      js: [platform.contentScript],
      run_at: "document_idle" as const,
    })),
    {
      matches: ["*://*.netflix.com/*"],
      js: ["src/player/netflixBridge.ts"],
      run_at: "document_start",
      world: "MAIN",
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        "src/media/index.html",
        "assets/*",
        "icons/*",
        "fonts/*",
      ],
      matches: warMatches,
    },
  ],
});
