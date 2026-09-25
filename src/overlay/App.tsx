import { useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "./Chat";
import { CloseIcon, CopyIcon, HideIcon, IconButton, MoonIcon, SunIcon, SystemThemeIcon } from "./icons";
import { AvatarFace } from "./AvatarFace";
import { LoungeArt } from "./SpotArt";
import { AvatarPicker } from "./AvatarPicker";
import { ReactionSky } from "./ReactionSky";
import { mediaPageUrl, parseRoomToken } from "../shared/ids";
import { getState, subscribe } from "../shared/store";
import { nextThemePref, saveThemePref, watchTheme, type ThemePref } from "../shared/theme";
import type { SessionController } from "../content/session";

const THEME_LABEL: Record<ThemePref, string> = { system: "System", light: "Light", dark: "Dark" };

function ThemeButton() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => watchTheme((next) => setPref(next)), []);
  const next = nextThemePref(pref);
  return (
    <IconButton
      label={`Theme: ${THEME_LABEL[pref]}. Switch to ${THEME_LABEL[next]}`}
      onClick={() => {
        setPref(next);
        void saveThemePref(next);
      }}
    >
      {pref === "light" ? <SunIcon /> : pref === "dark" ? <MoonIcon /> : <SystemThemeIcon />}
    </IconButton>
  );
}

export function OverlayApp({ session }: { session: SessionController }) {
  const [state, setLocal] = useState(getState());
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState(() => parseRoomToken() ?? "");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mediaSrc = useMemo(() => mediaPageUrl(), []);

  useEffect(() => subscribe(() => {
    setLocal(getState());
    const token = parseRoomToken();
    if (token && getState().status === "idle") {
      setJoinCode((current) => current || token);
    }
  }), []);

  const canWatch = state.isWatchPage && Boolean(state.contentId);
  const docked = state.status === "in-party" || state.status === "connecting";
  const connecting = state.status === "connecting";
  const needMedia = docked;
  const lounge = !docked;
  const panelOpen = state.overlayOpen;

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
    };
  }, [session, needMedia]);

  const hostId = state.party?.roomId;
  const me = state.localPeerId;
  const everyoneDrives = state.controllers.includes("*");
  const people = useMemo(
    () =>
      state.participants.map((person) => {
        const isHostPerson = Boolean(hostId && person.peerId === hostId);
        const canDrive = isHostPerson || everyoneDrives || state.controllers.includes(person.peerId);
        const isYou = Boolean(me && person.peerId === me);
        const hostView = state.party?.role === "host";
        if (hostView && !isHostPerson) {
          return (
            <button
              className={`chip${canDrive ? " is-driver" : ""}`}
              key={person.peerId}
              type="button"
              aria-pressed={canDrive}
              title={canDrive ? `Stop ${person.nickname} from controlling playback` : `Let ${person.nickname} play, pause, and seek`}
              onClick={() => session.setController(person.peerId, !canDrive)}
            >
              <AvatarFace avatarId={person.avatarId} size={22} />
              {person.nickname}
              {canDrive ? " · drive" : ""}
            </button>
          );
        }
        return (
          <span
            className={`chip${canDrive ? " is-driver" : ""}`}
            key={person.peerId}
            title={isHostPerson ? "Host always has playback control" : undefined}
          >
            <AvatarFace avatarId={person.avatarId} size={22} />
            {isYou ? "You" : person.nickname}
            {isHostPerson ? " · host" : canDrive ? " · drive" : ""}
          </span>
        );
      }),
    [state.participants, state.controllers, state.party?.role, state.party?.roomId, state.localPeerId, hostId, me, everyoneDrives, session],
  );

  const panelClass = [
    "panel",
    panelOpen ? null : "is-collapsed",
    panelOpen && lounge ? "is-lounge" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {!docked || panelOpen ? null : (
        <button
          className="tab"
          type="button"
          title="Open Chillax chat — you are still in the party"
          onClick={() => session.toggleOverlay(true)}
        >
          Chillax chat
        </button>
      )}
      <ReactionSky bursts={state.bursts} />
      <div className={panelClass}>
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
        <ThemeButton />
        {state.party ? (
          <IconButton
            label={copied ? "Invite copied" : "Copy invite link"}
            className={copied ? "is-copied" : undefined}
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
            Taking you to the host’s video…{" "}
            <a href={state.wrongTitle.hostUrl} rel="noreferrer">
              Open it
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
            className="media-frame"
            title="Chillax voice and video"
            allow="camera; microphone; autoplay"
            src={mediaSrc}
          />
        ) : null}

        {lounge ? (
          <div className="idle">
            <div className="hero">
              <div className="storyboard">
                <LoungeArt />
              </div>
              <p className="kicker">Handmade night in</p>
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
            <button
              className="primary"
              type="button"
              disabled={!canWatch}
              onClick={() => session.startParty()}
            >
              {canWatch ? "Start the night" : "Open a video to start"}
            </button>
            <p className="or-rule">or join</p>
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
          </div>
        ) : (
          <>
            {connecting ? (
              <div className="party-code">
                <p className="lede">{state.callDetail || "Opening your party…"}</p>
                <button className="ghost" type="button" onClick={() => session.leaveParty()}>
                  Cancel
                </button>
              </div>
            ) : state.party ? (
              <div className="party-code">
                <strong className="code-pill">{copied ? "Invite copied" : state.party.roomId}</strong>
                {state.party.role === "host" ? (
                  <p className="control-hint">You always have control. Tap friends to share it — as many as you want.</p>
                ) : (
                  <p className="control-hint">
                    {everyoneDrives || (me && state.controllers.includes(me))
                      ? "You can play, pause, and seek. The host always can too."
                      : "Playback follows the host. They can share control with you and others."}
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
              localPeerId={state.localPeerId}
              disabled={state.status !== "in-party"}
              onSend={(text) => session.sendChat(text)}
              onReact={(emoji) => session.sendReaction(emoji)}
            />
            <p className="status">
              {state.status === "connecting"
                ? state.callDetail || "Connecting…"
                : state.callDetail ||
                  (state.callConnected
                    ? "Voice is P2P. Mic and camera start off. Smash a reaction."
                    : "Call could not connect. Chat and reactions may still work.")}
            </p>
          </>
        )}
      </div>
    </div>
    </>
  );
}
