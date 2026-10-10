import {
  HEARTBEAT_MS,
  MSG_SOURCE_CONTENT,
  MSG_SOURCE_MEDIA,
  TYPING_REFRESH_MS,
  TYPING_TTL_MS,
} from "../shared/constants";
import {
  buildInviteUrl,
  clearTokenFromLocation,
  extensionOrigin,
  mediaPageUrl,
  forgetInviteToken,
  normalizeRoomCode,
  parseRoomToken,
  pendingInviteToken,
  randomRoomId,
  rememberInviteToken,
  writeTokenToLocation,
} from "../shared/ids";
import { loadAvatarId, loadNickname, saveAvatarId, saveNickname } from "../shared/storage";
import { getState, setState } from "../shared/store";
import { burstTtlMs, sprayBursts } from "../shared/reactions";
import type { MediaToContent, PlaybackAction, PopupRequest, ProtocolMessage, TypingPeer } from "../shared/types";
import { applyHostSync } from "../player/types";
import type { PlayerAdapter } from "../player/types";
import { placeholderLocalStream } from "../p2p/mesh";
import { PeerRoom } from "../p2p/room";
import type { SessionController } from "./session";
import { ensureCallFrame } from "./callFrame";
import { mountOverlay } from "./overlayHost";
import { pushPageOffset, watchFullscreen } from "./pageOffset";
import { findPlayControl, mountSiteLaunchButton } from "./siteLaunchButton";

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
let pendingFreshHost = false;
let booted = false;
let unloading = false;
let initTimer = 0;
let connectWatchdog = 0;
let inlineRoom: PeerRoom | null = null;
let inlineStream: MediaStream | null = null;
let inlineStarting = false;
let inlineGen = 0;
let onMediaEvent: ((data: MediaToContent) => void) | null = null;
const HOST_ROOM_KEY = "chillax-host-room";
const PARTY_SESSION_KEY = "chillax-party-session";
const AUTOSTART_KEY = "chillax-autostart";
const AUTOSTART_TTL_MS = 60_000;
const FOLLOW_KEY = "chillax-follow";
const FOLLOW_COOLDOWN_MS = 30_000;
let autostartTimer = 0;
let lastCleanPlayer: { paused: boolean; time: number } | null = null;
let lastAdPlaying = false;
let wasPlayingBeforeAdWait = false;
const remoteAds = new Map<string, string>();

type PartySession = {
  role: "host" | "guest";
  roomId: string;
  overlayOpen: boolean;
  controllers: string[];
};

function armAutostart() {
  try {
    sessionStorage.setItem(AUTOSTART_KEY, String(Date.now()));
  } catch {
    // Private mode can block sessionStorage.
  }
}

function clearAutostart() {
  window.clearInterval(autostartTimer);
  autostartTimer = 0;
  try {
    sessionStorage.removeItem(AUTOSTART_KEY);
  } catch {
    // Private mode can block sessionStorage.
  }
}

