export type SessionController = {
  startParty: (roomId?: string) => void;
  /** Start the title playing if needed, then open a party once the player is up. */
  launchParty: (opts?: { click?: HTMLElement | null; href?: string }) => void;
  joinParty: (roomId: string) => void;
  leaveParty: () => void;
  sendChat: (text: string) => void;
  setTyping: (typing: boolean) => void;
  sendReaction: (emoji: string) => void;
  setNickname: (name: string) => Promise<void>;
  setAvatar: (avatarId: string) => Promise<void>;
  toggleOverlay: (open?: boolean) => void;
  setController: (peerId: string, allowed: boolean) => void;
  enablePlayback: () => void;
  registerMediaWindow: (win: Window | null) => void;
};
