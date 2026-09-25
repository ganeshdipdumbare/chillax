import type { Preview } from "@storybook/react-vite";
import "../src/shared/fonts.css";
import "../src/overlay/overlay.css";
import "../src/media/media.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      options: {
        canvas: { name: "canvas", value: "#fbfaf4" },
        sand: { name: "sand", value: "#d6d0c3" },
        ink: { name: "ink", value: "#0e1113" },
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Chillax theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "canvas" },
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === "dark";
      document.documentElement.classList.toggle("theme-dark", dark);
      return (
        <div className={dark ? "chillax-scope theme-dark" : "chillax-scope"}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
