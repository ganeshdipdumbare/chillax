import { HEARTBEAT_MS, MSG_SOURCE_CONTENT, MSG_SOURCE_MEDIA } from "../shared/constants";
import {
  buildInviteUrl,
  clearTokenFromLocation,
  extensionOrigin,
  normalizeRoomCode,
  parseRoomToken,
  randomRoomId,
  writeTokenToLocation,
} from "../shared/ids";
import { loadAvatarId, loadNickname, saveAvatarId, saveNickname } from "../shared/storage";
import { getState, setState } from "../shared/store";
import { burstTtlMs, sprayBursts } from "../shared/reactions";
import type { MediaToContent, PlaybackAction, PopupRequest, ProtocolMessage } from "../shared/types";
import { applyHostSync } from "../player/types";
import type { PlayerAdapter } from "../player/types";
import type { SessionController } from "./session";
import { mountOverlay } from "./overlayHost";
import { pushPageOffset, watchFullscreen } from "./pageOffset";

const applying = { current: false };
let mediaWindow: Window | null = null;
let heartbeat: number | null = null;
let syncOutTimer = 0;
let hostFollowupTimer = 0;
let ignoreIncomingUntil = 0;
let suppressOutUntil = 0;
let lastControlSentAt = 0;
let lastSync: { paused: boolean; time: number; sentAt?: number } | null = null;
let lastControlPlayer: { paused: boolean; time: number } | null = null;
let pendingRole: "host" | "guest" | null = null;
let pendingRoomId: string | null = null;
let booted = false;
let followingHost = false;
const HOST_ROOM_KEY = "chillax-host-room";

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

function hostRoomFromSession(): string | null {
  try {
    return sessionStorage.getItem(HOST_ROOM_KEY);
  } catch {
    return null;
  }
}

function rememberHostRoom(roomId: string | null) {
  try {
    if (roomId) sessionStorage.setItem(HOST_ROOM_KEY, roomId);
    else sessionStorage.removeItem(HOST_ROOM_KEY);
  } catch {
    // Private mode can block sessionStorage.
  }
}

function followHostWatch(adapter: PlayerAdapter, watchUrl: string, hostContentId: string): boolean {
  if (!watchUrl && !hostContentId) return false;
  const mine = adapter.getContentId();
  if (mine && hostContentId && mine === hostContentId) return false;
  const roomId = pendingRoomId || parseRoomToken() || parseRoomToken(watchUrl);
  try {
    const dest = roomId
      ? buildInviteUrl(
          adapter.platform,
          hostContentId || mine || "",
          roomId,
          watchUrl || location.href,
        )
      : new URL(watchUrl, location.href).toString();
    if (dest === location.href) return false;
    followingHost = true;
    location.replace(dest);
    return true;
  } catch {
    return false;
  }
}

function maybeAutoJoin(session: SessionController) {
  if (getState().status !== "idle") return;
  const token = parseRoomToken();
  if (!token) return;
  if (hostRoomFromSession() === token) session.startParty(token);
  else session.joinParty(token);
}

function stopHeartbeat() {
  if (heartbeat) {
    window.clearInterval(heartbeat);
    heartbeat = null;
  }
  window.clearTimeout(syncOutTimer);
  window.clearTimeout(hostFollowupTimer);
}

function hostPeerId() {
  return getState().party?.roomId || null;
}

function myPeerId() {
  const state = getState();
  return state.localPeerId || (state.party?.role === "host" ? state.party.roomId : null);
}

function withHostController(list: string[]) {
  const hostId = hostPeerId();
  const next = list.filter((id) => id === "*" || Boolean(id));
  if (hostId && !next.includes(hostId) && !next.includes("*")) next.unshift(hostId);
  return [...new Set(next)];
}

function canControlPlayback() {
  const state = getState();
  if (state.status !== "in-party" || !state.party) return false;
  if (state.party.role === "host") return true;
  if (state.controllers.includes("*")) return true;
  const me = myPeerId();
  return Boolean(me && state.controllers.includes(me));
}

function isController(from?: string) {
  if (!from) return false;
  if (from === hostPeerId()) return true;
  const state = getState();
  if (state.controllers.includes("*")) return true;
  return state.controllers.includes(from);
}

