import { Html5Player } from "./html5Player";

export class CrunchyrollPlayer extends Html5Player {
  constructor() {
    super({
      platform: "crunchyroll",
      getContentId: () => {
        const watch = location.pathname.match(/\/watch\/([^/?#]+)/i);
        if (watch?.[1]) return watch[1];
        const media = location.pathname.match(/\/media-(\d+)/i);
        return media?.[1] ?? null;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector("[data-testid='ad-ui']") ||
            document.querySelector(".video-player-ads") ||
            document.querySelector("[class*='AdContainer']"),
        ),
    });
  }
}
