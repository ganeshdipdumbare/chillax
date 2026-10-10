import { useEffect, useRef } from "react";
import type { ReactionBurst } from "../shared/types";
import { LiveEmoji } from "./LiveEmoji";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function floatKeyframes(burst: ReactionBurst): Keyframe[] {
  const spin = burst.spin;
  const rise = burst.rise;
  const drift = burst.drift;
  const at = (t: number, y: number, scale: number, opacity: number, spinMul: number): Keyframe => ({
    offset: t,
    opacity,
    transform: `translate(calc(-50% + ${drift * t}px), ${y}px) scale(${scale}) rotate(${spin * spinMul}deg)`,
  });
  return [
    at(0, 8, 0.4, 0, 1),
    at(0.08, -4, 1.18, 1, 1),
    at(0.16, -18, 1, 1, 0.85),
    at(0.45, -(rise * 0.45), 1.02, 1, 0.4),
    at(0.7, -(rise * 0.72), 0.98, 0.85, 0.15),
    at(1, -rise, 0.88, 0, 0),
  ];
}

function Floatie({ burst, onDone }: { burst: ReactionBurst; onDone?: (id: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    doneRef.current = false;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current?.(burst.id);
    };

    if (reducedMotion() || typeof el.animate !== "function") {
      el.style.opacity = "1";
      const timer = window.setTimeout(finish, reducedMotion() ? 450 : burst.duration + burst.delay);
      return () => window.clearTimeout(timer);
    }

    const anim = el.animate(floatKeyframes(burst), {
      duration: burst.duration,
      delay: burst.delay,
      easing: "linear",
      fill: "forwards",
    });
    anim.onfinish = finish;
    // iPad YouTube throttles timers; onfinish can also miss if the node is reparented.
    const fallback = window.setTimeout(finish, Math.max(0, burst.until - Date.now() + 80));
    return () => {
      window.clearTimeout(fallback);
      try {
        anim.cancel();
      } catch {
        // Animation already finished.
      }
    };
  }, [burst]);

  return (
    <span
      ref={ref}
      className="floatie"
      style={{
        left: `${burst.x}%`,
        top: `${burst.y}%`,
        width: burst.size,
        height: burst.size,
      }}
    >
      <LiveEmoji emoji={burst.emoji} playKey={burst.id} />
    </span>
  );
}

export function ReactionSky({
  bursts,
  onDone,
}: {
  bursts: ReactionBurst[];
  onDone?: (id: string) => void;
}) {
  return (
    <div className="sky" aria-hidden="true">
      {bursts.map((burst) => (
        <Floatie key={burst.id} burst={burst} onDone={onDone} />
      ))}
    </div>
  );
}
