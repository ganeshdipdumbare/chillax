import { Html5Player } from "./html5Player";

export class ParamountPlayer extends Html5Player {
  constructor() {
    super({
      platform: "paramount",
      getContentId: () => {
        const path = location.pathname;
        const video = path.match(/\/(?:shows|movies)\/[^/]+\/(?:video|movie)\/([^/?#]+)/i);
        if (video?.[1]) return video[1];
        const movies = path.match(/\/movies\/([^/?#]+)/i);
        if (movies?.[1]) return movies[1];
        const shows = path.match(/\/shows\/([^/]+)(?:\/|$)/i);
        return shows?.[1] ?? null;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector(".ad-container") ||
            document.querySelector("[class*='AdContainer']") ||
            document.querySelector("[data-testid='ad-ui']"),
        ),
    });
  }
}
