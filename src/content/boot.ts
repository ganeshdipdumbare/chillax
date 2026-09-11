import { HEARTBEAT_MS, MSG_SOURCE_CONTENT, MSG_SOURCE_MEDIA } from "../shared/constants";
import {
  buildInviteUrl,
  clearTokenFromLocation,
  extensionOrigin,
  randomRoomId,
  writeTokenToLocation,
} from "../shared/ids";
import { loadAvatarId, loadNickname, saveAvatarId, saveNickname } from "../shared/storage";
import { getState, setState } from "../shared/store";
import type { MediaToContent, PopupRequest, ProtocolMessage, ReactionBurst } from "../shared/types";
import { applyHostSync } from "../player/types";
import type { PlayerAdapter } from "../player/types";
import type { SessionController } from "./session";
import { mountOverlay } from "./overlayHost";
import { pushPageOffset, watchFullscreen } from "./pageOffset";

const applying = { current: false };
let mediaWindow: Window | null = null;
let heartbeat: number | null = null;
let pendingRole: "host" | "guest" | null = null;
let pendingRoomId: string | null = null;

function sendPartyInit(adapter: PlayerAdapter) {
  if (!mediaWindow || !pendingRole || !pendingRoomId) return;
  const state = getState();
  sendToMedia({
    type: "init",
    role: pendingRole,
    roomId: pendingRoomId,
    nickname: state.nickname,
    avatarId: state.avatarId,
    platform: adapter.platform,
    contentId: adapter.getContentId(),
    watchUrl: currentWatchUrl(adapter, pendingRoomId),
  });
}

function sendToMedia(payload: Record<string, unknown>) {
  if (!mediaWindow || mediaWindow === window) return;
  mediaWindow.postMessage({ source: MSG_SOURCE_CONTENT, ...payload }, "*");
}

function currentWatchUrl(adapter: PlayerAdapter, roomId?: string) {
  const contentId = adapter.getContentId() || "";
  if (roomId) return buildInviteUrl(adapter.platform, contentId, roomId);
  return location.href;
}

function stopHeartbeat() {
  if (heartbeat) {
    window.clearInterval(heartbeat);
    heartbeat = null;
  }
}

function broadcastSync(adapter: PlayerAdapter) {
  const state = getState();
  if (state.party?.role !== "host" || state.status !== "in-party") return;
  if (applying.current || adapter.isAdPlaying()) return;
  const player = adapter.getState();
  if (!player) return;
  sendToMedia({
    type: "send-protocol",
    message: {
      type: "sync",
      paused: player.paused,
      time: player.time,
      sentAt: Date.now(),
      platform: adapter.platform,
      contentId: adapter.getContentId() || "",
      watchUrl: currentWatchUrl(adapter, state.party.roomId),
    } satisfies ProtocolMessage,
  });
}

function startHeartbeat(adapter: PlayerAdapter) {
  stopHeartbeat();
  heartbeat = window.setInterval(() => broadcastSync(adapter), HEARTBEAT_MS);
}

function makeBurst(emoji: string): ReactionBurst {
  return {
    id: crypto.randomUUID(),
    emoji,
    x: 10 + Math.random() * 70,
    spin: Math.round(-28 + Math.random() * 56),
    wobble: Math.round(Math.random() * 220),
  };
}

function addBurst(emoji: string) {
  const burst = makeBurst(emoji);
  setState({ bursts: [...getState().bursts, burst].slice(-24) });
  window.setTimeout(() => {
    setState({ bursts: getState().bursts.filter((item) => item.id !== burst.id) });
  }, 2800);
}

