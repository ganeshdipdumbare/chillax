import type { ReactionBurst } from "../shared/types";

export function ReactionSky({ bursts }: { bursts: ReactionBurst[] }) {
  return (
    <div className="sky" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="floatie"
          style={{
            left: `${burst.x}%`,
            animationDelay: `${burst.wobble}ms`,
            ["--spin" as string]: `${burst.spin}deg`,
          }}
        >
          {burst.emoji}
        </span>
      ))}
    </div>
  );
}
