import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactionSky } from "./ReactionSky";

const meta = {
  title: "Lounge/ReactionSky",
  component: ReactionSky,
} satisfies Meta<typeof ReactionSky>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PopcornRain: Story = {
  args: {
    bursts: [
      { id: "1", emoji: "🍿", x: 18, spin: -12, wobble: 0 },
      { id: "2", emoji: "😂", x: 42, spin: 8, wobble: 80 },
      { id: "3", emoji: "🔥", x: 68, spin: 16, wobble: 140 },
      { id: "4", emoji: "❤️", x: 30, spin: -6, wobble: 200 },
    ],
  },
  render: (args) => (
    <div className="panel story">
      <ReactionSky {...args} />
      <p className="status">Reactions float up the sidebar.</p>
    </div>
  ),
};
