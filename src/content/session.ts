export type SessionController = {
  startParty: () => void;
  joinParty: (roomId: string) => void;
  leaveParty: () => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  setNickname: (name: string) => Promise<void>;
  setAvatar: (avatarId: string) => Promise<void>;
  toggleOverlay: (open?: boolean) => void;
  enablePlayback: () => void;
  registerMediaWindow: (win: Window | null) => void;
};
