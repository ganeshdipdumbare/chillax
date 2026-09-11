import type { ChatMessage, ContentState, Participant, Platform, ReactionBurst } from "./types";

export type OverlayState = ContentState & {
  messages: ChatMessage[];
  participants: Participant[];
  bursts: ReactionBurst[];
  muted: boolean;
  cameraOn: boolean;
  callConnected: boolean;
  callDetail: string | null;
};

const listeners = new Set<() => void>();

const platform: Platform =
  location.hostname.includes("netflix.com") ? "netflix" : "youtube";

let state: OverlayState = {
  platform,
  isWatchPage: false,
  contentId: null,
  nickname: "Guest",
  avatarId: "fox",
  party: null,
  status: "idle",
  error: null,
  wrongTitle: null,
  needsGesture: false,
  overlayOpen: false,
  localPeerId: null,
  controllers: [],
  messages: [],
  participants: [],
  bursts: [],
  muted: true,
  cameraOn: false,
  callConnected: true,
  callDetail: null,
};

export function getState(): OverlayState {
  return state;
}

export function setState(partial: Partial<OverlayState>) {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
