import { getReactionLive, reactionAssetUrl } from "../shared/avatars";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LiveEmoji({ emoji, playKey }: { emoji: string; playKey?: string }) {
  const live = getReactionLive(emoji);
  if (!live || prefersReducedMotion()) {
    return <span aria-hidden="true">{emoji}</span>;
  }
  const src = reactionAssetUrl(`${live.code}.gif`);
  // iPad reuses one GIF decoder per URL; a unique query restarts the loop.
  const playing = playKey ? `${src}${src.includes("?") ? "&" : "?"}b=${encodeURIComponent(playKey)}` : src;
  return (
    <img
      className="live-emoji"
      src={playing}
      alt=""
      width={96}
      height={96}
      draggable={false}
    />
  );
}