function canAcceptSyncFrom(
  from?: string,
  sentAt?: number,
  mode?: "control" | "heartbeat" | "followup",
) {
  if (from && from === myPeerId()) return false;
  if (!isController(from) && from !== hostPeerId()) {
    if (!from) return getState().party?.role === "guest";
    return false;
  }
  const isControl = mode === "control";
  if (isControl) {
    if (sentAt && lastControlSentAt && sentAt < lastControlSentAt) return false;
    return true;
  }
  if (Date.now() < ignoreIncomingUntil) return false;
  if (sentAt && lastControlSentAt && sentAt <= lastControlSentAt) return false;
  return true;
}

function applyControllers(list: string[]) {
  setState({ controllers: withHostController(list) });
}

function sendControlPolicy() {
  const state = getState();
  if (state.party?.role !== "host") return;
  const controllers = withHostController(state.controllers);
  sendToMedia({
    type: "send-protocol",
    message: {
      type: "control-policy",
      controllers,
      guestPlayback: controllers.includes("*") || controllers.length > 1,
    } satisfies ProtocolMessage,
  });
}

function noteControlPlayer(player: { paused: boolean; time: number }) {
  lastControlPlayer = { paused: player.paused, time: player.time };
}

function formatWatchTime(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function inferControlAction(player: { paused: boolean; time: number }): PlaybackAction | null {
  const prev = lastControlPlayer;
  noteControlPlayer(player);
  if (!prev) return player.paused ? "pause" : "play";
  if (player.paused !== prev.paused) return player.paused ? "pause" : "play";
  if (Math.abs(player.time - prev.time) > 2.5) return "seek";
  return null;
}

function playbackText(action: PlaybackAction, time: number) {
  if (action === "pause") return "paused the video";
  if (action === "play") return "hit play";
  return `jumped to ${formatWatchTime(time)}`;
}

function isDuplicatePlayback(from: string, text: string, sentAt: number) {
  return getState().messages.some(
    (msg) =>
      msg.kind === "playback" &&
      msg.from === from &&
      msg.text === text &&
      Math.abs(sentAt - msg.sentAt) < 2000,
  );
}

function appendPlaybackNotice(notice: {
  from: string;
  nickname: string;
  avatarId: string;
  action: PlaybackAction;
  time: number;
  sentAt: number;
  relay?: boolean;
}) {
  if (!getState().party || !notice.from) return;
  const text = playbackText(notice.action, notice.time);
  const id = `playback:${notice.from}:${notice.sentAt}:${notice.action}`;
  if (getState().messages.some((msg) => msg.id === id)) return;
  if (isDuplicatePlayback(notice.from, text, notice.sentAt)) return;
  const message: ProtocolMessage = {
    type: "chat",
    kind: "playback",
    id,
    from: notice.from,
    nickname: notice.nickname,
    avatarId: notice.avatarId,
    text,
    sentAt: notice.sentAt,
  };
  setState({ messages: [...getState().messages, message].slice(-200) });
  if (notice.relay) sendToMedia({ type: "send-protocol", message });
}

function actorFromSync(message: Extract<ProtocolMessage, { type: "sync" }>) {
  const from = message.from || "";
  const person = getState().participants.find((item) => item.peerId === from);
  return {
    from,
    nickname: message.nickname || person?.nickname || "Someone",
    avatarId: message.avatarId || person?.avatarId || "fox",
  };
}

function logControlPlayback(message: Extract<ProtocolMessage, { type: "sync" }>) {
  if (!message.action) return;
  const actor = actorFromSync(message);
  appendPlaybackNotice({
    from: actor.from,
    nickname: actor.nickname,
    avatarId: actor.avatarId,
    action: message.action,
    time: message.time,
    sentAt: message.sentAt,
  });
}

function broadcastSync(adapter: PlayerAdapter, reason: "heartbeat" | "followup" | "control" = "heartbeat") {
  const state = getState();
  if (!canControlPlayback()) return;
  const party = state.party;
  if (!party) return;
  if (applying.current || adapter.isAdPlaying()) return;
  const player = adapter.getState();
  if (!player) return;
  if (Date.now() < suppressOutUntil) {
    if (reason !== "control") return;
    if (
      lastSync &&
      player.paused === lastSync.paused &&
      Math.abs(player.time - lastSync.time) < 2.5
    ) {
      return;
    }
  }
  const sentAt = Date.now();
  const action = reason === "control" ? inferControlAction(player) : null;
  if (reason === "control") {
    ignoreIncomingUntil = Date.now() + 1200;
    lastControlSentAt = sentAt;
    if (action) {
      appendPlaybackNotice({
        from: myPeerId() || party.roomId,
        nickname: state.nickname,
        avatarId: state.avatarId,
        action,
        time: player.time,
        sentAt,
        relay: true,
      });
    }
  }
  sendToMedia({
    type: "send-protocol",
    message: {
      type: "sync",
      paused: player.paused,
      time: player.time,
      sentAt,
      platform: adapter.platform,
      contentId: adapter.getContentId() || "",
      watchUrl: currentWatchUrl(adapter, party.roomId),
      from: myPeerId() || undefined,
      controllers: party.role === "host" ? withHostController(state.controllers) : undefined,
      mode: reason,
      ...(reason === "control" && action
        ? { action, nickname: state.nickname, avatarId: state.avatarId }
        : {}),
    } satisfies ProtocolMessage,
  });
}

function startHeartbeat(adapter: PlayerAdapter) {
  stopHeartbeat();
  heartbeat = window.setInterval(() => broadcastSync(adapter), HEARTBEAT_MS);
}

function addBurst(emoji: string) {
  const extra = sprayBursts(emoji);
  setState({ bursts: [...getState().bursts, ...extra].slice(-64) });
  for (const burst of extra) {
    window.setTimeout(() => {
      setState({ bursts: getState().bursts.filter((item) => item.id !== burst.id) });
    }, burstTtlMs(burst));
  }
}

async function handleProtocol(adapter: PlayerAdapter, message: ProtocolMessage) {
  const state = getState();
  if (message.type === "chat") {
    if (state.messages.some((item) => item.id === message.id)) return;
    if (message.kind === "playback" && isDuplicatePlayback(message.from, message.text, message.sentAt)) return;
    setState({ messages: [...state.messages, message].slice(-200) });
    return;
  }
  if (message.type === "reaction") {
    addBurst(message.emoji);
    return;
  }
  if (message.type === "control-policy") {
    if (state.party?.role === "host") return;
    if (message.controllers?.length) {
      applyControllers(message.controllers);
      return;
    }
    applyControllers(message.guestPlayback ? ["*"] : []);
    return;
  }
  if (message.type === "hello") {
    if (state.party?.role === "host") {
      sendControlPolicy();
      broadcastSync(adapter);
    }
  }
  if (message.type === "sync" || message.type === "hello") {
    const contentId = adapter.getContentId();
    if (message.platform !== adapter.platform) {
      setState({
        wrongTitle: { hostUrl: message.watchUrl, hostContentId: message.contentId },
      });
      return;
    }
    if (
      (!contentId && message.contentId) ||
      (contentId && message.contentId && message.contentId !== contentId)
    ) {
      if (followHostWatch(adapter, message.watchUrl, message.contentId)) return;
      setState({
        wrongTitle: { hostUrl: message.watchUrl, hostContentId: message.contentId },
      });
      return;
    }
    setState({ wrongTitle: null });
  }
  if (message.type === "sync" && message.controllers && message.from === hostPeerId()) {
    applyControllers(message.controllers);
  }
  if (message.type === "sync") {
    const mode = message.mode ?? "control";
    if (!canAcceptSyncFrom(message.from, message.sentAt, mode)) return;
    const local = adapter.getState();
    if (mode !== "control" && local && local.paused !== message.paused && message.from !== hostPeerId()) {
      return;
    }
    lastSync = { paused: message.paused, time: message.time, sentAt: message.sentAt };
    if (mode === "control") {
      lastControlSentAt = Math.max(lastControlSentAt, message.sentAt);
      ignoreIncomingUntil = Date.now() + 800;
      logControlPlayback(message);
      noteControlPlayer({ paused: message.paused, time: message.time });
    }
    suppressOutUntil = Date.now() + 800;
    const result = await applyHostSync(adapter, message, applying);
    if (result === "gesture") setState({ needsGesture: true });
    if (getState().party?.role === "host" && mode === "control") {
      window.clearTimeout(hostFollowupTimer);
      hostFollowupTimer = window.setTimeout(() => {
        if (Date.now() < ignoreIncomingUntil) return;
        broadcastSync(adapter, "followup");
      }, 500);
    }
  }
}

export async function boot(adapter: PlayerAdapter) {
  if (window !== window.top) return;
  if (booted || document.getElementById("chillax-root")) return;
  booted = true;

  try {
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
    startParty: (roomId) => {
      const status = getState().status;
      if (status === "connecting" || status === "in-party") return;
      if (!adapter.isWatchPage() || !adapter.getContentId()) {
        setState({ error: "Open a video or title first.", overlayOpen: true });
        return;
      }
      pendingRole = "host";
      pendingRoomId = normalizeRoomCode(roomId || "") || randomRoomId();
      rememberHostRoom(pendingRoomId);
      setState({
        status: "connecting",
        error: null,
        overlayOpen: true,
        callDetail: "Opening your party…",
        controllers: [],
        messages: [],
        participants: [],
        bursts: [],
      });
      pushPageOffset(adapter.platform, true);
    },
    joinParty: (roomId: string) => {
      const status = getState().status;
      if (status === "connecting" || status === "in-party") return;
      const code = normalizeRoomCode(roomId);
      if (!code) {
        setState({
          error: "That doesn’t look like a party code. Paste the invite link or the cx-code.",
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
        callDetail: "Joining that party…",
        controllers: [],
        messages: [],
        participants: [],
        bursts: [],
      });
      pushPageOffset(adapter.platform, true);
    },
    leaveParty: () => {
      const keepLounge = getState().status === "connecting";
      sendToMedia({ type: "leave" });
      stopHeartbeat();
      pendingRole = null;
      pendingRoomId = null;
      rememberHostRoom(null);
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
        controllers: [],
        localPeerId: null,
        overlayOpen: keepLounge,
      });
      lastSync = null;
      lastControlPlayer = null;
      ignoreIncomingUntil = 0;
      suppressOutUntil = 0;
      lastControlSentAt = 0;
      pushPageOffset(adapter.platform, keepLounge);
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
    setController: (peerId: string, allowed: boolean) => {
      if (getState().party?.role !== "host") return;
      const hostId = hostPeerId();
      if (!hostId || peerId === hostId) return;
      const current = withHostController(getState().controllers).filter((id) => id !== "*");
      const next = allowed
        ? withHostController([...current, peerId])
        : withHostController(current.filter((id) => id !== peerId));
      setState({ controllers: next });
      sendControlPolicy();
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
        localPeerId: data.peerId,
        controllers: role === "host" ? [data.peerId] : getState().controllers,
        error: null,
        callDetail: null,
      });
      pushPageOffset(adapter.platform, true);
      startHeartbeat(adapter);
      if (role === "host") broadcastSync(adapter);
    }
    if (data.type === "protocol" && data.message) {
      void handleProtocol(adapter, data.message);
    }
    if (data.type === "participants") {
      const people = data.participants;
      const hostId = hostPeerId();
      const allowed = new Set(people.map((person) => person.peerId));
      if (hostId) allowed.add(hostId);
      const prev = getState().controllers;
      const controllers = withHostController(prev.filter((id) => id === "*" || allowed.has(id)));
      setState({ participants: people, controllers });
      if (getState().party?.role === "host" && controllers.join() !== prev.join()) sendControlPolicy();
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

  adapter.onChange(() => {
    if (applying.current) return;
    if (!canControlPlayback()) {
      if (lastSync) void applyHostSync(adapter, lastSync, applying);
      return;
    }
    window.clearTimeout(syncOutTimer);
    syncOutTimer = window.setTimeout(() => broadcastSync(adapter, "control"), 120);
  });
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
    maybeAutoJoin(session);
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    if (followingHost) return;
    session.leaveParty();
  });
  maybeAutoJoin(session);
  } catch (error) {
    booted = false;
    throw error;
  }
}
