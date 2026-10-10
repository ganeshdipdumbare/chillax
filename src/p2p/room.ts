import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { PEER_CONFIG } from "../shared/constants";
import { randomGuestPeerId, randomRoomId } from "../shared/ids";
import { loadGuestPeerId, saveGuestPeerId } from "../shared/storage";
import { loadIceServers } from "./ice";
import { decodeMessage, encodeMessage } from "./protocol";
import { partyFull, captureCameraTrack, captureMicTrack, createSilentAudio, placeholderVideoTrack } from "./mesh";
import type { Participant, ProtocolMessage } from "../shared/types";

type RoomHandlers = {
  onProtocol: (message: ProtocolMessage, fromPeerId: string) => void;
  onParticipants: (participants: Participant[]) => void;
  onError: (message: string) => void;
  onReady: (peerId: string, role: "host" | "guest") => void;
  onCallStatus: (connected: boolean, detail?: string) => void;
  onDataOpen: () => void;
  onHostLeft: () => void;
};

function shouldInitiateCall(myId: string, otherId: string): boolean {
  return myId < otherId;
}

function peerErrorType(err: unknown): string | undefined {
  if (err && typeof err === "object" && "type" in err) {
    const type = (err as { type?: string }).type;
    return type || undefined;
  }
  return undefined;
}

const JOIN_DEADLINE_MS = 30_000;
const ATTEMPT_TIMEOUT_MS = 4_000;
const ANSWERED_TIMEOUT_MS = 10_000;
const NETWORK_BLOCKED =
  "Found the party, but your networks could not connect directly. Try home Wi‑Fi without a VPN on both sides.";
const PARTY_CLOSED =
  "That party isn’t open right now. Ask the host to keep the party tab open and send a fresh link.";

type HostAttempt = "unavailable" | "timeout" | "ice-failed";

class HostIdTakenError extends Error {}

function joinRetryDelay(attempt: number) {
  return Math.min(500 * (attempt + 1), 3000);
}

