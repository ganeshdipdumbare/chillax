import { isSupportedHost } from "./shared/ids";

const HINT_POPUP = "src/popup/index.html";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.setPopup({ popup: "" });
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.action.setPopup({ popup: "" });
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
    }
  }
  await openHintPopup();
}

async function openHintPopup() {
  await chrome.action.setPopup({ popup: HINT_POPUP });
  try {
    await chrome.action.openPopup();
  } catch {
    await chrome.windows.create({
      url: chrome.runtime.getURL(HINT_POPUP),
      type: "popup",
      width: 380,
      height: 260,
      focused: true,
    });
  } finally {
    await chrome.action.setPopup({ popup: "" });
  }
}
