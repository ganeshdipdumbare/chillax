import { useEffect, useState } from "react";
import type { OverlayState } from "../shared/store";
import { AvatarFace } from "../overlay/AvatarFace";
import { AvatarPicker } from "../overlay/AvatarPicker";

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function send<T>(message: unknown): Promise<T | null> {
  const tab = await activeTab();
  if (!tab?.id) return null;
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as T;
  } catch {
    return null;
  }
}

export function Popup() {
  const [state, setState] = useState<OverlayState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);
  const [missing, setMissing] = useState(false);

  async function refresh() {
    const next = await send<OverlayState>({ type: "CHILLAX_GET_STATE" });
    if (!next) {
      setMissing(true);
      setState(null);
      return;
    }
    setMissing(false);
    setState(next);
    setNickname(next.nickname);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const supported =
    Boolean(state) && (state?.platform === "youtube" || state?.platform === "netflix");

  return (
    <main>
      <div className="brand">
        <span className="logo" aria-hidden="true">Cx</span>
        <div>
          <h1>Chillax</h1>
          <p>Watch together · chat · call</p>
        </div>
      </div>

      {missing ? (
        <p className="error">
          Open a YouTube video or Netflix title, then click Chillax again.
        </p>
      ) : null}

      {state ? (
        <>
          <div className="row">
            <AvatarFace avatarId={state.avatarId} size={36} />
            <label style={{ flex: 1 }}>
              Nickname
              <input
                type="text"
                maxLength={24}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                onBlur={() =>
                  void send({ type: "CHILLAX_SET_NICKNAME", nickname })
                }
              />
            </label>
          </div>
          <label>
            Avatar
            <AvatarPicker
              value={state.avatarId}
              onChange={(id) => {
                void send({ type: "CHILLAX_SET_AVATAR", avatarId: id }).then(refresh);
              }}
            />
          </label>
          {!state.isWatchPage ? (
            <p>Open something to watch first.</p>
          ) : state.party ? (
            <>
              <p>
                Party <strong>{state.party.roomId}</strong> · {state.party.role}
              </p>
              <button
                className="primary"
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.party!.inviteUrl);
                  setCopied(true);
                }}
              >
                {copied ? "Invite copied" : "Copy invite link"}
              </button>
              <button className="ghost" type="button" onClick={() => void send({ type: "CHILLAX_LEAVE" }).then(refresh)}>
                Leave party
              </button>
            </>
          ) : (
            <>
              <button
                className="primary"
                type="button"
                disabled={!supported}
                onClick={() => void send({ type: "CHILLAX_START" }).then(refresh)}
              >
                Start the night
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send({ type: "CHILLAX_JOIN", roomId: joinCode }).then(refresh);
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
          <button className="ghost" type="button" onClick={() => void send({ type: "CHILLAX_TOGGLE_OVERLAY" })}>
            Show or hide chat
          </button>
        </>
      ) : null}
    </main>
  );
}
