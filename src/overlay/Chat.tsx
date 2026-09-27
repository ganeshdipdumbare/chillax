import { useEffect, useRef } from "react";
import type { ChatMessage } from "../shared/types";
import { formatChatTime } from "../shared/time";
import { AvatarFace } from "./AvatarFace";
import { ReactionBar } from "./ReactionBar";
import type { ReactionEmoji } from "../shared/avatars";

export function Chat({
  messages,
  onSend,
  onReact,
  disabled,
  localPeerId,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
  localPeerId?: string | null;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section className="chat" aria-label="Party chat">
      <div className="messages" ref={listRef}>
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
      </div>
      <ReactionBar disabled={disabled} onReact={onReact} />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const value = inputRef.current?.value.trim();
          if (!value) return;
          onSend(value);
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
