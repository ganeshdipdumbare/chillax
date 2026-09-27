import { Html5Player } from "./html5Player";

export class AppleTvPlayer extends Html5Player {
  constructor() {
    super({
      platform: "appletv",
      getContentId: () => {
        const path = location.pathname;
        const media = path.match(/\/(?:movie|episode|show|season)\/(?:[^/]+\/)?([^/?#]+)/i);
        if (media?.[1]) return media[1];
        const umc = path.match(/\/(umc\.[^/?#]+)/i);
        return umc?.[1] ?? null;
      },
    });
  }
}
