import { Html5Player } from "./html5Player";

export class MaxPlayer extends Html5Player {
  constructor() {
    super({
      platform: "max",
      getContentId: () => {
        const path = location.pathname;
        const watch = path.match(/\/video\/watch\/([^/?#]+)/i);
        if (watch?.[1]) return watch[1];
        const play = path.match(/\/(?:play|watch)\/([^/?#]+)/i);
        if (play?.[1]) return play[1];
        const show = path.match(/\/(?:show|movie|sport|channel)\/[^/]+\/([^/?#]+)/i);
        return show?.[1] ?? null;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector("[data-testid='ad-ui']") ||
            document.querySelector(".ad-container") ||
            document.querySelector("[class*='AdsContainer']"),
        ),
    });
  }
}
