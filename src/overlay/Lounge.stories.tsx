import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { Chat } from "./Chat";
import { HideIcon } from "./icons";
import { LoungeArt } from "./SpotArt";
import { ReactionSky } from "./ReactionSky";
import { burstTtlMs, sprayBursts } from "../shared/reactions";
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

function SetupCard() {
  const [avatarId, setAvatarId] = useState("disco");
  return (
    <div className="panel is-lounge story">
      <header className="header">
        <div className="brand">
          <span className="logo">Cx</span>
          <div>
            <h1>Chillax</h1>
            <p>YouTube night</p>
          </div>
        </div>
      </header>
      <div className="idle">
        <div className="hero">
          <div className="storyboard">
            <LoungeArt />
          </div>
          <strong>Make the couch bigger.</strong>
          <span className="lede">Pick a face, start a party, then chat on the right.</span>
        </div>
        <label>
          Avatar
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        </label>
        <button className="primary" type="button">
          Start the night
        </button>
        <button className="ghost" type="button">
          Slide into this party
        </button>
      </div>
    </div>
  );
}

function Lounge() {
  const [avatarId, setAvatarId] = useState("disco");
  const [messages, setMessages] = useState(seed);
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);

  function react(emoji: ReactionEmoji) {
    const extra = sprayBursts(emoji);
    setBursts((current) => [...current, ...extra].slice(-64));
    for (const burst of extra) {
      window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
      }, burstTtlMs(burst));
    }
  }

  return (
    <div className="story-stage">
      <ReactionSky bursts={bursts} />
      <div className="panel story">
      <header className="header">
        <div className="brand">
          <span className="logo">Cx</span>
          <div>
            <h1>Chillax</h1>
            <p>YouTube night · host</p>
          </div>
        </div>
        <button className="text-btn" type="button">
          Hide chat
          <HideIcon />
        </button>
      </header>
      <div className="idle" style={{ paddingBottom: 0 }}>
        <div className="hero">
          <div className="storyboard">
            <LoungeArt />
          </div>
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

export const Setup: Story = {
  render: () => <SetupCard />,
};

export const ChatToggle: Story = {
  render: () => (
    <div className="story-stage">
      <button className="tab" type="button" title="Open Chillax chat — you are still in the party">
        Chillax chat
      </button>
    </div>
  ),
};
