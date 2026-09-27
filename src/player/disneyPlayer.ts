import { Html5Player } from "./html5Player";

export class DisneyPlayer extends Html5Player {
  constructor() {
    super({
      platform: "disney",
      getContentId: () => {
        const path = location.pathname;
        const play = path.match(/\/(?:play|video)\/([^/?#]+)/i);
        if (play?.[1]) return play[1];
        const entity = path.match(/\/(?:movies|series|video)\/[^/]+\/([^/?#]+)/i);
        return entity?.[1] ?? null;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector("[data-testid='ad-ui']") ||
            document.querySelector(".ad-container") ||
            document.querySelector("[class*='AdBadge']"),
        ),
    });
  }
}
