export type Platform = "youtube" | "netflix";
export type PartyRole = "host" | "guest";

export type PlayerState = {
  paused: boolean;
  time: number;
};

export type ChatMessage = {
  id: string;
  from: string;
  nickname: string;
  avatarId: string;
  text: string;
  sentAt: number;
};

export type Participant = {
  peerId: string;
  nickname: string;
  avatarId: string;
  muted: boolean;
  cameraOn: boolean;
};

export type ReactionBurst = {
  id: string;
  emoji: string;
  x: number;
  spin: number;
  wobble: number;
};

export type ContentState = {
  platform: Platform;
  isWatchPage: boolean;
  contentId: string | null;
  nickname: string;
  avatarId: string;
  party: {
    role: PartyRole;
    roomId: string;
    inviteUrl: string;
  } | null;
  status:
    | "idle"
    | "connecting"
    | "in-party"
    | "error";
  error: string | null;
  wrongTitle: { hostUrl: string; hostContentId: string } | null;
  needsGesture: boolean;
  overlayOpen: boolean;
};

export type ProtocolMessage =
  | {
      type: "hello";
      nickname: string;
      avatarId: string;
      peerId: string;
      platform: Platform;
      contentId: string;
      watchUrl: string;
    }
  | {
      type: "peers";
      peerIds: string[];
    }
  | ChatMessage & { type: "chat" }
  | {
      type: "sync";
      paused: boolean;
      time: number;
      sentAt: number;
      platform: Platform;
      contentId: string;
      watchUrl: string;
    }
  | {
      type: "media-state";
      peerId: string;
      nickname: string;
      avatarId: string;
      muted: boolean;
      cameraOn: boolean;
    }
  | {
      type: "reaction";
      id: string;
      from: string;
      nickname: string;
      avatarId: string;
      emoji: string;
      sentAt: number;
    }
  | { type: "ping"; sentAt: number }
  | { type: "pong"; sentAt: number }
  | { type: "room-full" }
  | { type: "bye"; peerId: string };

export type PopupRequest =
  | { type: "CHILLAX_GET_STATE" }
  | { type: "CHILLAX_START" }
  | { type: "CHILLAX_JOIN"; roomId: string }
  | { type: "CHILLAX_LEAVE" }
  | { type: "CHILLAX_SET_NICKNAME"; nickname: string }
  | { type: "CHILLAX_SET_AVATAR"; avatarId: string }
  | { type: "CHILLAX_TOGGLE_OVERLAY" };

export type MediaToContent =
  | { source: "chillax-media"; type: "ready"; peerId: string }
  | { source: "chillax-media"; type: "protocol"; message: ProtocolMessage }
  | {
      source: "chillax-media";
      type: "participants";
      participants: Participant[];
    }
  | { source: "chillax-media"; type: "local-media"; muted: boolean; cameraOn: boolean }
  | { source: "chillax-media"; type: "error"; message: string }
  | { source: "chillax-media"; type: "call-status"; connected: boolean; detail?: string }
  | { source: "chillax-media"; type: "iframe-ready" };
