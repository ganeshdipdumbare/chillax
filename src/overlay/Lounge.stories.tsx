import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { Chat } from "./Chat";
import { ReactionSky } from "./ReactionSky";
import type { ChatMessage, ReactionBurst } from "../shared/types";
import type { ReactionEmoji } from "../shared/avatars";

const seed: ChatMessage[] = [
  {
    id: "1",
    from: "host",
    nickname: "Maya",
    avatarId: "fox",
    text: "headphones on, we start in 10",
    sentAt: 1,
  },
];

function Lounge() {
  const [avatarId, setAvatarId] = useState("disco");
  const [messages, setMessages] = useState(seed);
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);

  function react(emoji: ReactionEmoji) {
    const burst: ReactionBurst = {
      id: crypto.randomUUID(),
      emoji,
      x: 12 + Math.random() * 70,
      spin: Math.round(-20 + Math.random() * 40),
      wobble: 0,
    };
    setBursts((current) => [...current, burst].slice(-12));
    window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== burst.id));
    }, 2600);
  }

  return (
    <div className="panel story">
      <ReactionSky bursts={bursts} />
      <header className="header">
        <div className="brand">
          <span className="logo">Cx</span>
          <div>
            <h1>Chillax</h1>
            <p>YouTube night · host</p>
          </div>
        </div>
      </header>
      <div className="idle" style={{ paddingBottom: 0 }}>
        <div className="hero">
          <strong>Make the couch bigger.</strong>
        </div>
        <label>
          Avatar
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        </label>
      </div>
      <Chat
        messages={messages}
        onReact={react}
        onSend={(text) =>
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              from: "you",
              nickname: "You",
              avatarId,
              text,
              sentAt: Date.now(),
            },
          ])
        }
      />
    </div>
  );
}

const meta = {
  title: "Lounge/FullSidebar",
  component: Lounge,
} satisfies Meta<typeof Lounge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
