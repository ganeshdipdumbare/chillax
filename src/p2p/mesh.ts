import { PARTY_CAP, VIDEO_CONSTRAINTS } from "../shared/constants";

export async function captureLocalMedia(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    stream.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
    return stream;
  } catch (videoError) {
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({
        audio: VIDEO_CONSTRAINTS.audio,
        video: false,
      });
      return audioOnly;
    } catch {
      throw videoError instanceof Error
        ? videoError
        : new Error("Camera or microphone permission was denied.");
    }
  }
}

export function partyFull(memberCount: number): boolean {
  return memberCount >= PARTY_CAP;
}
