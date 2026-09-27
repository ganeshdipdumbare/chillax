import { Html5Player } from "./html5Player";

export class PrimePlayer extends Html5Player {
  constructor() {
    super({
      platform: "prime",
      getContentId: () => {
        const path = location.pathname;
        const detail = path.match(/\/(?:detail|gp\/video\/detail)\/([^/?#]+)/i);
        if (detail?.[1]) return detail[1];
        const pd = path.match(/\/pd\/([^/?#]+)/i);
        if (pd?.[1]) return pd[1];
        const asin = path.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (asin?.[1]) return asin[1];
        const gti = new URLSearchParams(location.search).get("gti");
        if (gti) return gti;
        const titleId = new URLSearchParams(location.search).get("titleId");
        return titleId;
      },
      isAdPlaying: () =>
        Boolean(
          document.querySelector(".adContainer") ||
            document.querySelector("[class*='ad-ui']") ||
            document.querySelector("[data-automation-id='ad-ui']"),
        ),
    });
  }
}
