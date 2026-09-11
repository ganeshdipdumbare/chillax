import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { ReactionSky } from "./ReactionSky";
import { REACTIONS } from "../shared/avatars";
import type { ReactionBurst } from "../shared/types";

function rainBurst(emoji: string, i: number): ReactionBurst {
  return {
    id: `${Date.now()}-${i}-${Math.random()}`,
    emoji,
    x: 10 + Math.random() * 70,
    spin: Math.round(-36 + Math.random() * 72),
    wobble: Math.round(Math.random() * 120),
    size: 38 + Math.round(Math.random() * 28),
    drift: Math.round(-90 + Math.random() * 180),
  };
}

function LiveRain() {
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  useEffect(() => {
    const tick = window.setInterval(() => {
      const emoji = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      const burst = rainBurst(emoji, bursts.length);
      setBursts((current) => [...current, burst].slice(-18));
      window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
      }, 4000);
    }, 420);
    return () => window.clearInterval(tick);
  }, []);
  return (
    <div className="story-stage">
      <ReactionSky bursts={bursts} />
      <p className="status" style={{ position: "absolute", bottom: 16, left: 16, zIndex: 5 }}>
        Reactions bounce up the whole screen.
      </p>
    </div>
  );
}

const meta = {
  title: "Lounge/ReactionSky",
  component: ReactionSky,
} satisfies Meta<typeof ReactionSky>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PopcornRain: Story = {
  args: { bursts: [] },
  render: () => <LiveRain />,
};
