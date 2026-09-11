export const TOKEN_KEY = "chillax";
export const PARTY_CAP = 8;
export const YT_DRIFT_SECONDS = 0.35;
export const NETFLIX_DRIFT_SECONDS = 0.7;
export const HEARTBEAT_MS = 1000;
export const PEER_PREFIX = "cx";
export const OVERLAY_PANEL_WIDTH = 360;
export const OVERLAY_INSET = 0;
export const OVERLAY_RESERVE = OVERLAY_PANEL_WIDTH;
export const MSG_SOURCE_CONTENT = "chillax-content";
export const MSG_SOURCE_MEDIA = "chillax-media";
export const MSG_SOURCE_NFLX_ISOLATED = "chillax-isolated";
export const MSG_SOURCE_NFLX_MAIN = "chillax-main";
export const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 320, max: 320 },
    height: { ideal: 240, max: 240 },
    frameRate: { ideal: 15, max: 15 },
    facingMode: "user",
  },
};

export const PEER_CONFIG = {
  debug: 0 as const,
  config: {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  },
};
