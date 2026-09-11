import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { PEER_CONFIG } from "../shared/constants";
import { randomRoomId } from "../shared/ids";
import { decodeMessage, encodeMessage } from "./protocol";
import { partyFull, captureCameraTrack, placeholderVideoTrack } from "./mesh";
import type { Participant, ProtocolMessage } from "../shared/types";

type RoomHandlers = {
  onProtocol: (message: ProtocolMessage, fromPeerId: string) => void;
  onParticipants: (participants: Participant[]) => void;
  onError: (message: string) => void;
  onReady: (peerId: string) => void;
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

function mapPeerError(err: unknown): string {
  const type = peerErrorType(err);
  if (type === "unavailable-id") {
    return "That party code is already in use. Try starting a new party.";
  }
  if (type === "peer-unavailable") {
    return "Could not find that party. Check the code and try again.";
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
  private isHost = false;
  private localStream: MediaStream | null = null;
  private handlers: RoomHandlers;
  private muted = false;
  private cameraOn = false;
  private cameraTrack: MediaStreamTrack | null = null;
  private tearingDown = false;
  localNickname = "Guest";
  localAvatarId = "fox";

  constructor(handlers: RoomHandlers) {
    this.handlers = handlers;
  }

  get peerId(): string | null {
    return this.peer?.id ?? null;
  }

  async startHost(roomId: string, stream: MediaStream, nickname: string, avatarId: string) {
    this.isHost = true;
    this.localStream = stream;
    this.localNickname = nickname;
    this.localAvatarId = avatarId;
    this.nicknames.set(roomId, nickname);
    this.avatars.set(roomId, avatarId);
    await this.openPeer(roomId);
  }

  async join(hostId: string, stream: MediaStream, nickname: string, avatarId: string) {
    this.isHost = false;
    this.localStream = stream;
    this.localNickname = nickname;
    this.localAvatarId = avatarId;
    await this.openPeer();
    if (!this.peer) throw new Error("Could not start peer");
    this.attachData(this.peer.connect(hostId, { reliable: true }));
  }

  send(message: ProtocolMessage, exceptPeerId?: string) {
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

  setMuted(muted: boolean) {
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    this.broadcastMediaState();
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
      await this.replaceVideoTrack(track);
      this.cameraTrack = track;
      this.cameraOn = true;
    } else {
      this.cameraTrack?.stop();
      this.cameraTrack = null;
      const dummy = placeholderVideoTrack();
      await this.replaceVideoTrack(dummy);
      this.cameraOn = false;
    }
    this.broadcastMediaState();
  }

  private async replaceVideoTrack(next: MediaStreamTrack) {
    if (this.localStream) {
      for (const old of this.localStream.getVideoTracks()) {
        this.localStream.removeTrack(old);
        if (old !== next) old.stop();
      }
      this.localStream.addTrack(next);
    }
    await Promise.all(
      [...this.calls.values()].map(async (call) => {
        const sender = call.peerConnection
          ?.getSenders()
          .find((item) => item.track?.kind === "video");
        if (sender) await sender.replaceTrack(next);
      }),
    );
  }

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  destroy() {
    if (this.tearingDown) return;
    this.tearingDown = true;
    const peerId = this.peer?.id;
    if (peerId) {
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
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
    this.calls.clear();
    this.remoteStreams.clear();
  }

  handleProtocol(message: ProtocolMessage, fromPeerId: string) {
    if (message.type === "hello") {
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
    }
    if (this.isHost && message.type !== "peers" && message.type !== "room-full") {
      this.send(message, fromPeerId);
    }
    this.handlers.onProtocol(message, fromPeerId);
  }

  private async openPeer(id?: string, attempt = 0): Promise<void> {
    if (this.tearingDown) return;
    this.peer?.destroy();
    const peer = id ? new Peer(id, PEER_CONFIG) : new Peer(PEER_CONFIG);
    this.peer = peer;
    peer.on("disconnected", () => {
      if (this.tearingDown || this.peer !== peer) return;
      this.handlers.onCallStatus(false, "Disconnected from signaling. Reconnecting…");
      peer.reconnect();
    });
    peer.on("connection", (conn) => this.attachData(conn));
    peer.on("call", (call) => this.answerCall(call));
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("Could not reach the signaling broker.")),
          12000,
        );
        peer.once("open", (peerId) => {
          window.clearTimeout(timer);
          this.nicknames.set(peerId, this.localNickname);
          this.avatars.set(peerId, this.localAvatarId);
          this.handlers.onReady(peerId);
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
      if (id && peerErrorType(err) === "unavailable-id" && attempt < 4 && !this.tearingDown) {
        return this.openPeer(randomRoomId(), attempt + 1);
      }
      throw new Error(mapPeerError(err));
    }
    if (this.tearingDown || this.peer !== peer) {
      peer.destroy();
      return;
    }
    peer.on("error", (err) => {
      if (this.tearingDown || this.peer !== peer) return;
      this.handlers.onCallStatus(false, mapPeerError(err));
    });
  }

  private attachData(conn: DataConnection) {
    conn.on("open", () => {
      if (this.isHost && partyFull(this.connections.size + 1)) {
        conn.send(encodeMessage({ type: "room-full" }));
        conn.close();
        return;
      }
      this.connections.set(conn.peer, conn);
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
      this.dropPeer(conn.peer);
      if (this.isHost) {
        this.send({ type: "bye", peerId: conn.peer });
        this.broadcastPeerList();
        return;
      }
      window.setTimeout(() => {
        if (this.tearingDown || this.connections.size > 0) return;
        this.handlers.onHostLeft();
      }, 4000);
    });
    conn.on("error", () => {
      this.handlers.onCallStatus(false, "A chat connection failed. Try another network if this keeps happening.");
    });
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
    this.calls.set(call.peer, call);
    call.on("stream", (stream) => {
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
      this.calls.delete(call.peer);
      this.remoteStreams.delete(call.peer);
      this.emitParticipants();
    });
    call.on("error", () => {
      this.handlers.onCallStatus(
        false,
        "Voice/video couldn't connect (no TURN in v1). Chat may still work.",
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
    this.connections.get(peerId)?.close();
    this.connections.delete(peerId);
    this.calls.get(peerId)?.close();
    this.calls.delete(peerId);
    this.remoteStreams.delete(peerId);
    this.nicknames.delete(peerId);
    this.avatars.delete(peerId);
    this.mediaState.delete(peerId);
    this.emitParticipants();
  }

  private emitParticipants() {
    const myId = this.peer?.id;
    const ids = new Set<string>([
      ...this.connections.keys(),
      ...this.calls.keys(),
      ...this.remoteStreams.keys(),
    ]);
    if (myId) ids.add(myId);
    const participants: Participant[] = [...ids].map((id) => ({
      peerId: id,
      nickname: this.nicknames.get(id) || (id === myId ? this.localNickname : "Guest"),
      avatarId: this.avatars.get(id) || (id === myId ? this.localAvatarId : "fox"),
      muted: this.mediaState.get(id)?.muted ?? false,
      cameraOn: this.mediaState.get(id)?.cameraOn ?? (id === myId ? this.cameraOn : false),
    }));
    this.handlers.onParticipants(participants);
  }
}
