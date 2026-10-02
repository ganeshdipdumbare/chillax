import { useState, type ComponentProps, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chat } from "./Chat";
import type { ChatMessage } from "../shared/types";

const shell: CSSProperties = { display: "flex", flexDirection: "column", height: 520 };

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
        text: "don't open it",
        sentAt: Date.now() - 12 * 60_000,
      },
      {
        id: "2",
        from: "b",
        nickname: "Jules",
        avatarId: "ghost",
        kind: "playback",
        text: "paused the video",
        sentAt: Date.now() - 8 * 60_000,
      },
      {
        id: "3",
        from: "you",
        nickname: "You",
        avatarId: "disco",
        kind: "playback",
        text: "jumped to 1:12:04",
        sentAt: Date.now() - 5 * 60_000,
      },
      {
        id: "4",
        from: "b",
        nickname: "Jules",
        avatarId: "ghost",
        text: "NOOOOOO",
        sentAt: Date.now() - 90_000,
      },
      {
        id: "5",
        from: "you",
        nickname: "You",
        avatarId: "disco",
        text: "wait for the needle drop",
        sentAt: Date.now() - 40_000,
      },
      {
        id: "6",
        from: "c",
        nickname: "Rae",
        avatarId: "frog",
        text: "she opened it 💀",
        sentAt: Date.now() - 10_000,
      },
    ],
  },
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

function LiveChat(args: ComponentProps<typeof Chat>) {
  const [messages, setMessages] = useState<ChatMessage[]>(args.messages);
  return (
    <div className="panel story" style={shell}>
      <Chat
        {...args}
        messages={messages}
        onSend={(text) =>
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              from: "you",
              nickname: "You",
              avatarId: "disco",
              text,
              sentAt: Date.now(),
            },
          ])
        }
      />
    </div>
  );
}

export const WithMessages: Story = {
  args: { localPeerId: "you" },
  render: (args) => <LiveChat {...args} />,
};

export const Empty: Story = {
  args: { messages: [] },
  render: (args) => (
    <div className="panel story" style={shell}>
      <Chat {...args} />
    </div>
  ),
};

export const Typing: Story = {
  args: {
    localPeerId: "you",
    typing: [{ peerId: "a", nickname: "Maya", avatarId: "fox" }],
  },
  render: (args) => (
    <div className="panel story" style={shell}>
      <Chat {...args} />
    </div>
  ),
};

export const SeveralTyping: Story = {
  args: {
    localPeerId: "you",
    typing: [
      { peerId: "a", nickname: "Maya", avatarId: "fox" },
      { peerId: "b", nickname: "Jules", avatarId: "ghost" },
      { peerId: "c", nickname: "Rae", avatarId: "disco" },
    ],
  },
  render: (args) => (
    <div className="panel story" style={shell}>
      <Chat {...args} />
    </div>
  ),
};
