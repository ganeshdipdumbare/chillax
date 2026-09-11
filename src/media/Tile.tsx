import { useEffect, useRef } from "react";
import { AvatarFace } from "../overlay/AvatarFace";

export function Tile({
  stream,
  muted,
  cameraOn,
  nickname,
  avatarId,
  local,
}: {
  stream: MediaStream | null;
  muted: boolean;
  cameraOn: boolean;
  nickname: string;
  avatarId: string;
  local?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = cameraOn ? stream : null;
    if (cameraOn && stream) void video.play().catch(() => undefined);
  }, [stream, cameraOn]);

  return (
    <div className="tile">
      {cameraOn && stream ? (
        <video ref={ref} autoPlay playsInline muted={local} />
      ) : (
        <div className="letter">
          <AvatarFace avatarId={avatarId} size={64} />
        </div>
      )}
      <div className="name">
        <AvatarFace avatarId={avatarId} size={16} />
        {nickname}
        {local ? " · you" : ""}
        {muted ? " · muted" : ""}
      </div>
    </div>
  );
}
