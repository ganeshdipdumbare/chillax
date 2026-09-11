import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { ReactionSky } from "./ReactionSky";
import { REACTIONS } from "../shared/avatars";
import { burstTtlMs, sprayBursts } from "../shared/reactions";
import type { ReactionBurst } from "../shared/types";

function LiveRain() {
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  useEffect(() => {
    const tick = window.setInterval(() => {
      const emoji = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      const extra = sprayBursts(emoji);
      setBursts((current) => [...current, ...extra].slice(-64));
      for (const burst of extra) {
        window.setTimeout(() => {
          setBursts((current) => current.filter((item) => item.id !== burst.id));
        }, burstTtlMs(burst));
      }
    }, 1600);
    return () => window.clearInterval(tick);
  }, []);
  return (
    <div className="story-stage">
      <ReactionSky bursts={bursts} />
      <p className="status" style={{ position: "absolute", bottom: 16, left: 16, zIndex: 5 }}>
        One tap sprays a handful of emoji up the screen.
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
