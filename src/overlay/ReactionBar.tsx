import type { ReactionEmoji } from "../shared/avatars";
import { REACTIONS } from "../shared/avatars";

export function ReactionBar({
  disabled,
  onReact,
}: {
  disabled?: boolean;
  onReact: (emoji: ReactionEmoji) => void;
}) {
  return (
    <div className="react-bar" role="toolbar" aria-label="Emoji reactions">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="react-btn"
          disabled={disabled}
          aria-label={`React with ${emoji}`}
          onClick={() => onReact(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
