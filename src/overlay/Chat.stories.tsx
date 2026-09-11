import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chat } from "./Chat";

const meta = {
  title: "Lounge/Chat",
  component: Chat,
  args: {
    onSend: () => undefined,
    onReact: () => undefined,
    messages: [
      {
        id: "1",
        from: "a",
        nickname: "Maya",
        avatarId: "fox",
        text: "this scene is everything",
        sentAt: 1,
      },
      {
        id: "2",
        from: "b",
        nickname: "Jules",
        avatarId: "ghost",
        text: "wait for the needle drop",
        sentAt: 2,
      },
    ],
  },
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMessages: Story = {
  render: (args) => (
    <div className="panel story" style={{ display: "flex", flexDirection: "column" }}>
      <Chat {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { messages: [] },
  render: (args) => (
    <div className="panel story" style={{ display: "flex", flexDirection: "column" }}>
      <Chat {...args} />
    </div>
  ),
};
