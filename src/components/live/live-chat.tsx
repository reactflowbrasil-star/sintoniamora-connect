import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Smile } from "lucide-react";
import { useLive } from "@/components/live/live-provider";
import { LIVE_REACTIONS, type LiveReactionKind } from "@/lib/live/types";
import { cn } from "@/lib/utils";

/**
 * Live chat. Auto-scroll follows the newest message only while the reader is
 * already at the bottom; scrolling up parks the view and a pill offers the
 * pending messages instead of yanking the viewport.
 */
export function LiveChat() {
  const {
    chat,
    draft,
    setDraft,
    sendMessage,
    sendReaction,
    chatRef,
    handleChatScroll,
    jumpToLatest,
    unreadMessages,
    joined,
  } = useLive();

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);

  useEffect(() => {
    if (!reactionsOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!reactionsRef.current?.contains(event.target as Node)) setReactionsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [reactionsOpen, setReactionsOpen]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      void sendMessage(event);
    },
    [sendMessage],
  );

  if (!joined) return null;

  return (
    <section className="live-chat" aria-label="Chat da live">
      <header className="live-chat-header">
        <h2>
          <MessageCircle size={16} aria-hidden="true" />
          Chat
        </h2>
      </header>

      <div className="live-chat-scroll">
        <div
          ref={(node) => {
            chatRef.current = node;
            listRef.current = node;
          }}
          className="live-chat-messages"
          onScroll={handleChatScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
        >
          {chat.length === 0 ? (
            <p className="live-chat-empty">
              Nenhuma mensagem ainda. Seja a primeira pessoa a escrever.
            </p>
          ) : (
            chat.map((message) => (
              <article
                key={message.id}
                className={cn("live-chat-message", message.isOwn && "is-own")}
              >
                <b>{message.displayName || (message.isOwn ? "Você" : "Membro")}</b>
                <span>{message.body}</span>
                <time dateTime={message.createdAt.toISOString()}>
                  {message.createdAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            ))
          )}
        </div>

        {unreadMessages > 0 && (
          <button type="button" className="live-chat-jump" onClick={jumpToLatest}>
            ↓ {unreadMessages} nova{unreadMessages > 1 ? "s" : ""} mensagem{unreadMessages > 1 ? "ns" : ""}
          </button>
        )}
      </div>

      <div className="live-chat-footer">
        <div className="live-reaction-bar" ref={reactionsRef}>
          <button
            type="button"
            className="live-reaction-trigger"
            onClick={() => setReactionsOpen((open) => !open)}
            aria-expanded={reactionsOpen}
            aria-label="Enviar reação rápida"
          >
            <Smile size={18} aria-hidden="true" />
          </button>
          {reactionsOpen && (
            <div className="live-reaction-menu" role="group" aria-label="Reações rápidas">
              {LIVE_REACTIONS.map((reaction) => (
                <button
                  key={reaction.kind}
                  type="button"
                  className="live-reaction-option"
                  onClick={() => {
                    sendReaction(reaction.kind as LiveReactionKind);
                    setReactionsOpen(false);
                  }}
                  aria-label={reaction.label}
                >
                  <span aria-hidden="true">{reaction.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="live-chat-form" onSubmit={onSubmit}>
          <input
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Adicionar comentário…"
            maxLength={400}
            aria-label="Escrever no chat da live"
            autoComplete="off"
          />
          <button type="submit" className="live-chat-send" disabled={!draft.trim()} aria-label="Enviar mensagem">
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}