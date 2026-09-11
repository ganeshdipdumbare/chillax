import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactionBar } from "./ReactionBar";

const meta = {
  title: "Lounge/ReactionBar",
  component: ReactionBar,
  args: { onReact: () => undefined },
} satisfies Meta<typeof ReactionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};