async function handleProtocol(adapter: PlayerAdapter, message: ProtocolMessage) {
  const state = getState();
  if (message.type === "chat") {
    setState({ messages: [...state.messages, message].slice(-200) });
    return;
  }
  if (message.type === "reaction") {
    addBurst(message.emoji);
    return;
  }
  if (message.type === "sync" || message.type === "hello") {
    const contentId = adapter.getContentId();
    if (
      message.platform !== adapter.platform ||
      (contentId && message.contentId && message.contentId !== contentId)
    ) {
      setState({
        wrongTitle: { hostUrl: message.watchUrl, hostContentId: message.contentId },
      });
      return;
    }
    setState({ wrongTitle: null });
  }
  if (message.type === "sync" && state.party?.role === "guest") {
    const result = await applyHostSync(adapter, message, applying);
    if (result === "gesture") setState({ needsGesture: true });
  }
}

export async function boot(adapter: PlayerAdapter) {
  if (document.getElementById("chillax-root")) return;

  const nickname = await loadNickname();
  const avatarId = await loadAvatarId();
  setState({
    nickname,
    avatarId,
    isWatchPage: adapter.isWatchPage(),
    contentId: adapter.getContentId(),
    overlayOpen: false,
  });

  const session: SessionController = {
    startParty: () => {
      const status = getState().status;
      if (status === "connecting" || status === "in-party") return;
      if (!adapter.isWatchPage() || !adapter.getContentId()) {
        setState({ error: "Open a video or title first.", overlayOpen: true });
        return;
      }
      pendingRole = "host";
      pendingRoomId = randomRoomId();
      setState({
        status: "connecting",
        error: null,
        overlayOpen: true,
        messages: [],
        participants: [],
        bursts: [],
      });
      pushPageOffset(adapter.platform, true);
    },
    joinParty: (roomId: string) => {
      const status = getState().status;
      if (status === "connecting" || status === "in-party") return;
      const code = roomId.replace(/^#/, "").trim();
      if (!code) return;
      if (!adapter.isWatchPage()) {
        setState({
          error: "Open the same video or title as the host, then join.",
          overlayOpen: true,
        });
        return;
      }
      pendingRole = "guest";
      pendingRoomId = code;
      setState({
        status: "connecting",
        error: null,
        overlayOpen: true,
        messages: [],
        participants: [],
        bursts: [],
      });
      pushPageOffset(adapter.platform, true);
    },
    leaveParty: () => {
      sendToMedia({ type: "leave" });
      stopHeartbeat();
      pendingRole = null;
      pendingRoomId = null;
      clearTokenFromLocation(adapter.platform);
      setState({
        party: null,
        status: "idle",
        error: null,
        wrongTitle: null,
        messages: [],
        participants: [],
        bursts: [],
        callDetail: null,
      });
    },
    sendChat: (text: string) => {
      const state = getState();
      const peerId = state.participants.find((p) => p.nickname === state.nickname)?.peerId;
      if (!state.party || !text.trim()) return;
      const message: ProtocolMessage = {
        type: "chat",
        id: crypto.randomUUID(),
        from: peerId || state.party.roomId,
        nickname: state.nickname,
        avatarId: state.avatarId,
        text: text.trim(),
        sentAt: Date.now(),
      };
      setState({ messages: [...state.messages, message].slice(-200) });
      sendToMedia({ type: "send-protocol", message });
    },
    sendReaction: (emoji: string) => {
      const state = getState();
      if (!state.party) return;
      addBurst(emoji);
      const message: ProtocolMessage = {
        type: "reaction",
        id: crypto.randomUUID(),
        from: state.party.roomId,
        nickname: state.nickname,
        avatarId: state.avatarId,
        emoji,
        sentAt: Date.now(),
      };
      sendToMedia({ type: "send-protocol", message });
    },
    setNickname: async (name: string) => {
      const next = await saveNickname(name);
      setState({ nickname: next });
      sendToMedia({ type: "nickname", nickname: next, avatarId: getState().avatarId });
    },
    setAvatar: async (avatarId: string) => {
      const next = await saveAvatarId(avatarId);
      setState({ avatarId: next });
      sendToMedia({ type: "nickname", nickname: getState().nickname, avatarId: next });
    },
    toggleOverlay: (open?: boolean) => {
      const next = open ?? !getState().overlayOpen;
      setState({ overlayOpen: next });
      pushPageOffset(adapter.platform, next);
    },
    enablePlayback: () => {
      void adapter.play();
      setState({ needsGesture: false });
    },
    registerMediaWindow: (win) => {
      mediaWindow = win && win !== window ? win : null;
      sendPartyInit(adapter);
    },
  };

  mountOverlay(session);
  pushPageOffset(adapter.platform, getState().overlayOpen);
  watchFullscreen(adapter.platform, () => getState().overlayOpen);

  chrome.runtime.onMessage.addListener((message: PopupRequest, _sender, sendResponse) => {
    switch (message.type) {
      case "CHILLAX_GET_STATE":
        sendResponse(getState());
        break;
      case "CHILLAX_START":
        session.startParty();
        sendResponse({ ok: true });
        break;
      case "CHILLAX_JOIN":
        session.joinParty(message.roomId);
        sendResponse({ ok: true });
        break;
      case "CHILLAX_LEAVE":
        session.leaveParty();
        sendResponse({ ok: true });
        break;
      case "CHILLAX_SET_NICKNAME":
        void session.setNickname(message.nickname).then(() => sendResponse({ ok: true }));
        return true;
      case "CHILLAX_SET_AVATAR":
        void session.setAvatar(message.avatarId).then(() => sendResponse({ ok: true }));
        return true;
      case "CHILLAX_TOGGLE_OVERLAY":
        session.toggleOverlay();
        sendResponse({ ok: true });
        break;
      default:
        break;
    }
    return false;
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== extensionOrigin()) return;
    const data = event.data as MediaToContent;
    if (data?.source !== MSG_SOURCE_MEDIA) return;
    if (data.type === "iframe-ready") {
      sendPartyInit(adapter);
    }
    if (data.type === "ready" && data.peerId && pendingRole) {
      const role = pendingRole;
      const roomId = role === "host" ? data.peerId : pendingRoomId!;
      const inviteUrl = buildInviteUrl(
        adapter.platform,
        adapter.getContentId() || "",
        roomId,
      );
      writeTokenToLocation(adapter.platform, roomId);
      pendingRole = null;
      setState({
        status: "in-party",
        party: { role, roomId, inviteUrl },
        error: null,
      });
      if (role === "host") {
        startHeartbeat(adapter);
        broadcastSync(adapter);
      }
    }
    if (data.type === "protocol" && data.message) {
      void handleProtocol(adapter, data.message);
    }
    if (data.type === "participants") {
      setState({ participants: data.participants });
    }
    if (data.type === "local-media") {
      setState({ muted: data.muted, cameraOn: data.cameraOn });
    }
    if (data.type === "error") {
      if (getState().status === "in-party") {
        setState({ error: data.message, callDetail: data.message });
        return;
      }
      pendingRole = null;
      pendingRoomId = null;
      stopHeartbeat();
      setState({ status: "error", error: data.message });
    }
    if (data.type === "call-status") {
      setState({
        callConnected: data.connected,
        callDetail: data.detail ?? null,
      });
    }
    if (data.type === "host-left") {
      session.leaveParty();
      setState({ error: "The host left the party." });
    }
  });

  adapter.onChange(() => broadcastSync(adapter));
  let leaveWatchTimer: number | null = null;
  adapter.onNavigate(() => {
    const onWatch = adapter.isWatchPage();
    const contentId = adapter.getContentId();
    setState({
      isWatchPage: onWatch,
      contentId,
    });
    const party = getState().party;
    if (leaveWatchTimer) {
      window.clearTimeout(leaveWatchTimer);
      leaveWatchTimer = null;
    }
    if (party && !onWatch) {
      leaveWatchTimer = window.setTimeout(() => {
        leaveWatchTimer = null;
        if (getState().party && !adapter.isWatchPage()) session.leaveParty();
      }, 1200);
      return;
    }
    if (party && contentId) {
      setState({
        party: {
          ...party,
          inviteUrl: buildInviteUrl(adapter.platform, contentId, party.roomId),
        },
      });
    }
    pushPageOffset(adapter.platform, getState().overlayOpen);
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    session.leaveParty();
  });
}
