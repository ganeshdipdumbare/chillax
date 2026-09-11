import type { Meta, StoryObj } from "@storybook/react-vite";
import { AVATARS } from "../shared/avatars";
import { AvatarFace } from "./AvatarFace";

const meta = {
  title: "Lounge/AvatarFace",
  component: AvatarFace,
  args: { avatarId: "fox", size: 64 },
} satisfies Meta<typeof AvatarFace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fox: Story = {};

export const Lineup: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: 360 }}>
      {AVATARS.map((avatar) => (
        <AvatarFace key={avatar.id} avatarId={avatar.id} size={48} title={avatar.name} />
      ))}
    </div>
  ),
};
