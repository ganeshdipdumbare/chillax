import { useEffect, useRef } from "react";
import type { ChatMessage, TypingPeer } from "../shared/types";
import { formatChatTime } from "../shared/time";
import { AvatarFace } from "./AvatarFace";
import { ReactionBar } from "./ReactionBar";
import { ChatArt } from "./SpotArt";
import type { ReactionEmoji } from "../shared/avatars";

export function Chat({
  messages,
  onSend,
  onReact,
  disabled,
  localPeerId,
  typing = [],
  onTyping,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
  localPeerId?: string | null;
  typing?: Pick<TypingPeer, "peerId" | "nickname" | "avatarId">[];
  onTyping?: (typing: boolean) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing.length]);

  return (
    <section className="chat" aria-label="Party chat">
      <div className="messages" ref={listRef}>
        {messages.length === 0 && typing.length === 0 ? (
          <div className="chat-empty">
            <div className="storyboard">
              <ChatArt />
            </div>
            <p>Quiet in here. Say hi, or yell at the screen together.</p>
          </div>
        ) : null}
        {messages.map((msg) => {
          const you = Boolean(localPeerId && msg.from === localPeerId);
          const name = you ? "You" : msg.nickname;
          const when = formatChatTime(msg.sentAt);
          if (msg.kind === "playback") {
            return (
              <article className="msg is-playback" key={msg.id}>
                <AvatarFace avatarId={msg.avatarId} size={22} title={name} />
                <p>
                  <span className="who">{name}</span> {msg.text}
                  {when ? (
                    <time className="when" dateTime={new Date(msg.sentAt).toISOString()}>
                      {when}
                    </time>
                  ) : null}
                </p>
              </article>
            );
          }
          return (
            <article className={`msg${you ? " is-you" : ""}`} key={msg.id}>
              <AvatarFace avatarId={msg.avatarId} size={24} title={name} />
              <div>
                <div className="meta">
                  <span className="who">{name}</span>
                  {when ? (
                    <time className="when" dateTime={new Date(msg.sentAt).toISOString()}>
                      {when}
                    </time>
                  ) : null}
                </div>
                <div className="text">{msg.text}</div>
              </div>
            </article>
          );
        })}
        {typing.length ? (
          <div className="typing" role="status" aria-live="polite">
            <span className="typing-faces" aria-hidden="true">
              {typing.slice(0, 3).map((peer) => (
                <AvatarFace key={peer.peerId} avatarId={peer.avatarId} size={22} title={peer.nickname} />
              ))}
            </span>
            <span className="typing-bubble" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="typing-label">{typingLabel(typing.map((peer) => peer.nickname))}</span>
          </div>
        ) : null}
      </div>
      <ReactionBar disabled={disabled} onReact={onReact} />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const value = inputRef.current?.value.trim();
          if (!value) return;
          onSend(value);
          onTyping?.(false);
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        <label className="sr-only" htmlFor="chillax-chat">
          Message
        </label>
        <input
          id="chillax-chat"
          ref={inputRef}
          type="text"
          maxLength={500}
          placeholder="Say something cozy"
          disabled={disabled}
          onChange={(event) => onTyping?.(event.target.value.trim().length > 0)}
          onBlur={() => onTyping?.(false)}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
        />
        <button className="send" type="submit" disabled={disabled}>
          Send
        </button>
      </form>
    </section>
  );
}

function typingLabel(names: string[]) {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names[0]} and ${names.length - 1} others are typing`;
}
