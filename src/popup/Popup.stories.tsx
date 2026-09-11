import type { Meta, StoryObj } from "@storybook/react-vite";
import { PopupHint } from "./Popup";
import "./popup.css";

function Hint() {
  return <PopupHint />;
}

const meta = {
  title: "Popup/Hint",
  component: Hint,
} satisfies Meta<typeof Hint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Offsite: Story = {};
