import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";

const meta = {
  title: "Lounge/AvatarPicker",
  component: AvatarPicker,
} satisfies Meta<typeof AvatarPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: { value: "disco", onChange: () => undefined },
  render: function Picker() {
    const [value, setValue] = useState("disco");
    return (
      <div style={{ width: 360 }}>
        <AvatarPicker value={value} onChange={setValue} />
      </div>
    );
  },
};
