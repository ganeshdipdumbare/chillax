import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import {
  ChatArt,
  DevModeArt,
  DisguiseArt,
  LoungeArt,
  ReactionsArt,
  StillWatchingArt,
} from "./SpotArt";

const pieces: { name: string; where: string; Art: ComponentType; paper: string; width: number }[] = [
  { name: "LoungeArt", where: "Setup card and website hero", Art: LoungeArt, paper: "#c3d3ce", width: 560 },
  { name: "DisguiseArt", where: "Website: click Cx, open the lounge", Art: DisguiseArt, paper: "#c3d3ce", width: 360 },
  { name: "ChatArt", where: "Empty chat and website: yell at the screen", Art: ChatArt, paper: "#c3d3ce", width: 360 },
  { name: "ReactionsArt", where: "Website: react without pausing", Art: ReactionsArt, paper: "#f8dbca", width: 360 },
  { name: "DevModeArt", where: "Website: install steps", Art: DevModeArt, paper: "#c3d3ce", width: 360 },
  { name: "StillWatchingArt", where: "Popup and website footer", Art: StillWatchingArt, paper: "#f8dbca", width: 360 },
];

function Frame({ Art, paper, width }: { Art: ComponentType; paper: string; width: number }) {
  return (
    <div className="storyboard" style={{ width, background: paper }}>
      <Art />
    </div>
  );
}

function Gallery() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 360px)", gap: 24, padding: 24 }}>
      {pieces.map(({ name, where, Art, paper }) => (
        <figure key={name} style={{ margin: 0, display: "grid", gap: 8 }}>
          <Frame Art={Art} paper={paper} width={360} />
          <figcaption style={{ font: "500 12px/1.4 var(--font-mono)", color: "var(--mute)" }}>
            <strong style={{ color: "var(--ink)" }}>{name}</strong> &middot; {where}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

const meta = {
  title: "Illustrations/Spot art",
  component: Gallery,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};

function single(index: number): Story {
  const { Art, paper, width } = pieces[index];
  return {
    parameters: { layout: "centered" },
    render: () => <Frame Art={Art} paper={paper} width={width} />,
  };
}

export const Lounge = single(0);
export const Disguise = single(1);
export const Chat = single(2);
export const Reactions = single(3);
export const DevMode = single(4);
export const StillWatching = single(5);
