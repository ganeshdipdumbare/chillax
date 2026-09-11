import { useEffect, useRef } from "react";
import type { ChatMessage } from "../shared/types";
import { AvatarFace } from "./AvatarFace";
import { ReactionBar } from "./ReactionBar";
import type { ReactionEmoji } from "../shared/avatars";

export function Chat({
  messages,
  onSend,
  onReact,
  disabled,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
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
          <p className="status">First one to drop a 🍿 sets the vibe.</p>
        ) : (
          messages.map((msg) => (
            <article className="msg" key={msg.id}>
              <AvatarFace avatarId={msg.avatarId} size={28} title={msg.nickname} />
              <div>
                <div className="who">{msg.nickname}</div>
                <div className="text">{msg.text}</div>
              </div>
            </article>
          ))
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
        />
        <button className="send" type="submit" disabled={disabled}>
          Send
        </button>
      </form>
    </section>
  );
}
