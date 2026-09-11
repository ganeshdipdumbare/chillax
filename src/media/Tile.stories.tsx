import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tile } from "../media/Tile";

const meta = {
  title: "Lounge/CallTile",
  component: Tile,
  args: {
    stream: null,
    muted: false,
    cameraOn: false,
    nickname: "Maya",
    avatarId: "fox",
    local: true,
  },
} satisfies Meta<typeof Tile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CameraOff: Story = {
  render: (args) => (
    <div style={{ width: 280 }}>
      <Tile {...args} />
    </div>
  ),
};

export const Muted: Story = {
  args: { muted: true, avatarId: "alien", nickname: "Jules" },
  render: (args) => (
    <div style={{ width: 280 }}>
      <Tile {...args} />
    </div>
  ),
};
