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
            top: `${burst.y}%`,
            animationDelay: `${burst.delay}ms`,
            animationDuration: `${burst.duration}ms`,
            ["--spin" as string]: `${burst.spin}deg`,
            ["--rise" as string]: `${burst.rise}px`,
            ["--drift" as string]: `${burst.drift}px`,
            ["--float-size" as string]: `${burst.size}px`,
          }}
        >
          {burst.emoji}
        </span>
      ))}
    </div>
  );
}