function mapPeerError(err: unknown): string {
  const type = peerErrorType(err);
  if (type === "unavailable-id") {
    return "That party code is already in use. Try starting a new party.";
  }
  if (type === "peer-unavailable") {
    return "Could not find that party. Check the code and try again.";
  }
  if (type === "negotiation-failed") {
    return "Found the party, but your networks could not connect directly. Try home Wi‑Fi without a VPN on both sides.";
  }
  if (type === "network" || type === "server-error" || type === "socket-error") {
    return "Signaling broker failed. Chat and calls need a connection — retry in a moment.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Peer connection failed.";
}

export class PeerRoom {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private calls = new Map<string, MediaConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private nicknames = new Map<string, string>();
  private avatars = new Map<string, string>();
  private mediaState = new Map<string, { muted: boolean; cameraOn: boolean }>();
  private disconnected = new Map<
    string,
    { nickname: string; avatarId: string; muted: boolean; cameraOn: boolean; until: number }
  >();
  private disconnectSweep = 0;
  private isHost = false;
  private controllerIds: string[] = [];
  private localStream: MediaStream | null = null;
  private handlers: RoomHandlers;
  private muted = true;
  private cameraOn = false;
  private cameraTrack: MediaStreamTrack | null = null;
  private silentAudioCtx: AudioContext | null = null;
  private muteOp = 0;
  private tearingDown = false;
  private hostId: string | null = null;
  private reconnectingHost = false;
  private signalRetry = 0;
  private signalTimer = 0;
  localNickname = "Guest";
  localAvatarId = "fox";

  constructor(handlers: RoomHandlers) {
    this.handlers = handlers;
  }

  get peerId(): string | null {
    return this.peer?.id ?? null;
  }

  /**
   * `fresh` marks a newly minted code nobody has seen yet. A known code that is already
   * live elsewhere (another tab, a duplicated tab) means the party exists, so join it.
   */
  async startHost(
    roomId: string,
    stream: MediaStream,
    nickname: string,
    avatarId: string,
    fresh = false,
  ) {
    this.isHost = true;
    this.localStream = stream;
    this.localNickname = nickname;
    this.localAvatarId = avatarId;
    this.nicknames.set(roomId, nickname);
    this.avatars.set(roomId, avatarId);
    try {
      await this.openPeer(roomId, 0, fresh);
    } catch (err) {
      if (!(err instanceof HostIdTakenError) || this.tearingDown) throw err;
      this.nicknames.delete(roomId);
      this.avatars.delete(roomId);
      await this.join(roomId, stream, nickname, avatarId);
    }
  }

  async join(hostId: string, stream: MediaStream, nickname: string, avatarId: string) {
    this.isHost = false;
    this.hostId = hostId;
    this.localStream = stream;
    this.localNickname = nickname;
    this.localAvatarId = avatarId;
    const guestId = await loadGuestPeerId();
    await this.openPeer(guestId);
    if (this.tearingDown) return;
    if (!this.peer) throw new Error("Could not start peer");
    await this.connectToHost(hostId);
    if (this.tearingDown || !this.peer) return;
    this.handlers.onReady(this.peer.id, "guest");
  }

  private waitForSignaling(peer: Peer) {
    if (!peer.disconnected) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        peer.off("open", onOpen);
        reject(new Error(mapPeerError({ type: "network" })));
      }, 20000);
      const onOpen = () => {
        window.clearTimeout(timer);
        resolve();
      };
      peer.once("open", onOpen);
    });
  }

  /**
   * The broker holds an offer for a missing peer for a few seconds, so an attempt made while the
   * host is reloading can hang instead of failing. Retry on both "unavailable" and silence until
   * the deadline; only an ICE failure means the networks truly can't reach each other.
   */
  private async connectToHost(hostId: string): Promise<void> {
    const deadline = Date.now() + JOIN_DEADLINE_MS;
    let lastFailure: HostAttempt = "unavailable";
    for (let attempt = 0; ; attempt += 1) {
      const peer = this.peer;
      if (!peer || this.tearingDown) return;
      await this.waitForSignaling(peer);
      if (this.tearingDown || this.peer !== peer) return;
      const result = await this.attemptHost(peer, hostId);
      if (result === "open" || this.tearingDown) return;
      if (result === "ice-failed") throw new Error(NETWORK_BLOCKED);
      lastFailure = result;
      if (Date.now() + joinRetryDelay(attempt) >= deadline) break;
      this.handlers.onCallStatus(false, "Waiting for the host to open the party…");
      await new Promise((resolve) => window.setTimeout(resolve, joinRetryDelay(attempt)));
    }
    throw new Error(lastFailure === "timeout" ? NETWORK_BLOCKED : PARTY_CLOSED);
  }

  private attemptHost(peer: Peer, hostId: string) {
    return new Promise<HostAttempt | "open">((resolve) => {
      const conn = peer.connect(hostId, { reliable: true });
      if (!conn) {
        resolve("timeout");
        return;
      }
      let settled = false;
      const done = (result: HostAttempt | "open") => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        peer.off("error", onPeerError);
        conn.peerConnection?.removeEventListener("iceconnectionstatechange", onIceChange);
        if (result !== "open") conn.close();
        resolve(result);
      };
      let timer = window.setTimeout(() => {
        // Host answered, so ICE is just slow (relay); give it longer before starting over.
        if (conn.peerConnection?.remoteDescription) {
          timer = window.setTimeout(() => done("timeout"), ANSWERED_TIMEOUT_MS);
          return;
        }
        done("timeout");
      }, ATTEMPT_TIMEOUT_MS);
      const onPeerError = (err: unknown) => {
        if (peerErrorType(err) !== "peer-unavailable") return;
        const message = err instanceof Error ? err.message : "";
        if (message && !message.includes(hostId)) return;
        done("unavailable");
      };
      const onIceChange = () => {
        if (conn.peerConnection?.iceConnectionState === "failed") done("ice-failed");
      };
      peer.on("error", onPeerError);
      conn.peerConnection?.addEventListener("iceconnectionstatechange", onIceChange);
      conn.once("open", () => done("open"));
      conn.once("error", () => done("timeout"));
      this.attachData(conn);
    });
  }

  send(message: ProtocolMessage, exceptPeerId?: string) {
    if (message.type === "control-policy") this.controllerIds = message.controllers;
    if (message.type === "sync" && message.controllers) this.controllerIds = message.controllers;
    const payload = encodeMessage(message);
    if (this.isHost) {
      for (const [id, conn] of this.connections) {
        if (id === exceptPeerId) continue;
        if (conn.open) conn.send(payload);
      }
      return;
    }
    const hostConn = [...this.connections.values()][0];
    hostConn?.open && hostConn.send(payload);
  }

  async setMuted(muted: boolean) {
    if (this.tearingDown) return;
    if (muted === this.muted) {
      this.broadcastMediaState();
      return;
    }
    const op = ++this.muteOp;
    this.muted = muted;
    this.broadcastMediaState();
    if (muted) {
      const silent = createSilentAudio();
      if (silent.ctx.state === "suspended") await silent.ctx.resume();
      if (op !== this.muteOp || this.tearingDown) {
        silent.track.stop();
        await silent.ctx.close().catch(() => undefined);
        return;
      }
      await this.replaceLocalTrack("audio", silent.track);
      if (op !== this.muteOp || this.tearingDown) {
        silent.track.stop();
        await silent.ctx.close().catch(() => undefined);
        return;
      }
      await this.closeSilentAudio();
      this.silentAudioCtx = silent.ctx;
      return;
    }
    const track = await captureMicTrack();
    if (op !== this.muteOp || this.tearingDown) {
      track.stop();
      return;
    }
    await this.replaceLocalTrack("audio", track);
    await this.closeSilentAudio();
  }

  async setCameraOn(cameraOn: boolean) {
    if (this.tearingDown) return;
    if (cameraOn === this.cameraOn && (!cameraOn || this.cameraTrack)) {
      this.broadcastMediaState();
      return;
    }
    if (cameraOn) {
      const track = await captureCameraTrack();
      if (this.tearingDown) {
        track.stop();
        return;
      }
      await this.replaceLocalTrack("video", track);
      this.cameraTrack = track;
      this.cameraOn = true;
    } else {
      this.cameraTrack?.stop();
      this.cameraTrack = null;
      const dummy = placeholderVideoTrack();
      await this.replaceLocalTrack("video", dummy);
      this.cameraOn = false;
    }
    this.broadcastMediaState();
  }

  private async replaceLocalTrack(kind: "audio" | "video", next: MediaStreamTrack) {
    if (this.localStream) {
      const olds = kind === "audio" ? this.localStream.getAudioTracks() : this.localStream.getVideoTracks();
      for (const old of olds) {
        this.localStream.removeTrack(old);
        if (old !== next) old.stop();
      }
      this.localStream.addTrack(next);
    }
    await Promise.all(
      [...this.calls.values()].map(async (call) => {
        const sender = call.peerConnection
          ?.getSenders()
          .find((item) => item.track?.kind === kind);
        if (sender) await sender.replaceTrack(next);
      }),
    );
  }

  private async closeSilentAudio() {
    if (!this.silentAudioCtx) return;
    try {
      await this.silentAudioCtx.close();
    } catch {
      // Already closed with the dummy track.
    }
    this.silentAudioCtx = null;
  }

  bindSilentAudio(ctx: AudioContext) {
    this.silentAudioCtx = ctx;
    this.muted = true;
  }

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  /** `sayBye` is for a deliberate leave; a reloading iframe stays quiet so guests reconnect. */
  destroy(sayBye = true) {
    if (this.tearingDown) return;
    this.tearingDown = true;
    window.clearTimeout(this.disconnectSweep);
    window.clearTimeout(this.signalTimer);
    window.removeEventListener("online", this.onWake);
    document.removeEventListener("visibilitychange", this.onWake);
    const peerId = this.peer?.id;
    if (peerId && sayBye) {
      try {
        this.send({ type: "bye", peerId });
      } catch {
        // Unload can close sockets before this flush; still destroy below.
      }
    }
    for (const call of this.calls.values()) call.close();
    for (const conn of this.connections.values()) conn.close();
    this.cameraTrack?.stop();
    this.cameraTrack = null;
    void this.closeSilentAudio();
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
    this.calls.clear();
    this.remoteStreams.clear();
    this.disconnected.clear();
  }

  handleProtocol(message: ProtocolMessage, fromPeerId: string) {
    if (message.type === "hello") {
      this.disconnected.delete(message.peerId);
      this.nicknames.set(message.peerId, message.nickname);
      this.avatars.set(message.peerId, message.avatarId);
      this.emitParticipants();
      if (this.isHost) this.broadcastPeerList();
    }
    if (message.type === "media-state") {
      this.nicknames.set(message.peerId, message.nickname);
      this.avatars.set(message.peerId, message.avatarId);
      this.mediaState.set(message.peerId, {
        muted: message.muted,
        cameraOn: message.cameraOn,
      });
      this.emitParticipants();
    }
    if (message.type === "peers") {
      this.connectMesh(message.peerIds);
    }
    if (message.type === "bye") {
      this.dropPeer(message.peerId);
      if (!this.isHost && message.peerId === this.hostId) {
        this.handlers.onHostLeft();
        return;
      }
    }
    if (
      this.isHost &&
      message.type !== "peers" &&
      message.type !== "room-full" &&
      this.shouldRelay(message, fromPeerId)
    ) {
      this.send(message, fromPeerId);
    }
    this.handlers.onProtocol(message, fromPeerId);
  }

  private shouldRelay(message: ProtocolMessage, fromPeerId: string) {
    if (message.type === "control-policy") return false;
    if (message.type !== "sync") return true;
    const from = message.from || fromPeerId;
    if (from === this.peer?.id) return true;
    if (this.controllerIds.includes("*")) return true;
    if (this.controllerIds.includes(from)) return true;
    return false;
  }

  private onWake = () => {
    if (document.visibilityState === "hidden") return;
    const peer = this.peer;
    if (!peer || this.tearingDown || peer.destroyed || !peer.disconnected) return;
    this.signalRetry = 0;
    this.scheduleSignalReconnect(peer);
  };

  private scheduleSignalReconnect(peer: Peer) {
    window.clearTimeout(this.signalTimer);
    const wait = this.signalRetry === 0 ? 0 : Math.min(1000 * 2 ** (this.signalRetry - 1), 15000);
    this.signalRetry += 1;
    this.signalTimer = window.setTimeout(() => {
      if (this.tearingDown || this.peer !== peer || peer.destroyed || !peer.disconnected) return;
      peer.reconnect();
    }, wait);
  }

  private async openPeer(id?: string, attempt = 0, fresh = false): Promise<void> {
    if (this.tearingDown) return;
    this.peer?.destroy();
    const iceServers = await loadIceServers();
    if (this.tearingDown) return;
    const options = { ...PEER_CONFIG, config: { ...PEER_CONFIG.config, iceServers } };
    const peer = id ? new Peer(id, options) : new Peer(options);
    this.peer = peer;
    let opened = false;
    peer.on("disconnected", () => {
      if (this.tearingDown || this.peer !== peer || !opened) return;
      this.handlers.onCallStatus(false, "Disconnected from signaling. Reconnecting…");
      this.scheduleSignalReconnect(peer);
    });
    peer.on("open", () => {
      if (!opened || this.tearingDown || this.peer !== peer) return;
      this.signalRetry = 0;
      this.handlers.onCallStatus(true);
    });
    peer.on("connection", (conn) => this.attachData(conn));
    peer.on("call", (call) => this.answerCall(call));
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("Could not reach the signaling broker.")),
          20000,
        );
        peer.once("open", (peerId) => {
          window.clearTimeout(timer);
          opened = true;
          this.nicknames.set(peerId, this.localNickname);
          this.avatars.set(peerId, this.localAvatarId);
          if (this.isHost) {
            this.controllerIds = [peerId];
            this.handlers.onReady(peerId, "host");
          }
          resolve();
        });
        peer.once("error", (err) => {
          window.clearTimeout(timer);
          reject(err);
        });
      });
    } catch (err) {
      if (this.peer === peer) this.peer = null;
      peer.destroy();
      if (id && peerErrorType(err) === "unavailable-id" && attempt < 6 && !this.tearingDown) {
        if (attempt < 4) {
          await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
          return this.openPeer(id, attempt + 1, fresh);
        }
        if (this.isHost) {
          // Someone already holds a code guests know about, so the party is live: join it instead.
          if (!fresh) throw new HostIdTakenError(mapPeerError(err));
          return this.openPeer(randomRoomId(), attempt + 1, true);
        }
        // Rotate the stored guest id so this browser keeps one identity.
        const nextGuestId = await saveGuestPeerId(randomGuestPeerId());
        return this.openPeer(nextGuestId, attempt + 1);
      }
      throw new Error(mapPeerError(err));
    }
    if (this.tearingDown || this.peer !== peer) {
      peer.destroy();
      return;
    }
    window.addEventListener("online", this.onWake);
    document.addEventListener("visibilitychange", this.onWake);
    peer.on("error", (err) => {
      if (this.tearingDown || this.peer !== peer) return;
      // Join attempts and mesh calls handle a missing peer themselves.
      if (peerErrorType(err) === "peer-unavailable") return;
      this.handlers.onCallStatus(false, mapPeerError(err));
    });
  }

  private attachData(conn: DataConnection) {
    conn.on("open", () => {
      if (this.tearingDown) {
        conn.close();
        return;
      }
      const previous = this.connections.get(conn.peer);
      if (this.isHost && !previous && partyFull(this.connections.size + 1)) {
        conn.send(encodeMessage({ type: "room-full" }));
        conn.close();
        return;
      }
      this.connections.set(conn.peer, conn);
      if (previous && previous !== conn) {
        // Same peer rejoined (reload, followed the host); its old call is dead too.
        previous.close();
        this.calls.get(conn.peer)?.close();
        this.calls.delete(conn.peer);
        this.remoteStreams.delete(conn.peer);
      }
      this.emitParticipants();
      if (this.isHost) this.broadcastPeerList();
      this.broadcastMediaState();
      this.handlers.onDataOpen();
    });
    conn.on("data", (raw) => {
      const message = decodeMessage(typeof raw === "string" ? raw : String(raw));
      if (!message) return;
      if (message.type === "room-full") {
        this.handlers.onError("This party is full (8 people).");
        return;
      }
      this.handleProtocol(message, conn.peer);
    });
    conn.on("close", () => {
      if (this.tearingDown) return;
      // Ignore failed join attempts and connections already replaced by a rejoin.
      if (this.connections.get(conn.peer) !== conn) return;
      this.dropPeer(conn.peer);
      if (this.isHost) {
        this.send({ type: "bye", peerId: conn.peer });
        this.broadcastPeerList();
        return;
      }
      if (conn.peer === this.hostId) void this.reconnectToHost();
    });
    conn.on("error", () => {
      this.handlers.onCallStatus(false, "A chat connection failed. Try another network if this keeps happening.");
    });
  }

  private async reconnectToHost() {
    const hostId = this.hostId;
    if (this.reconnectingHost || this.tearingDown || !hostId) return;
    this.reconnectingHost = true;
    this.handlers.onCallStatus(false, "Lost the host. Reconnecting…");
    try {
      await this.connectToHost(hostId);
      if (!this.tearingDown) this.handlers.onCallStatus(true);
    } catch {
      if (!this.tearingDown && !this.connections.get(hostId)?.open) this.handlers.onHostLeft();
    } finally {
      this.reconnectingHost = false;
    }
  }

  private answerCall(call: MediaConnection) {
    if (!this.localStream) return;
    call.answer(this.localStream);
    this.bindCall(call);
  }

  private connectMesh(peerIds: string[]) {
    const myId = this.peer?.id;
    if (!myId || !this.localStream) return;
    for (const otherId of peerIds) {
      if (otherId === myId || this.calls.has(otherId)) continue;
      if (!shouldInitiateCall(myId, otherId)) continue;
      const call = this.peer!.call(otherId, this.localStream);
      if (call) this.bindCall(call);
    }
  }

  private bindCall(call: MediaConnection) {
    const previous = this.calls.get(call.peer);
    this.calls.set(call.peer, call);
    if (previous && previous !== call) previous.close();
    call.on("stream", (stream) => {
      if (this.calls.get(call.peer) !== call) return;
      this.remoteStreams.set(call.peer, stream);
      this.handlers.onCallStatus(true);
      this.emitParticipants();
      this.handlers.onProtocol(
        {
          type: "media-state",
          peerId: call.peer,
          nickname: this.nicknames.get(call.peer) || "Guest",
          avatarId: this.avatars.get(call.peer) || "fox",
          muted: this.mediaState.get(call.peer)?.muted ?? false,
          cameraOn: this.mediaState.get(call.peer)?.cameraOn ?? false,
        },
        call.peer,
      );
    });
    call.on("close", () => {
      if (this.calls.get(call.peer) !== call) return;
      this.calls.delete(call.peer);
      this.remoteStreams.delete(call.peer);
      this.emitParticipants();
    });
    call.on("error", () => {
      this.handlers.onCallStatus(
        false,
        "Voice/video couldn't connect. Try another network if this keeps happening.",
      );
    });
  }

  private broadcastPeerList() {
    const myId = this.peer?.id;
    if (!myId) return;
    const peerIds = [myId, ...this.connections.keys()];
    this.send({ type: "peers", peerIds });
    this.connectMesh(peerIds);
  }

  private broadcastMediaState() {
    const peerId = this.peer?.id;
    if (!peerId) return;
    this.mediaState.set(peerId, { muted: this.muted, cameraOn: this.cameraOn });
    this.send({
      type: "media-state",
      peerId,
      nickname: this.localNickname,
      avatarId: this.localAvatarId,
      muted: this.muted,
      cameraOn: this.cameraOn,
    });
    this.emitParticipants();
  }

  private dropPeer(peerId: string) {
    const nickname = this.nicknames.get(peerId);
    const avatarId = this.avatars.get(peerId);
    const media = this.mediaState.get(peerId);
    // Delete before closing: close events fire synchronously and would treat these as live.
    const conn = this.connections.get(peerId);
    const call = this.calls.get(peerId);
    this.connections.delete(peerId);
    this.calls.delete(peerId);
    conn?.close();
    call?.close();
    this.remoteStreams.delete(peerId);
    this.nicknames.delete(peerId);
    this.avatars.delete(peerId);
    this.mediaState.delete(peerId);
    if (nickname && peerId !== this.peer?.id) {
      this.disconnected.set(peerId, {
        nickname,
        avatarId: avatarId || "fox",
        muted: media?.muted ?? true,
        cameraOn: media?.cameraOn ?? false,
        until: Date.now() + 20_000,
      });
      this.scheduleDisconnectSweep();
    } else {
      this.disconnected.delete(peerId);
    }
    this.emitParticipants();
  }

  private scheduleDisconnectSweep() {
    window.clearTimeout(this.disconnectSweep);
    const soonest = Math.min(...[...this.disconnected.values()].map((item) => item.until));
    if (!Number.isFinite(soonest)) return;
    const wait = Math.max(250, soonest - Date.now());
    this.disconnectSweep = window.setTimeout(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, item] of this.disconnected) {
        if (item.until <= now) {
          this.disconnected.delete(id);
          changed = true;
        }
      }
      if (changed) this.emitParticipants();
      if (this.disconnected.size) this.scheduleDisconnectSweep();
    }, wait);
  }

  private peerIsLive(peerId: string, myId: string | null): boolean {
    if (peerId === myId) return true;
    const data = this.connections.get(peerId);
    if (data?.open) return true;
    if (this.calls.has(peerId) || this.remoteStreams.has(peerId)) return true;
    return false;
  }

  private emitParticipants() {
    const myId = this.peer?.id ?? null;
    const now = Date.now();
    for (const [id, item] of this.disconnected) {
      if (item.until <= now) this.disconnected.delete(id);
    }
    const ids = new Set<string>([
      ...this.connections.keys(),
      ...this.calls.keys(),
      ...this.remoteStreams.keys(),
    ]);
    if (myId) ids.add(myId);
    for (const id of ids) this.disconnected.delete(id);

    const live: Participant[] = [...ids].map((id) => ({
      peerId: id,
      nickname: this.nicknames.get(id) || (id === myId ? this.localNickname : "Guest"),
      avatarId: this.avatars.get(id) || (id === myId ? this.localAvatarId : "fox"),
      muted: this.mediaState.get(id)?.muted ?? (id === myId ? this.muted : false),
      cameraOn: this.mediaState.get(id)?.cameraOn ?? (id === myId ? this.cameraOn : false),
      connected: this.peerIsLive(id, myId),
    }));

    const gone: Participant[] = [...this.disconnected.entries()].map(([id, item]) => ({
      peerId: id,
      nickname: item.nickname,
      avatarId: item.avatarId,
      muted: item.muted,
      cameraOn: item.cameraOn,
      connected: false,
    }));

    this.handlers.onParticipants([...live, ...gone]);
  }
}
