import { getReactionLive, reactionAssetUrl } from "../shared/avatars";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LiveEmoji({ emoji }: { emoji: string }) {
  const live = getReactionLive(emoji);
  if (!live || prefersReducedMotion()) {
    return <span aria-hidden="true">{emoji}</span>;
  }
  return (
    <img
      className="live-emoji"
      src={reactionAssetUrl(`${live.code}.gif`)}
      alt=""
      width={96}
      height={96}
      draggable={false}
      decoding="async"
    />
  );
}