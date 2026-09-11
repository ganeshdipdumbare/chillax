import type { Preview } from "@storybook/react-vite";
import "../src/overlay/overlay.css";
import "../src/media/media.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      options: {
        lounge: { name: "lounge", value: "#09060f" },
        light: { name: "light", value: "#f7f0e6" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "lounge" },
  },
  decorators: [
    (Story) => (
      <div className="chillax-scope">
        <Story />
      </div>
    ),
  ],
};

export default preview;
