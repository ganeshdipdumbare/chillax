import { Html5Player } from "./html5Player";

export class HuluPlayer extends Html5Player {
  constructor() {
    super({
      platform: "hulu",
      getContentId: () => {
        const watch = location.pathname.match(/\/watch\/([^/?#]+)/i);
        if (watch?.[1]) return watch[1];
        const id = new URLSearchParams(location.search).get("content_id");
        return id;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector(".AdUnitView") ||
            document.querySelector("[class*='AdContainer']") ||
            document.querySelector("[data-automationid='player-ad-ui']"),
        ),
    });
  }
}
