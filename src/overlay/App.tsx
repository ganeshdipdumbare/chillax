import { useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "./Chat";
import { CloseIcon, CopyIcon, IconButton } from "./icons";
import { AvatarFace } from "./AvatarFace";
import { AvatarPicker } from "./AvatarPicker";
import { ReactionSky } from "./ReactionSky";
import { mediaPageUrl } from "../shared/ids";
import { getState, subscribe } from "../shared/store";
import type { SessionController } from "../content/session";

export function OverlayApp({ session }: { session: SessionController }) {
  const [state, setLocal] = useState(getState());
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => subscribe(() => setLocal(getState())), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      session.registerMediaWindow(null);
      return;
    }
    const onLoad = () => session.registerMediaWindow(iframe.contentWindow);
    iframe.addEventListener("load", onLoad);
    if (iframe.contentWindow) session.registerMediaWindow(iframe.contentWindow);
    return () => {
      iframe.removeEventListener("load", onLoad);
      session.registerMediaWindow(null);
    };
  }, [session, state.party?.roomId, state.status]);

  const canWatch = state.isWatchPage && Boolean(state.contentId);
  const inParty = state.status === "in-party" || state.status === "connecting";

  const people = useMemo(
    () =>
      state.participants.map((person) => (
        <span className="chip" key={person.peerId}>
          <AvatarFace avatarId={person.avatarId} size={22} />
          {person.nickname}
          {person.muted ? " · muted" : ""}
        </span>
      )),
    [state.participants],
  );

  if (!state.overlayOpen) {
    return (
      <button className="tab" type="button" onClick={() => session.toggleOverlay(true)}>
        Chillax
      </button>
    );
  }

  return (
    <div className="panel">
      <ReactionSky bursts={state.bursts} />
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden="true">Cx</span>
          <div>
            <h1>Chillax</h1>
            <p>
              {state.platform === "netflix" ? "Netflix night" : "YouTube night"}
              {state.party ? ` · ${state.party.role}` : ""}
            </p>
          </div>
        </div>
        {state.party ? (
          <IconButton
            label={copied ? "Invite copied" : "Copy invite link"}
            onClick={async () => {
              await navigator.clipboard.writeText(state.party!.inviteUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            <CopyIcon />
          </IconButton>
        ) : null}
        <IconButton
          label={inParty ? "Close Chillax and leave party" : "Close Chillax panel"}
          onClick={() => session.toggleOverlay(false)}
        >
          <CloseIcon />
        </IconButton>
      </header>

      <div className="body">
        {state.needsGesture ? (
          <button className="banner" type="button" onClick={() => session.enablePlayback()}>
            Click to allow playback on this tab
          </button>
        ) : null}
        {state.wrongTitle ? (
          <div className="banner" role="status">
            Open the same title as the host.{" "}
            <a href={state.wrongTitle.hostUrl} target="_blank" rel="noreferrer">
              Host link
            </a>
          </div>
        ) : null}
        {state.error ? (
          <div className="banner" role="alert">
            {state.error}
          </div>
        ) : null}

        {!inParty ? (
          <div className="idle">
            <div className="hero">
              <strong>Make the couch bigger.</strong>
              <span className="status" style={{ padding: 0 }}>
                Pick a face, start a party, react in real time.
              </span>
            </div>
            <label>
              Nickname
              <input
                type="text"
                value={state.nickname}
                maxLength={24}
                onChange={(event) => void session.setNickname(event.target.value)}
              />
            </label>
            <label>
              Avatar
              <AvatarPicker
                value={state.avatarId}
                onChange={(id) => void session.setAvatar(id)}
              />
            </label>
            <button
              className="primary"
              type="button"
              disabled={!canWatch || state.status === "connecting"}
              onClick={() => session.startParty()}
            >
              {canWatch ? "Start the night" : "Open a video to start"}
            </button>
            <label>
              Join with code
              <input
                type="text"
                value={joinCode}
                placeholder="cxab12cd"
                onChange={(event) => setJoinCode(event.target.value)}
              />
            </label>
            <button
              className="ghost"
              type="button"
              disabled={!canWatch || !joinCode.trim()}
              onClick={() => session.joinParty(joinCode.trim())}
            >
              Slide into this party
            </button>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              className="media-frame"
              title="Chillax voice and video"
              allow="camera; microphone; autoplay"
              src={mediaPageUrl()}
            />
            {state.status === "connecting" ? (
              <div className="party-code">
                <button className="ghost" type="button" onClick={() => session.leaveParty()}>
                  Cancel
                </button>
              </div>
            ) : null}
            {state.party ? (
              <div className="party-code">
                <strong className="code-pill">{copied ? "Invite copied" : state.party.roomId}</strong>
                <button className="ghost" type="button" onClick={() => session.leaveParty()}>
                  Leave party
                </button>
              </div>
            ) : null}
            <div className="people">{people}</div>
            <Chat
              messages={state.messages}
              disabled={state.status !== "in-party"}
              onSend={(text) => session.sendChat(text)}
              onReact={(emoji) => session.sendReaction(emoji)}
            />
            <p className="status">
              {state.callDetail ||
                (state.callConnected
                  ? "Voice is P2P. Camera starts off. Smash a reaction."
                  : "Call could not connect. Chat and reactions may still work.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
