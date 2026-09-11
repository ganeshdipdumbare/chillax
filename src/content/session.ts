export type SessionController = {
  startParty: (roomId?: string) => void;
  joinParty: (roomId: string) => void;
  leaveParty: () => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  setNickname: (name: string) => Promise<void>;
  setAvatar: (avatarId: string) => Promise<void>;
  toggleOverlay: (open?: boolean) => void;
  setController: (peerId: string, allowed: boolean) => void;
  enablePlayback: () => void;
  registerMediaWindow: (win: Window | null) => void;
};
