import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chat } from "./Chat";
import { CloseIcon, CopyIcon, HideIcon, IconButton, MoonIcon, SunIcon } from "./icons";
import { AvatarFace } from "./AvatarFace";
import { LoungeArt } from "./SpotArt";
import { AvatarPicker } from "./AvatarPicker";
import { ReactionSky } from "./ReactionSky";
import { ensureCallFrame, placeCallFrame, removeCallFrame } from "../content/callFrame";
import { mediaPageUrl, parseRoomToken } from "../shared/ids";
import { PLATFORM_COLOR } from "../shared/platformColors";
import { platformNightLabel } from "../shared/platforms";
import { getState, subscribe } from "../shared/store";
import { nextThemePref, saveThemePref, watchTheme, type ThemePref } from "../shared/theme";
import { appVersionLabel } from "../shared/version";
import type { SessionController } from "../content/session";
import { PlatformMark } from "./PlatformMark";

const THEME_LABEL: Record<ThemePref, string> = { light: "Light", dark: "Dark" };

function ThemeButton() {
  const [pref, setPref] = useState<ThemePref>("light");
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
      {pref === "dark" ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
}

export function OverlayApp({ session }: { session: SessionController }) {
  const [state, setLocal] = useState(getState());
  const [copied, setCopied] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(() => getState().nickname);
  const [joinCode, setJoinCode] = useState(() => parseRoomToken() ?? "");
  const slotRef = useRef<HTMLDivElement>(null);
  const mediaSrc = useMemo(() => mediaPageUrl(), []);

  useEffect(() => subscribe(() => {
    setLocal(getState());
    const token = parseRoomToken();
    if (token && getState().status === "idle") {
      setJoinCode((current) => current || token);
    }
  }), []);

  // Keep the draft in sync when storage loads or a commit lands — not while typing.
  useEffect(() => {
    setNicknameDraft(state.nickname);
  }, [state.nickname]);

  async function commitNickname(next = nicknameDraft) {
    await session.setNickname(next);
  }

  const canWatch = state.isWatchPage && Boolean(state.contentId);
  const docked = state.status === "in-party" || state.status === "connecting";
  const connecting = state.status === "connecting";
  const needMedia = docked && !state.inlineSignaling;
  const lounge = !docked;
  const panelOpen = state.overlayOpen;

  useEffect(() => {
    if (!needMedia) {
      removeCallFrame();
      session.registerMediaWindow(null);
      return;
    }
    const iframe = ensureCallFrame(mediaSrc);
    const onLoad = () => {
      const win = iframe.contentWindow;
      if (win && win !== window) session.registerMediaWindow(win);
    };
    iframe.addEventListener("load", onLoad);
    onLoad();
    const onReload = () => onLoad();
    window.addEventListener("chillax-media-reload", onReload);
    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("chillax-media-reload", onReload);
    };
  }, [session, needMedia, mediaSrc]);

  useEffect(() => {
    if (!needMedia) return;
    const slot = slotRef.current;
    if (!slot) return;
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = slotRef.current;
        if (!node) return;
        const root = node.getRootNode();
        const host = root instanceof ShadowRoot ? root.host : null;
        if (host instanceof HTMLElement) {
          const viewport = window.visualViewport;
          const covered = viewport ? Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height) : 0;
          host.style.setProperty("--chillax-keyboard", `${covered > 80 ? Math.round(covered) : 0}px`);
        }
        placeCallFrame(node.getBoundingClientRect());
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(slot);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    document.addEventListener("fullscreenchange", place);
    document.addEventListener("webkitfullscreenchange", place);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      document.removeEventListener("fullscreenchange", place);
      document.removeEventListener("webkitfullscreenchange", place);
    };
  }, [needMedia, panelOpen, state.error, state.needsGesture, state.wrongTitle, state.waitingForAds]);

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
        const online = person.connected !== false;
        const statusLabel = online ? "Connected" : "Disconnected";
        const roleBit = isHostPerson ? " · host" : canDrive ? " · drive" : "";
        const awayBit = online ? "" : " · away";
        const titleBits = [
          isHostPerson ? "Host always has playback control" : null,
          online ? null : `${person.nickname} lost connection`,
          hostView && !isHostPerson
            ? canDrive
              ? `Stop ${person.nickname} from controlling playback`
              : `Let ${person.nickname} play, pause, and seek`
            : null,
        ].filter(Boolean);
        if (hostView && !isHostPerson) {
          return (
            <button
              className={`chip${canDrive ? " is-driver" : ""}${online ? "" : " is-away"}`}
              key={person.peerId}
              type="button"
              aria-pressed={canDrive}
              title={titleBits.join(" · ") || undefined}
              onClick={() => session.setController(person.peerId, !canDrive)}
            >
              <span className={`presence${online ? " is-on" : ""}`} title={statusLabel} aria-label={statusLabel} />
              <AvatarFace avatarId={person.avatarId} size={20} />
              {person.nickname}
              {canDrive ? " · drive" : ""}
              {awayBit}
            </button>
          );
        }
        return (
          <span
            className={`chip${canDrive ? " is-driver" : ""}${online ? "" : " is-away"}`}
            key={person.peerId}
            title={titleBits.join(" · ") || undefined}
          >
            <span className={`presence${online ? " is-on" : ""}`} title={statusLabel} aria-label={statusLabel} />
            <AvatarFace avatarId={person.avatarId} size={20} />
            {isYou ? "You" : person.nickname}
            {roleBit}
            {awayBit}
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
            <div className="brand-title">
              <h1>Chillax</h1>
              <span className="ver" title={`Chillax ${appVersionLabel()}`}>
                {appVersionLabel()}
              </span>
            </div>
            <div
              className="brand-night"
              style={{ "--platform-accent": PLATFORM_COLOR[state.platform] } as CSSProperties}
            >
              <PlatformMark platform={state.platform} size={14} className="platform-mark" />
              <p>
                {platformNightLabel(state.platform)}
                {state.party ? ` · ${state.party.role}` : ""}
              </p>
            </div>
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
        {state.waitingForAds ? (
          <div className="banner" role="status">
            Paused — waiting for ads to finish
            {state.waitingForAds.nickname ? ` for ${state.waitingForAds.nickname}` : ""}.
          </div>
        ) : null}
        {state.error ? (
          <div className="banner" role="alert">
            {state.error}
          </div>
        ) : null}
        {needMedia ? <div ref={slotRef} className="media-slot" /> : null}

        {lounge ? (
          <div className="idle">
            <div className="hero">
              <div className="storyboard">
                <LoungeArt />
              </div>
              <p className="kicker">Handmade night in</p>
              <strong>Make the couch bigger.</strong>
              <span className="lede">
                Pick a face, start a party, then yell at the screen.
              </span>
            </div>
            <label>
              Nickname
              <input
                type="text"
                value={nicknameDraft}
                maxLength={24}
                placeholder="Your name"
                autoComplete="nickname"
                onChange={(event) => setNicknameDraft(event.target.value)}
                onBlur={() => void commitNickname()}
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
              onClick={() => {
                void commitNickname().then(() => session.launchParty());
              }}
            >
              {canWatch ? "Start the night" : "Open a video to start"}
            </button>
            <p className="or-rule">or join</p>
            <form
              className="join-form"
              onSubmit={(event) => {
                event.preventDefault();
                void commitNickname().then(() => session.joinParty(joinCode));
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
              typing={state.typing}
              onTyping={(typing) => session.setTyping(typing)}
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
