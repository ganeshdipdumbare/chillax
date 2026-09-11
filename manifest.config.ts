import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Chillax",
  version: "1.0.0",
  description:
    "Watch YouTube and Netflix together with synced playback, group chat, and free voice/video.",
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  action: {
    default_popup: "src/popup/index.html",
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
  permissions: ["storage"],
  host_permissions: [
    "*://*.youtube.com/*",
    "*://youtube.com/*",
    "*://*.netflix.com/*",
  ],
  content_scripts: [
    {
      matches: ["*://*.youtube.com/*", "*://youtube.com/*"],
      js: ["src/content/youtube.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["*://*.netflix.com/*"],
      js: ["src/content/netflix.ts"],
      run_at: "document_idle",
    },
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
      ],
      matches: [
        "*://*.youtube.com/*",
        "*://youtube.com/*",
        "*://*.netflix.com/*",
      ],
    },
  ],
});
