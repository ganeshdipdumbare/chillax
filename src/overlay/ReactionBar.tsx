import type { ReactionEmoji } from "../shared/avatars";
import { REACTION_LIVE } from "../shared/avatars";
import { LiveEmoji } from "./LiveEmoji";

export function ReactionBar({
  disabled,
  onReact,
}: {
  disabled?: boolean;
  onReact: (emoji: ReactionEmoji) => void;
}) {
  return (
    <div className="react-bar" role="toolbar" aria-label="Emoji reactions">
      {REACTION_LIVE.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          className="react-btn"
          disabled={disabled}
          aria-label={`React with ${reaction.label}`}
          onClick={() => onReact(reaction.emoji)}
        >
          <LiveEmoji emoji={reaction.emoji} />
        </button>
      ))}
    </div>
  );
}