import { useEffect, useRef } from "react";
import type { ReactionBurst } from "../shared/types";
import { LiveEmoji } from "./LiveEmoji";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Paint the float ourselves. iPad WebKit drops CSS/WAAPI transforms that use calc() or var(). */
function driveFloat(el: HTMLElement, burst: ReactionBurst, onFinish: () => void) {
  const reduced = reducedMotion();
  const dur = reduced ? 420 : burst.duration;
  const rise = reduced ? 40 : burst.rise;
  const drift = reduced ? 0 : burst.drift;
  const spin = reduced ? 0 : burst.spin;
  const x0 = -burst.size / 2;
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    const y = 8 * (1 - t) - rise * t;
    const x = x0 + drift * t;
    const scale = reduced ? 1 : t < 0.1 ? 0.4 + t * 7.8 : t > 0.85 ? 1 - (t - 0.85) * 0.8 : 1;
    const opacity = t < 0.08 ? t / 0.08 : t > 0.72 ? (1 - t) / 0.28 : 1;
    el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    el.style.transform = `translate(${x}px, ${y}px) scale(${Math.max(0.4, scale)}) rotate(${spin * (1 - t)}deg)`;
    if (t < 1) raf = requestAnimationFrame(frame);
    else onFinish();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
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
    return driveFloat(el, burst, finish);
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
      <LiveEmoji emoji={burst.emoji} />
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
