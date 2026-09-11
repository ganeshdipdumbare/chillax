import { PARTY_CAP, VIDEO_CONSTRAINTS } from "../shared/constants";

export function placeholderVideoTrack(): MediaStreamTrack {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#09060f";
    ctx.fillRect(0, 0, 16, 16);
  }
  const track = canvas.captureStream(1).getVideoTracks()[0];
  track.enabled = false;
  return track;
}

export function createSilentAudio(): { ctx: AudioContext; track: MediaStreamTrack } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.connect(gain);
  gain.connect(dest);
  osc.start();
  const track = dest.stream.getAudioTracks()[0];
  track.enabled = false;
  return { ctx, track };
}

export async function captureCameraTrack(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: VIDEO_CONSTRAINTS.video,
  });
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error("Camera was not available.");
  return track;
}

export async function captureMicTrack(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: VIDEO_CONSTRAINTS.audio,
    video: false,
  });
  const track = stream.getAudioTracks()[0];
  if (!track) throw new Error("Microphone was not available.");
  return track;
}

export async function captureLocalMedia(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: VIDEO_CONSTRAINTS.audio,
    video: false,
  });
  stream.addTrack(placeholderVideoTrack());
  return stream;
}

export function partyFull(memberCount: number): boolean {
  return memberCount >= PARTY_CAP;
}
