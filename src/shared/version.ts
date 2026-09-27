import { version as packageVersion } from "../../package.json";

/** Installed extension version from the Chrome manifest (falls back for Storybook). */
export function appVersion(): string {
  try {
    const fromChrome = chrome.runtime?.getManifest?.()?.version;
    if (fromChrome) return fromChrome;
  } catch {
    // Outside the extension context.
  }
  return packageVersion;
}

/** Display label, e.g. `v1.2.2`. */
export function appVersionLabel(): string {
  return `v${appVersion()}`;
}
