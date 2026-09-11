import type { Meta, StoryObj } from "@storybook/react-vite";
import { CameraIcon, MicIcon } from "../overlay/icons";

function Controls({ muted, cameraOn }: { muted: boolean; cameraOn: boolean }) {
  return (
    <div className="wrap" style={{ width: 336, height: 80 }}>
      <div className="controls">
        <button type="button" className={muted ? "is-off" : "is-on"}>
          <MicIcon off={muted} />
          {muted ? "Mic off" : "Mic on"}
        </button>
        <button type="button" className={cameraOn ? "is-on" : "is-off"}>
          <CameraIcon off={!cameraOn} />
          {cameraOn ? "Camera on" : "Camera off"}
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: "Lounge/MediaControls",
  component: Controls,
  args: { muted: false, cameraOn: false },
} satisfies Meta<typeof Controls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MicOnCameraOff: Story = {};

export const BothOff: Story = {
  args: { muted: true, cameraOn: false },
};

export const BothOn: Story = {
  args: { muted: false, cameraOn: true },
};
