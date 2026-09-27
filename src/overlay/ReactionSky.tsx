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
            animationDelay: `${burst.delay}ms`,
            animationDuration: `${burst.duration}ms`,
            ["--spin" as string]: `${burst.spin}deg`,
            ["--spin-end" as string]: `${burst.spinEnd}deg`,
            ["--drift" as string]: `${burst.drift}px`,
            ["--sway" as string]: `${burst.sway}px`,
            ["--float-size" as string]: `${burst.size}px`,
          }}
        >
          <span className="floatie-face">{burst.emoji}</span>
        </span>
      ))}
    </div>
  );
}
