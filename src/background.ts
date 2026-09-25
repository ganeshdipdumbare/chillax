import { isSupportedHost } from "./shared/ids";

const HINT_POPUP = "src/popup/index.html";

// Unsupported tabs get the hint as a regular toolbar popup; openPopup() from onClicked is unreliable
// and its window fallback opens as a full-screen space when Chrome is full screen on macOS.
function syncTabPopup(tabId: number, url?: string) {
  void chrome.action
    .setPopup({ tabId, popup: isSupportedHost(url) ? "" : HINT_POPUP })
    .catch(() => undefined);
}

async function syncAllTabs() {
  await chrome.action.setPopup({ popup: "" });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id !== undefined) syncTabPopup(tab.id, tab.url);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void syncAllTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void syncAllTabs();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined || changeInfo.status === "loading") syncTabPopup(tabId, tab.url);
});

chrome.action.onClicked.addListener((tab) => {
  void handleActionClick(tab);
});

async function handleActionClick(tab: chrome.tabs.Tab) {
  if (tab.id && isSupportedHost(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "CHILLAX_TOGGLE_OVERLAY" });
      return;
    } catch {
      // Content script is not ready yet (refresh, or the page just loaded).
      try {
        const isNetflix = tab.url?.includes("netflix.com");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [isNetflix ? "src/content/netflix.ts" : "src/content/youtube.ts"],
        });
        // Give it a small amount of time to initialize
        await new Promise((resolve) => setTimeout(resolve, 200));
        await chrome.tabs.sendMessage(tab.id, { type: "CHILLAX_TOGGLE_OVERLAY" });
        return;
      } catch (e) {
        // Fall back to popup if injection truly fails
      }
    }
  }
  await openHintPopup(tab);
}

async function openHintPopup(tab: chrome.tabs.Tab) {
  const tabId = tab.id;
  await chrome.action.setPopup(tabId === undefined ? { popup: HINT_POPUP } : { tabId, popup: HINT_POPUP });
  try {
    await chrome.action.openPopup(tab.windowId === undefined ? undefined : { windowId: tab.windowId });
  } catch {
    await chrome.windows.create({
      url: chrome.runtime.getURL(HINT_POPUP),
      type: "popup",
      width: 380,
      height: 260,
      focused: true,
    });
  } finally {
    if (tabId === undefined) await chrome.action.setPopup({ popup: "" });
    else syncTabPopup(tabId, tab.url);
  }
}