function autostartPending() {
  try {
    const at = Number(sessionStorage.getItem(AUTOSTART_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < AUTOSTART_TTL_MS;
  } catch {
    return false;
  }
}

/** YouTube can expose `?v=` before the player element is wired up. */
function effectiveContentId(adapter: PlayerAdapter): string | null {
  const id = adapter.getContentId();
  if (id) return id;
  if (adapter.platform !== "youtube") return null;
  try {
    return new URLSearchParams(location.search).get("v");
  } catch {
    return null;
  }
}

function watchContentId(adapter: PlayerAdapter) {
  return adapter.platform === "youtube" ? effectiveContentId(adapter) : adapter.getContentId();
}

function playerReady(adapter: PlayerAdapter) {
  if (!watchContentId(adapter) || !adapter.isWatchPage()) return false;
  if (adapter.isPlayerOpen && !adapter.isPlayerOpen()) return false;
  if (adapter.getState() !== null) return true;
  // YouTube on iPad: player chrome can be up while time stays unreadable for a while.
  return adapter.platform === "youtube" && Boolean(adapter.isPlayerOpen?.());
}

function youtubeCanStartNow(adapter: PlayerAdapter) {
  return (
    adapter.platform === "youtube" &&
    Boolean(watchContentId(adapter)) &&
    adapter.isWatchPage() &&
    playerReady(adapter)
  );
}

function playIfPaused(adapter: PlayerAdapter) {
  if (!adapter.getState()?.paused) return;
  adapter.play().catch(() => setState({ needsGesture: true }));
}

function partyInitRole() {
  return pendingRole || getState().party?.role || null;
}

function partyInitRoomId() {
  // Prefer the live party id so a reminted host code survives iframe reloads.
  return getState().party?.roomId || pendingRoomId || null;
}

function sendPartyInit(adapter: PlayerAdapter) {
  if (!mediaWindow) return;
  const role = partyInitRole();
  const roomId = partyInitRoomId();
  if (!role || !roomId) return;
  const state = getState();
  sendToMedia({
    type: "init",
    role,
    roomId,
    fresh: role === "host" && pendingFreshHost && !state.party,
    nickname: state.nickname,
    avatarId: state.avatarId,
    platform: adapter.platform,
    contentId: watchContentId(adapter) || adapter.getContentId(),
    watchUrl: currentWatchUrl(adapter, roomId),
  });
}

function stopInitRetries() {
  window.clearInterval(initTimer);
  initTimer = 0;
}

function keepTryingInit(adapter: PlayerAdapter) {
  sendPartyInit(adapter);
  window.clearInterval(initTimer);
  let tries = 0;
  initTimer = window.setInterval(() => {
    tries += 1;
    if (getState().status === "in-party") {
      stopInitRetries();
      return;
    }
    if (!mediaWindow || !partyInitRole() || !partyInitRoomId()) {
      if (tries > 120) stopInitRetries();
      return;
    }
    if (tries > 120 && getState().status !== "connecting") {
      stopInitRetries();
      return;
    }
    sendPartyInit(adapter);
  }, 400);
}

function sendToMedia(payload: Record<string, unknown>) {
  if (inlineRoom) {
    if (payload.type === "send-protocol" && payload.message) {
      inlineRoom.send(payload.message as ProtocolMessage);
    }
    if (payload.type === "leave") destroyInlineRoom();
    if (payload.type === "nickname" && typeof payload.nickname === "string") {
      inlineRoom.localNickname = payload.nickname;
      if (typeof payload.avatarId === "string") inlineRoom.localAvatarId = payload.avatarId;
    }
    return;
  }
  if (!mediaWindow || mediaWindow === window) return;
  mediaWindow.postMessage({ source: MSG_SOURCE_CONTENT, ...payload }, "*");
}

/** iPad reports as Macintosh + touch. WebKit throttles the extension call iframe there. */
function prefersInlineSignaling() {
  const touch = navigator.maxTouchPoints > 1;
  if (!touch) return false;
  return /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
}

function destroyInlineRoom(sayBye = true) {
  inlineGen += 1;
  inlineStarting = false;
  const room = inlineRoom;
  const stream = inlineStream;
  inlineRoom = null;
  inlineStream = null;
  try {
    room?.destroy(sayBye);
  } catch {
    // PeerJS can throw if the socket is already gone.
  }
  stream?.getTracks().forEach((track) => track.stop());
}

async function startInlineRoom(adapter: PlayerAdapter) {
  if (inlineStarting || inlineRoom?.peerId) return;
  if (inlineRoom) destroyInlineRoom(false);
  const role = partyInitRole();
  const roomId = partyInitRoomId();
  if (!role || !roomId) return;
  const gen = ++inlineGen;
  inlineStarting = true;
  stopInitRetries();
  setState({ inlineSignaling: true });
  try {
    const placeholder = placeholderLocalStream();
    if (placeholder.ctx.state === "suspended") {
      void placeholder.ctx.resume().catch(() => undefined);
    }
    if (gen !== inlineGen) {
      placeholder.stream.getTracks().forEach((track) => track.stop());
      await placeholder.ctx.close().catch(() => undefined);
      return;
    }
    inlineStream = placeholder.stream;
    const room = new PeerRoom({
      onReady: (peerId, readyRole) => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "ready", peerId, role: readyRole });
      },
      onDataOpen: () => {
        const peerId = room.peerId;
        const state = getState();
        if (!peerId) return;
        room.send({
          type: "hello",
          nickname: state.nickname,
          avatarId: state.avatarId || "fox",
          peerId,
          platform: adapter.platform,
          contentId: watchContentId(adapter) || "",
          watchUrl: currentWatchUrl(adapter, partyInitRoomId() || undefined),
        });
        void room.setMuted(true);
        void room.setCameraOn(false);
      },
      onProtocol: (message) => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "protocol", message });
      },
      onParticipants: (participants) => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "participants", participants });
      },
      onError: (message) => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "error", message });
      },
      onCallStatus: (connected, detail) => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "call-status", connected, detail });
      },
      onHostLeft: () => {
        onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "host-left" });
      },
    });
    inlineRoom = room;
    room.bindSilentAudio(placeholder.ctx);
    const state = getState();
    if (role === "host") {
      await room.startHost(
        roomId,
        placeholder.stream,
        state.nickname,
        state.avatarId || "fox",
        pendingFreshHost && !state.party,
      );
    } else {
      await room.join(roomId, placeholder.stream, state.nickname, state.avatarId || "fox");
    }
    if (gen !== inlineGen) {
      room.destroy();
      placeholder.stream.getTracks().forEach((track) => track.stop());
      return;
    }
    inlineStarting = false;
  } catch (error) {
    if (gen !== inlineGen) return;
    inlineStarting = false;
    destroyInlineRoom(false);
    const message =
      error instanceof Error ? error.message : "Could not start the party connection.";
    onMediaEvent?.({ source: MSG_SOURCE_MEDIA, type: "error", message });
  }
}

