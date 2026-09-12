import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { AvatarFace } from "./AvatarFace";
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
  {
    id: "2",
    from: "jules",
    nickname: "Jules",
    avatarId: "ghost",
    kind: "playback",
    text: "hit play",
    sentAt: 2,
  },
];

function SetupCard({ onVideo = true }: { onVideo?: boolean }) {
  const [avatarId, setAvatarId] = useState("disco");
  const [nickname, setNickname] = useState("Maya");
  const [joinCode, setJoinCode] = useState("");
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
          <p className="kicker">Handmade night in</p>
          <strong>Make the couch bigger.</strong>
          <span className="lede">Pick a face, start a party, then chat on the right.</span>
        </div>
        <label>
          Nickname
          <input
            type="text"
            value={nickname}
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        <label>
          Avatar
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        </label>
        <button className="primary" type="button" disabled={!onVideo}>
          {onVideo ? "Start the night" : "Open a video to start"}
        </button>
        <p className="or-rule">or join</p>
        <form
          className="join-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            Join with code
            <input
              type="text"
              value={joinCode}
              placeholder="cxab12cd"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setJoinCode(event.target.value)}
            />
          </label>
          <button className="ghost" type="submit" disabled={!joinCode.trim()}>
            Slide into this party
          </button>
        </form>
      </div>
    </div>
  );
}

function Lounge() {
  const [avatarId, setAvatarId] = useState("disco");
  const [messages, setMessages] = useState(seed);
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  const [drivers, setDrivers] = useState<string[]>(["maya", "jules"]);

  function toggleDrive(id: string) {
    setDrivers((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

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
      <div className="people">
        <span className="chip is-driver">
          <AvatarFace avatarId={avatarId} size={22} />
          You · host
        </span>
        <button
          className={`chip${drivers.includes("maya") ? " is-driver" : ""}`}
          type="button"
          aria-pressed={drivers.includes("maya")}
          onClick={() => toggleDrive("maya")}
        >
          <AvatarFace avatarId="fox" size={22} />
          Maya{drivers.includes("maya") ? " · drive" : ""}
        </button>
        <button
          className={`chip${drivers.includes("jules") ? " is-driver" : ""}`}
          type="button"
          aria-pressed={drivers.includes("jules")}
          onClick={() => toggleDrive("jules")}
        >
          <AvatarFace avatarId="ghost" size={22} />
          Jules{drivers.includes("jules") ? " · drive" : ""}
        </button>
      </div>
      <p className="control-hint" style={{ padding: "0 14px 8px" }}>
        Tap friends to share control. You always keep it.
      </p>
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

export const Homepage: Story = {
  render: () => <SetupCard onVideo={false} />,
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

