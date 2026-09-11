import { useEffect, useRef, useState } from "react";
import { MSG_SOURCE_CONTENT, MSG_SOURCE_MEDIA } from "../shared/constants";
import { captureLocalMedia } from "../p2p/mesh";
import { PeerRoom } from "../p2p/room";
import type { Participant, Platform, ProtocolMessage } from "../shared/types";
import { Tile } from "./Tile";

type InitPayload = {
  source?: string;
  type: "init";
  role: "host" | "guest";
  roomId: string;
  nickname: string;
  avatarId: string;
  platform: Platform;
  contentId: string | null;
  watchUrl: string;
};

function postToParent(payload: Record<string, unknown>) {
  parent.postMessage({ source: MSG_SOURCE_MEDIA, ...payload }, "*");
}

export function MediaApp() {
  const roomRef = useRef<PeerRoom | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initRef = useRef<InitPayload | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("Connecting…");
  const [tick, setTick] = useState(0);

  function hangup() {
    roomRef.current?.destroy();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    roomRef.current = null;
    streamRef.current = null;
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | InitPayload
        | { source?: string; type?: string; message?: ProtocolMessage; nickname?: string; avatarId?: string }
        | null;
      if (!data || data.source !== MSG_SOURCE_CONTENT) return;
      if (data.type === "init") {
        initRef.current = data as InitPayload;
        void startRoom(data as InitPayload);
      }
      if (data.type === "send-protocol" && data.message) {
        roomRef.current?.send(data.message);
      }
      if (data.type === "leave") {
        hangup();
      }
      if (data.type === "nickname" && data.nickname) {
        if (roomRef.current) {
          roomRef.current.localNickname = data.nickname;
          if (data.avatarId) roomRef.current.localAvatarId = data.avatarId;
        }
      }
    };
    const onPageExit = () => hangup();
    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onPageExit);
    window.addEventListener("beforeunload", onPageExit);
    document.addEventListener("freeze", onPageExit);
    parent.postMessage({ source: MSG_SOURCE_MEDIA, type: "iframe-ready" }, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onPageExit);
      window.removeEventListener("beforeunload", onPageExit);
      document.removeEventListener("freeze", onPageExit);
      hangup();
    };
  }, []);

  async function startRoom(init: InitPayload) {
    if (roomRef.current) return;
    setStatus("Allow microphone to talk while you watch");
    let stream: MediaStream;
    try {
      stream = await captureLocalMedia();
    } catch {
      postToParent({
        type: "error",
        message: "Microphone permission is needed for party voice. You can still use chat if you retry and allow access.",
      });
      setStatus("Microphone blocked");
      return;
    }
    streamRef.current = stream;
    const room = new PeerRoom({
      onReady: (peerId) => {
        postToParent({ type: "ready", peerId });
        setStatus("Voice ready · camera starts off");
      },
      onDataOpen: () => {
        const peerId = room.peerId;
        const cfg = initRef.current;
        if (!peerId || !cfg) return;
        room.send({
          type: "hello",
          nickname: cfg.nickname,
          avatarId: cfg.avatarId || "fox",
          peerId,
          platform: cfg.platform,
          contentId: cfg.contentId || "",
          watchUrl: cfg.watchUrl,
        });
        room.setMuted(muted);
        room.setCameraOn(cameraOn);
      },
      onProtocol: (message) => {
        postToParent({ type: "protocol", message });
      },
      onParticipants: (next) => {
        setParticipants(next);
        setTick((value) => value + 1);
        postToParent({ type: "participants", participants: next });
      },
      onError: (message) => {
        setStatus(message);
        postToParent({ type: "error", message });
      },
      onCallStatus: (connected, detail) => {
        if (detail) setStatus(detail);
        postToParent({ type: "call-status", connected, detail });
      },
      onHostLeft: () => {
        hangup();
        postToParent({ type: "host-left" });
      },
    });
    roomRef.current = room;
    try {
      if (init.role === "host") {
        await room.startHost(init.roomId, stream, init.nickname, init.avatarId || "fox");
      } else {
        await room.join(init.roomId, stream, init.nickname, init.avatarId || "fox");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start the party connection.";
      setStatus(message);
      postToParent({ type: "error", message });
    }
  }

  const myId = roomRef.current?.peerId;
  const locals: Participant[] = myId
    ? [
        {
          peerId: myId,
          nickname: initRef.current?.nickname || "You",
          avatarId: initRef.current?.avatarId || "fox",
          muted,
          cameraOn,
        },
      ]
    : [];
  const others = participants.filter((person) => person.peerId !== myId);
  const tiles = [...locals, ...others];

  return (
    <div className="wrap">
      <div className="tiles">
        {tiles.length === 0 ? (
          <div className="tile">
            <div className="letter">
              <span className="face" style={{ width: 48, height: 48, fontSize: 28, background: "linear-gradient(145deg,#f3c77e,#7dffd0)" }}>🍿</span>
            </div>
            <div className="name">Connecting</div>
          </div>
        ) : (
          tiles.map((person) => (
            <Tile
              key={`${person.peerId}-${tick}`}
              stream={
                person.peerId === myId
                  ? streamRef.current
                  : roomRef.current?.getRemoteStream(person.peerId) || null
              }
              muted={person.muted}
              cameraOn={person.cameraOn}
              nickname={person.nickname}
              avatarId={person.avatarId}
              local={person.peerId === myId}
            />
          ))
        )}
      </div>
      <div className="controls">
        <button
          type="button"
          aria-pressed={muted}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            roomRef.current?.setMuted(next);
            postToParent({ type: "local-media", muted: next, cameraOn });
          }}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          aria-pressed={cameraOn}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          onClick={() => {
            const next = !cameraOn;
            setCameraOn(next);
            roomRef.current?.setCameraOn(next);
            postToParent({ type: "local-media", muted, cameraOn: next });
          }}
        >
          {cameraOn ? "Camera on" : "Camera off"}
        </button>
      </div>
      <p className="status">{status}</p>
    </div>
  );
}