/** Don't wait for React to paint — iPad WebKit throttles a late iframe and never opens PeerJS. */
function attachMediaFrame(adapter: PlayerAdapter) {
  const iframe = ensureCallFrame(mediaPageUrl());
  const win = iframe.contentWindow;
  if (!win || win === window) return;
  mediaWindow = win;
  keepTryingInit(adapter);
}

function mediaMessageFrom(event: MessageEvent): boolean {
  if (event.source === mediaWindow) return true;
  try {
    return event.origin === extensionOrigin();
  } catch {
    return false;
  }
}

function stopConnectWatchdog() {
  window.clearTimeout(connectWatchdog);
  connectWatchdog = 0;
}

function armConnectWatchdog(adapter: PlayerAdapter) {
  stopConnectWatchdog();
  connectWatchdog = window.setTimeout(() => {
    connectWatchdog = 0;
    if (getState().status !== "connecting") return;
    if (inlineRoom || inlineStarting) {
      setState({ callDetail: "Still opening the party link…" });
      armConnectWatchdog(adapter);
      return;
    }
    // Iframe signaling stalled (common on iPad). Take over in this page instead of
    // reloading a throttled frame every 10s — that loop never finishes.
    setState({
      callDetail: "Still connecting… retrying the party link.",
      inlineSignaling: true,
    });
    void startInlineRoom(adapter);
    armConnectWatchdog(adapter);
  }, 12_000);
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

function persistPartySession() {
  const state = getState();
  const role = state.party?.role || pendingRole;
  const roomId = state.party?.roomId || pendingRoomId;
  if (!role || !roomId) return;
  try {
    const previous = loadPartySession();
    const session: PartySession = {
      role,
      roomId,
      overlayOpen: state.overlayOpen,
      controllers: state.controllers.length ? state.controllers : previous?.controllers ?? [],
    };
    sessionStorage.setItem(PARTY_SESSION_KEY, JSON.stringify(session));
    if (role === "host") rememberHostRoom(roomId);
    else rememberInviteToken(roomId);
  } catch {
    // Private mode can block sessionStorage.
  }
}

function loadPartySession(): PartySession | null {
  try {
    const raw = sessionStorage.getItem(PARTY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PartySession>;
    if (parsed.role !== "host" && parsed.role !== "guest") return null;
    if (typeof parsed.roomId !== "string" || !parsed.roomId) return null;
    return {
      role: parsed.role,
      roomId: parsed.roomId,
      overlayOpen: parsed.overlayOpen !== false,
      controllers: Array.isArray(parsed.controllers) ? parsed.controllers.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return null;
  }
}

function clearPartySession() {
  try {
    sessionStorage.removeItem(PARTY_SESSION_KEY);
  } catch {
    // Private mode can block sessionStorage.
  }
}

function recentlyFollowed(hostContentId: string) {
  try {
    const raw = sessionStorage.getItem(FOLLOW_KEY);
    if (!raw) return false;
    const { contentId, at } = JSON.parse(raw) as { contentId?: string; at?: number };
    return contentId === hostContentId && Boolean(at) && Date.now() - (at || 0) < FOLLOW_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function noteFollow(hostContentId: string) {
  try {
    sessionStorage.setItem(FOLLOW_KEY, JSON.stringify({ contentId: hostContentId, at: Date.now() }));
  } catch {
    // Private mode can block sessionStorage.
  }
}

function followHostWatch(
  adapter: PlayerAdapter,
  watchUrl: string,
  hostContentId: string,
  roomIdOverride?: string | null,
): boolean {
  if (!watchUrl && !hostContentId) return false;
  const mine = adapter.getContentId();
  if (mine && hostContentId && mine === hostContentId) return false;
  // The site may land us on a different id for the same title; don't reload in a loop.
  if (recentlyFollowed(hostContentId)) return false;
  const roomId =
    roomIdOverride ||
    pendingRoomId ||
    getState().party?.roomId ||
    parseRoomToken() ||
    parseRoomToken(watchUrl);
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
    noteFollow(hostContentId);
    if (roomId) rememberInviteToken(roomId);
    location.replace(dest);
    return true;
  } catch {
    return false;
  }
}

function restorePendingFromSession() {
  const saved = loadPartySession();
  if (!saved) return;
  pendingRole = saved.role;
  pendingRoomId = saved.roomId;
  if (saved.overlayOpen) setState({ overlayOpen: true });
}

function maybeAutoJoin(session: SessionController) {
  if (getState().status !== "idle") return;
  const saved = loadPartySession();
  const token = normalizeRoomCode(
    parseRoomToken() || pendingInviteToken() || saved?.roomId || "",
  );
  if (!token) return;
  if (saved?.role === "guest") {
    session.joinParty(token);
    return;
  }
  if (saved?.role === "host" || hostRoomFromSession() === token) {
    session.startParty(token);
    return;
  }
  // Fresh invite link — join the live party, don't claim the code as host.
  session.joinParty(token);
}

function snapshotCleanPlayer(adapter: PlayerAdapter) {
  if (adapter.isAdPlaying()) return;
  const player = adapter.getState();
  if (player) lastCleanPlayer = { paused: player.paused, time: player.time };
}

function anyoneWaitingForAds() {
  return remoteAds.size > 0;
}

function syncAdWaitBanner() {
  const first = remoteAds.values().next().value as string | undefined;
  setState({ waitingForAds: first ? { nickname: first } : null });
}

function pruneRemoteAds(people: { peerId: string; connected: boolean }[]) {
  const live = new Set(people.filter((person) => person.connected).map((person) => person.peerId));
  let changed = false;
  for (const id of [...remoteAds.keys()]) {
    if (!live.has(id)) {
      remoteAds.delete(id);
      changed = true;
    }
  }
  if (changed) syncAdWaitBanner();
}

function noteRemoteAd(from: string, adPlaying: boolean, nickname: string) {
  if (adPlaying) remoteAds.set(from, nickname || "Someone");
  else remoteAds.delete(from);
  syncAdWaitBanner();
}

async function pauseForAds(adapter: PlayerAdapter) {
  if (adapter.isAdPlaying()) return;
  const local = adapter.getState();
  if (local && !local.paused) wasPlayingBeforeAdWait = true;
  if (local && !local.paused) await adapter.pause();
}

async function resumeAfterAds(adapter: PlayerAdapter) {
  if (adapter.isAdPlaying() || anyoneWaitingForAds()) return;
  const shouldPlay = wasPlayingBeforeAdWait;
  wasPlayingBeforeAdWait = false;
  if (shouldPlay && canControlPlayback()) {
    applying.current = true;
    try {
      await adapter.play();
    } catch {
      applying.current = false;
      setState({ needsGesture: true });
      return;
    }
    window.setTimeout(() => {
      applying.current = false;
    }, 500);
    broadcastSync(adapter, "followup");
    return;
  }
  if (shouldPlay && lastSync) {
    void applyHostSync(adapter, { ...lastSync, paused: false }, applying);
    return;
  }
  if (canControlPlayback()) broadcastSync(adapter, "followup");
}

function sendAdState(adapter: PlayerAdapter, adPlaying: boolean) {
  const state = getState();
  const from = myPeerId();
  if (!state.party || state.status !== "in-party" || !from) return;
  const time =
    (adPlaying ? lastCleanPlayer : adapter.getState())?.time ?? lastCleanPlayer?.time ?? 0;
  sendToMedia({
    type: "send-protocol",
    message: {
      type: "ad-state",
      from,
      nickname: state.nickname,
      avatarId: state.avatarId,
      adPlaying,
      time,
      sentAt: Date.now(),
    } satisfies ProtocolMessage,
  });
}

function tickAds(adapter: PlayerAdapter) {
  snapshotCleanPlayer(adapter);
  const ads = adapter.isAdPlaying();
  const inParty = Boolean(getState().party && getState().status === "in-party" && myPeerId());
  if (!inParty) return;
  if (ads === lastAdPlaying) return;
  lastAdPlaying = ads;
  sendAdState(adapter, ads);
  if (ads) return;
  if (anyoneWaitingForAds()) {
    void pauseForAds(adapter);
    return;
  }
  void resumeAfterAds(adapter);
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

/** Follow the host or anyone the host has given playback control to. */
function shouldFollowWatch(from?: string) {
  if (!from) return false;
  return from === hostPeerId() || isController(from);
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
  snapshotCleanPlayer(adapter);
  if (adapter.isAdPlaying()) {
    if (reason !== "heartbeat") sendAdState(adapter, true);
    return;
  }
  if (anyoneWaitingForAds()) return;
  if (applying.current) return;
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
  tickAds(adapter);
  heartbeat = window.setInterval(() => {
    tickAds(adapter);
    broadcastSync(adapter);
  }, HEARTBEAT_MS);
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

let typingSentAt = 0;
let typingSweep = 0;

function pruneTyping() {
  window.clearTimeout(typingSweep);
  const now = Date.now();
  const live = getState().typing.filter((peer) => peer.until > now);
  if (live.length !== getState().typing.length) setState({ typing: live });
  if (!live.length) return;
  const next = Math.min(...live.map((peer) => peer.until));
  typingSweep = window.setTimeout(pruneTyping, next - now + 50);
}

function clearTypingFor(match: (peer: TypingPeer) => boolean) {
  const typing = getState().typing;
  if (typing.some(match)) setState({ typing: typing.filter((peer) => !match(peer)) });
}

function resetTyping() {
  window.clearTimeout(typingSweep);
  typingSentAt = 0;
}

async function handleProtocol(adapter: PlayerAdapter, message: ProtocolMessage) {
  const state = getState();
  if (message.type === "chat") {
    if (state.messages.some((item) => item.id === message.id)) return;
    if (message.kind === "playback" && isDuplicatePlayback(message.from, message.text, message.sentAt)) return;
    setState({ messages: [...state.messages, message].slice(-200) });
    if (!message.kind) {
      clearTypingFor((peer) => peer.peerId === message.from || peer.nickname === message.nickname);
    }
    return;
  }
  if (message.type === "typing") {
    if (!message.from || message.from === myPeerId()) return;
    const others = state.typing.filter((peer) => peer.peerId !== message.from);
    if (!message.typing) {
      clearTypingFor((peer) => peer.peerId === message.from);
      return;
    }
    setState({
      typing: [
        ...others,
        {
          peerId: message.from,
          nickname: message.nickname,
          avatarId: message.avatarId,
          until: Date.now() + TYPING_TTL_MS,
        },
      ],
    });
    pruneTyping();
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
  if (message.type === "ad-state") {
    if (!message.from || message.from === myPeerId()) return;
    noteRemoteAd(message.from, message.adPlaying, message.nickname);
    if (message.adPlaying) {
      await pauseForAds(adapter);
      return;
    }
    await resumeAfterAds(adapter);
    return;
  }
  if (message.type === "hello") {
    if (state.party?.role === "host") {
      sendControlPolicy();
      broadcastSync(adapter);
    }
    if (adapter.isAdPlaying()) sendAdState(adapter, true);
  }
  if (message.type === "sync" || message.type === "hello") {
    const contentId = effectiveContentId(adapter);
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
      const from = message.type === "hello" ? message.peerId : message.from;
      const followable = shouldFollowWatch(from);
      if (
        followable &&
        followHostWatch(adapter, message.watchUrl, message.contentId, hostPeerId())
      ) {
        return;
      }
      if (followable) {
        setState({
          wrongTitle: { hostUrl: message.watchUrl, hostContentId: message.contentId },
        });
        return;
      }
    } else {
      setState({ wrongTitle: null });
    }
  }
  if (message.type === "sync" && message.controllers && message.from === hostPeerId()) {
    applyControllers(message.controllers);
  }
  if (message.type === "sync") {
    const mode = message.mode ?? "control";
    if (!canAcceptSyncFrom(message.from, message.sentAt, mode)) return;
    if (adapter.isAdPlaying() || anyoneWaitingForAds()) {
      lastSync = { paused: message.paused, time: message.time, sentAt: message.sentAt };
      if (!message.paused) await pauseForAds(adapter);
      return;
    }
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
      contentId: watchContentId(adapter),
      overlayOpen: false,
    });

  const session: SessionController = {
    startParty: (roomId) => {
      const status = getState().status;
      if (status === "connecting" || status === "in-party") return;
      const known = normalizeRoomCode(roomId || "");
      if (!known && (!adapter.isWatchPage() || !watchContentId(adapter))) {
        setState({ error: "Open a video or title first.", overlayOpen: true });
        return;
      }
      pendingRole = "host";
      pendingFreshHost = !known;
      pendingRoomId = known || randomRoomId();
      rememberHostRoom(pendingRoomId);
      persistPartySession();
      resetTyping();
      const inline = prefersInlineSignaling();
      setState({
        status: "connecting",
        error: null,
        overlayOpen: true,
        callDetail: "Opening your party…",
        controllers: [],
        messages: [],
        participants: [],
        bursts: [],
        typing: [],
        inlineSignaling: inline,
      });
      pushPageOffset(adapter.platform, true);
      if (inline) void startInlineRoom(adapter);
      else attachMediaFrame(adapter);
      playIfPaused(adapter);
      armConnectWatchdog(adapter);
    },
    launchParty: (opts) => {
      const status = getState().status;
      if (status === "in-party" || status === "connecting") {
        session.toggleOverlay(true);
        return;
      }
      if (!opts?.href && playerReady(adapter)) {
        clearAutostart();
        session.startParty();
        return;
      }
      if (youtubeCanStartNow(adapter)) {
        clearAutostart();
        session.startParty();
        return;
      }
      if (
        !opts?.href &&
        adapter.platform === "youtube" &&
        adapter.isWatchPage() &&
        watchContentId(adapter)
      ) {
        armAutostart();
        setState({ error: null, overlayOpen: true });
        watchAutostart();
        return;
      }
      if (opts?.href) {
        armAutostart();
        location.assign(opts.href);
        return;
      }
      const trigger = opts?.click ?? (adapter.platform === "youtube" ? null : findPlayControl());
      if (!trigger) {
        setState({ error: "Open a video or title first.", overlayOpen: true });
        pushPageOffset(adapter.platform, true);
        return;
      }
      armAutostart();
      setState({ error: null });
      trigger.click();
      watchAutostart();
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
      persistPartySession();
      resetTyping();
      const inline = prefersInlineSignaling();
      setState({
        status: "connecting",
        error: null,
        overlayOpen: true,
        callDetail: "Joining that party…",
        controllers: [],
        messages: [],
        participants: [],
        bursts: [],
        typing: [],
        inlineSignaling: inline,
      });
      pushPageOffset(adapter.platform, true);
      if (inline) void startInlineRoom(adapter);
      else attachMediaFrame(adapter);
      armConnectWatchdog(adapter);
    },
    leaveParty: () => {
      const keepLounge = getState().status === "connecting";
      sendToMedia({ type: "leave" });
      destroyInlineRoom();
      stopHeartbeat();
      stopInitRetries();
      stopConnectWatchdog();
      pendingRole = null;
      pendingRoomId = null;
      pendingFreshHost = false;
      rememberHostRoom(null);
      clearPartySession();
      remoteAds.clear();
      lastAdPlaying = false;
      wasPlayingBeforeAdWait = false;
      lastCleanPlayer = null;
      if (!unloading) forgetInviteToken();
      clearTokenFromLocation(adapter.platform);
      resetTyping();
      setState({
        party: null,
        status: "idle",
        error: null,
        wrongTitle: null,
        waitingForAds: null,
        messages: [],
        participants: [],
        bursts: [],
        typing: [],
        callDetail: null,
        controllers: [],
        localPeerId: null,
        overlayOpen: keepLounge,
        inlineSignaling: false,
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
      typingSentAt = 0;
    },
    setTyping: (typing: boolean) => {
      const state = getState();
      const from = myPeerId();
      if (!state.party || state.status !== "in-party" || !from) return;
      const now = Date.now();
      if (typing && now - typingSentAt < TYPING_REFRESH_MS) return;
      if (!typing && !typingSentAt) return;
      typingSentAt = typing ? now : 0;
      sendToMedia({
        type: "send-protocol",
        message: { type: "typing", from, nickname: state.nickname, avatarId: state.avatarId, typing },
      });
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
      persistPartySession();
      sendControlPolicy();
    },
    enablePlayback: () => {
      void adapter.play();
      setState({ needsGesture: false });
    },
    registerMediaWindow: (win) => {
      mediaWindow = win && win !== window ? win : null;
      if (mediaWindow) keepTryingInit(adapter);
      else stopInitRetries();
    },
  };

  function watchAutostart() {
    window.clearInterval(autostartTimer);
    if (!autostartPending()) return;
    let tries = 0;
    autostartTimer = window.setInterval(() => {
      tries += 1;
      const status = getState().status;
      if (!autostartPending() || status === "connecting" || status === "in-party") {
        clearAutostart();
        return;
      }
      if (playerReady(adapter)) {
        clearAutostart();
        session.startParty();
        return;
      }
      // Don't hang forever on iPad waiting for a readable currentTime.
      if (
        adapter.platform === "youtube" &&
        watchContentId(adapter) &&
        adapter.isWatchPage() &&
        tries >= 8
      ) {
        clearAutostart();
        session.startParty();
      }
    }, 400);
  }

  mountOverlay(session);
  mountSiteLaunchButton(session, adapter.platform);
  if (adapter.platform === "youtube") {
    const syncWatchMeta = () => {
      const id = watchContentId(adapter);
      if (!id) return;
      const state = getState();
      if (state.contentId === id && state.isWatchPage) return;
      setState({ contentId: id, isWatchPage: true });
    };
    syncWatchMeta();
    window.setInterval(syncWatchMeta, 500);
  }
  pushPageOffset(adapter.platform, getState().overlayOpen);
  watchFullscreen(adapter.platform, () => getState().overlayOpen);

  chrome.runtime.onMessage.addListener((message: PopupRequest, _sender, sendResponse) => {
    switch (message.type) {
      case "CHILLAX_GET_STATE":
        sendResponse(getState());
        break;
      case "CHILLAX_START":
        session.launchParty();
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

  const handleMediaEvent = (data: MediaToContent) => {
    if (data.type === "iframe-ready") {
      if (inlineRoom || inlineStarting) return;
      keepTryingInit(adapter);
      return;
    }
    if (data.type === "ready" && data.peerId) {
      // The media frame reports "guest" when a known host code was already live and it joined instead.
      const role = data.role || pendingRole || getState().party?.role;
      if (!role) return;
      // Host peer id is the party code — always take the live one (remint / iframe reload).
      const roomId =
        role === "host"
          ? data.peerId
          : pendingRoomId || getState().party?.roomId || data.peerId;
      if (!roomId) return;
      pendingRoomId = roomId;
      pendingFreshHost = false;
      rememberHostRoom(role === "host" ? roomId : null);
      forgetInviteToken();
      const inviteUrl = buildInviteUrl(
        adapter.platform,
        adapter.getContentId() || "",
        roomId,
      );
      writeTokenToLocation(adapter.platform, roomId);
      const firstJoin = Boolean(pendingRole);
      pendingRole = null;
      stopInitRetries();
      stopConnectWatchdog();
      const savedControllers = role === "host" ? loadPartySession()?.controllers : null;
      setState({
        status: "in-party",
        party: { role, roomId, inviteUrl },
        localPeerId: data.peerId,
        controllers:
          firstJoin && role === "host"
            ? withHostController(savedControllers?.length ? savedControllers : [data.peerId])
            : getState().controllers,
        error: null,
        callDetail: null,
        callConnected: true,
      });
      persistPartySession();
      if (firstJoin) {
        pushPageOffset(adapter.platform, true);
        startHeartbeat(adapter);
        if (role === "host") broadcastSync(adapter);
      }
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
      pruneRemoteAds(people);
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
      destroyInlineRoom(false);
      stopHeartbeat();
      stopInitRetries();
      stopConnectWatchdog();
      setState({ status: "error", error: data.message, inlineSignaling: false });
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
  };
  onMediaEvent = handleMediaEvent;

  window.addEventListener(
    "message",
    (event) => {
      if (!mediaMessageFrom(event)) return;
      const data = event.data as MediaToContent;
      if (data?.source !== MSG_SOURCE_MEDIA) return;
      handleMediaEvent(data);
    },
    true,
  );

  adapter.onChange(() => {
    tickAds(adapter);
    if (applying.current) return;
    if (adapter.isAdPlaying() || anyoneWaitingForAds()) return;
    if (!canControlPlayback()) {
      if (lastSync) void applyHostSync(adapter, lastSync, applying);
      return;
    }
    window.clearTimeout(syncOutTimer);
    syncOutTimer = window.setTimeout(() => broadcastSync(adapter, "control"), 120);
  });
  adapter.onNavigate(() => {
    const onWatch = adapter.isWatchPage();
    const contentId = effectiveContentId(adapter);
    const prev = getState();
    if (prev.isWatchPage === onWatch && prev.contentId === contentId) return;
    const switchedVideo = Boolean(
      prev.contentId && contentId && prev.contentId !== contentId,
    );
    setState({
      isWatchPage: onWatch,
      contentId,
    });
    const party = getState().party;
    if (party) persistPartySession();
    if (party && contentId && canControlPlayback()) {
      setState({
        party: {
          ...party,
          inviteUrl: buildInviteUrl(adapter.platform, contentId, party.roomId),
        },
        wrongTitle: null,
      });
      writeTokenToLocation(adapter.platform, party.roomId);
      if (switchedVideo) broadcastSync(adapter);
    }
    pushPageOffset(adapter.platform, getState().overlayOpen);
    maybeAutoJoin(session);
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    unloading = true;
    persistPartySession();
  });
  restorePendingFromSession();
  maybeAutoJoin(session);
  watchAutostart();
  } catch (error) {
    booted = false;
    throw error;
  }
}
