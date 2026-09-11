import { useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "./Chat";
import { CloseIcon, CopyIcon, HideIcon, IconButton } from "./icons";
import { AvatarFace } from "./AvatarFace";
import { LoungeArt } from "./SpotArt";
import { AvatarPicker } from "./AvatarPicker";
import { ReactionSky } from "./ReactionSky";
import { mediaPageUrl, parseRoomToken } from "../shared/ids";
import { getState, subscribe } from "../shared/store";
import type { SessionController } from "../content/session";

export function OverlayApp({ session }: { session: SessionController }) {
  const [state, setLocal] = useState(getState());
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState(() => parseRoomToken() ?? "");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => subscribe(() => {
    setLocal(getState());
    const token = parseRoomToken();
    if (token && getState().status === "idle") {
      setJoinCode((current) => current || token);
    }
  }), []);

  const canWatch = state.isWatchPage && Boolean(state.contentId);
  const docked = state.status === "in-party";
  const connecting = state.status === "connecting";
  const needMedia = docked || connecting;
  const lounge = !docked;

  useEffect(() => {
    if (!needMedia) {
      session.registerMediaWindow(null);
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) {
      session.registerMediaWindow(null);
      return;
    }
    const onLoad = () => {
      const win = iframe.contentWindow;
      if (win && win !== window) session.registerMediaWindow(win);
    };
    iframe.addEventListener("load", onLoad);
    onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      session.registerMediaWindow(null);
    };
  }, [session, needMedia]);

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

  const panelClass = [
    "panel",
    state.overlayOpen ? null : "is-collapsed",
    state.overlayOpen && lounge ? "is-lounge" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {!docked || state.overlayOpen ? null : (
        <button
          className="tab"
          type="button"
          title="Show chat — you are still in the party"
          onClick={() => session.toggleOverlay(true)}
        >
          Show chat
        </button>
      )}
      <div className={panelClass}>
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
        {docked ? (
          <button
            className="text-btn"
            type="button"
            title="Hide chat — you stay in the party"
            onClick={() => session.toggleOverlay(false)}
          >
            Hide chat
            <HideIcon />
          </button>
        ) : (
          <IconButton label="Close Chillax" onClick={() => session.toggleOverlay(false)}>
            <CloseIcon />
          </IconButton>
        )}
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
        {needMedia ? (
          <iframe
            ref={iframeRef}
            className={docked && state.overlayOpen ? "media-frame" : "media-frame is-hid"}
            title="Chillax voice and video"
            allow="camera; microphone; autoplay"
            src={mediaPageUrl()}
          />
        ) : null}

        {lounge ? (
          <div className="idle">
            <div className="hero">
              <div className="storyboard">
                <LoungeArt />
              </div>
              <strong>Make the couch bigger.</strong>
              <span className="lede">
                Pick a face, start a party, then chat on the right.
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
            {connecting ? (
              <div className="join-form">
                <p className="lede">{state.callDetail || "Connecting…"}</p>
                <button className="ghost" type="button" onClick={() => session.leaveParty()}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  className="primary"
                  type="button"
                  disabled={!canWatch}
                  onClick={() => session.startParty()}
                >
                  {canWatch ? "Start the night" : "Open a video to start"}
                </button>
                <form
                  className="join-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    session.joinParty(joinCode);
                  }}
                >
                  <label>
                    Join with code
                    <input
                      type="text"
                      value={joinCode}
                      placeholder="cxab12cd"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => setJoinCode(event.target.value)}
                    />
                  </label>
                  <button className="ghost" type="submit" disabled={!joinCode.trim()}>
                    Slide into this party
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <>
            {state.party ? (
              <div className="party-code">
                <strong className="code-pill">{copied ? "Invite copied" : state.party.roomId}</strong>
                {state.party.role === "host" ? (
                  <button
                    className="control-toggle"
                    type="button"
                    aria-pressed={state.guestPlayback}
                    onClick={() => session.setGuestPlayback(!state.guestPlayback)}
                  >
                    <span>
                      {state.guestPlayback
                        ? "Friends can play, pause, and seek"
                        : "Only you control playback"}
                    </span>
                    <span className="switch" aria-hidden="true" />
                  </button>
                ) : (
                  <p className="control-hint">
                    {state.guestPlayback
                      ? "You can play, pause, and seek for everyone."
                      : "Playback follows the host."}
                  </p>
                )}
                <button className="ghost is-leave" type="button" onClick={() => session.leaveParty()}>
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
              {state.status === "connecting"
                ? state.callDetail || "Connecting…"
                : state.callDetail ||
                  (state.callConnected
                    ? "Voice is P2P. Camera starts off. Smash a reaction."
                    : "Call could not connect. Chat and reactions may still work.")}
            </p>
          </>
        )}
      </div>
    </div>
    </>
  );
}
