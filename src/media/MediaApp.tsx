import { useEffect, useRef, useState } from "react";
import { MSG_SOURCE_CONTENT, MSG_SOURCE_MEDIA } from "../shared/constants";
import { placeholderLocalStream } from "../p2p/mesh";
import { PeerRoom } from "../p2p/room";
import type { Participant, Platform, ProtocolMessage } from "../shared/types";
import { CameraIcon, MicIcon } from "../overlay/icons";
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
  const startingRef = useRef(false);
  const generationRef = useRef(0);
  const mutedRef = useRef(true);
  const cameraOnRef = useRef(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("Connecting…");
  const [tick, setTick] = useState(0);

  function hangup() {
    generationRef.current += 1;
    startingRef.current = false;
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
    const onPageExit = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      hangup();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onPageExit);
    const ping = () => {
      parent.postMessage({ source: MSG_SOURCE_MEDIA, type: "iframe-ready" }, "*");
    };
    ping();
    const timer = window.setInterval(() => {
      if (initRef.current) {
        window.clearInterval(timer);
        return;
      }
      ping();
    }, 250);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onPageExit);
      hangup();
    };
  }, []);

  async function startRoom(init: InitPayload) {
    if (roomRef.current || startingRef.current) return;
    startingRef.current = true;
    const generation = generationRef.current;
    const placeholder = placeholderLocalStream();
    if (placeholder.ctx.state === "suspended") {
      await placeholder.ctx.resume().catch(() => undefined);
    }
    if (generation !== generationRef.current) {
      placeholder.stream.getTracks().forEach((track) => track.stop());
      await placeholder.ctx.close().catch(() => undefined);
      return;
    }
    streamRef.current = placeholder.stream;
    mutedRef.current = true;
    cameraOnRef.current = false;
    setMuted(true);
    setCameraOn(false);
    postToParent({ type: "local-media", muted: true, cameraOn: false });
    const room = new PeerRoom({
      onReady: (peerId) => {
        postToParent({ type: "ready", peerId });
        setStatus("Mic and camera start off");
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
        void room.setMuted(mutedRef.current);
        void room.setCameraOn(cameraOnRef.current);
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
    room.bindSilentAudio(placeholder.ctx);
    try {
      if (init.role === "host") {
        setStatus("Opening your party…");
        await room.startHost(init.roomId, placeholder.stream, init.nickname, init.avatarId || "fox");
      } else {
        setStatus("Looking for that party…");
        await room.join(init.roomId, placeholder.stream, init.nickname, init.avatarId || "fox");
      }
      if (generation !== generationRef.current) {
        room.destroy();
        placeholder.stream.getTracks().forEach((track) => track.stop());
        return;
      }
      startingRef.current = false;
    } catch (error) {
      if (generation !== generationRef.current) return;
      startingRef.current = false;
      room.destroy();
      if (roomRef.current === room) roomRef.current = null;
      placeholder.stream.getTracks().forEach((track) => track.stop());
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
          className={muted ? "is-off" : "is-on"}
          aria-pressed={!muted}
          aria-label={muted ? "Turn microphone on" : "Turn microphone off"}
          onClick={() => {
            const next = !mutedRef.current;
            mutedRef.current = next;
            setMuted(next);
            postToParent({ type: "local-media", muted: next, cameraOn: cameraOnRef.current });
            void roomRef.current?.setMuted(next).catch(() => {
              mutedRef.current = !next;
              setMuted(!next);
              postToParent({ type: "local-media", muted: !next, cameraOn: cameraOnRef.current });
              if (!next) setStatus("Microphone blocked. Turn mic on to retry.");
            });
          }}
        >
          <MicIcon off={muted} />
          {muted ? "Mic off" : "Mic on"}
        </button>
        <button
          type="button"
          className={cameraOn ? "is-on" : "is-off"}
          aria-pressed={cameraOn}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          onClick={() => {
            const next = !cameraOnRef.current;
            cameraOnRef.current = next;
            setCameraOn(next);
            postToParent({ type: "local-media", muted: mutedRef.current, cameraOn: next });
            void roomRef.current?.setCameraOn(next).catch(() => {
              cameraOnRef.current = false;
              setCameraOn(false);
              postToParent({ type: "local-media", muted: mutedRef.current, cameraOn: false });
            });
          }}
        >
          <CameraIcon off={!cameraOn} />
          {cameraOn ? "Camera on" : "Camera off"}
        </button>
      </div>
      <p className="status">{status}</p>
    </div>
  );
}
