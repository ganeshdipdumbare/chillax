import { useEffect, useRef } from "react";
import type { ChatMessage } from "../shared/types";
import { AvatarFace } from "./AvatarFace";
import { ReactionBar } from "./ReactionBar";
import { PopcornArt } from "./SpotArt";
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
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="storyboard">
              <PopcornArt />
            </div>
            <p>First one to drop a 🍿 sets the vibe.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const you = Boolean(localPeerId && msg.from === localPeerId);
            const name = you ? "You" : msg.nickname;
            if (msg.kind === "playback") {
              return (
                <article className="msg is-playback" key={msg.id}>
                  <AvatarFace avatarId={msg.avatarId} size={22} title={name} />
                  <p>
                    <span className="who">{name}</span> {msg.text}
                  </p>
                </article>
              );
            }
            return (
              <article className="msg" key={msg.id}>
                <AvatarFace avatarId={msg.avatarId} size={28} title={name} />
                <div>
                  <div className="who">{name}</div>
                  <div className="text">{msg.text}</div>
                </div>
              </article>
            );
          })
        )}
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
