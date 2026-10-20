import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { PaperPlaneRight, Sparkle, Trash } from '@phosphor-icons/react';
import { useChat } from '../context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { Button, Notice } from './ui';
import { cn } from '../lib/cn';

/**
 * The conversation body, shared by the floating widget and the /chat page.
 *
 * `variant` controls sizing only — both surfaces read the same messages from
 * ChatContext, so a thread started in the widget continues on the page.
 */

interface ChatPanelProps {
  variant?: 'widget' | 'page';
  /** Ticker the user is looking at, forwarded so "this stock" resolves. */
  symbol?: string;
  /** Focus the composer on mount. Set by the widget, which opens on demand. */
  autoFocus?: boolean;
}

const STARTERS = [
  "Who are today's top gainers?",
  'How is the market doing?',
  'What is JKH trading at?',
  'Give me the outlook for COMB.N0000',
];

export const ChatPanel = ({
  variant = 'page',
  symbol,
  autoFocus = false,
}: ChatPanelProps) => {
  const {
    messages,
    isSending,
    error,
    isAvailable,
    unavailableReason,
    sendMessage,
    clearChat,
  } = useChat();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follow the conversation as it grows, including while a reply is pending so
  // the typing indicator stays visible.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Grow with the draft up to ~5 lines, then scroll. `rows={1}` alone gives a
  // one-line box that hides the start of a three-line question — a textarea
  // doesn't auto-size, so the height has to be set from `scrollHeight`.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  const submit = useCallback(
    (text: string) => {
      if (!text.trim() || isSending) return;
      setDraft('');
      void sendMessage(text, symbol);
    },
    [isSending, sendMessage, symbol],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter newlines — the convention every chat UI uses.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  };

  const isPage = variant === 'page';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* `role="log"` with `aria-live` so a screen reader hears the reply arrive
          without the user having to go looking for it. */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
        className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto', isPage ? 'p-6' : 'p-4')}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span
              aria-hidden="true"
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink"
            >
              <Sparkle className="h-6 w-6" />
            </span>
            <h3 className="text-h3 font-semibold text-ink">Ask about the CSE</h3>
            <p className="mt-2 mb-6 max-w-sm text-sm text-ink-muted">
              Every figure comes from live Colombo Stock Exchange data or the
              TradeVision model — never from the assistant's memory.
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <li key={starter}>
                  <button
                    type="button"
                    onClick={() => submit(starter)}
                    disabled={!isAvailable || isSending}
                    className="rounded-md border border-line bg-sunken px-3 py-1.5 text-xs font-medium text-ink-secondary
                               transition-colors duration-150 ease-out-quart
                               hover:border-brand/50 hover:text-brand-ink
                               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                               disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-secondary"
                  >
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}

        {isSending && (
          <p className="flex items-center gap-2 pl-10 text-sm text-ink-muted">
            {/* Three staggered bouncing dots — the conventional "typing" signal. */}
            <span className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            {/* A question about news triggers a scrape plus FinBERT, which is
                genuinely slow. Say so rather than let it look frozen. */}
            <span>Checking live market data…</span>
          </p>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className={cn('border-t border-line bg-card', isPage ? 'p-4' : 'p-3')}>
        {!isAvailable && (
          <Notice tone="warn" className="mb-3">
            {unavailableReason ?? 'AI chat is not available right now.'}
          </Notice>
        )}

        {/* The failed turn is already in the thread as an error bubble; this is
            the banner for the composer, so only show it when it adds something. */}
        {error && isAvailable && (
          <Notice tone="error" className="mb-3">
            {error}
          </Notice>
        )}

        <div className="flex items-end gap-2">
          <label htmlFor={`chat-composer-${variant}`} className="sr-only">
            Message TradeVision AI
          </label>
          <textarea
            id={`chat-composer-${variant}`}
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!isAvailable}
            rows={1}
            placeholder={
              isAvailable
                ? symbol
                  ? `Ask about ${symbol}…`
                  : 'Ask about any CSE stock…'
                : 'AI chat is unavailable'
            }
            // Not `inputClass()`: that helper pins `h-11` and `text-body`, both
            // wrong for a composer that has to grow — and `cn` is clsx-lite, so a
            // conflicting utility passed in wouldn't reliably win. Same focus
            // treatment, spelled out.
            className="min-h-10 w-full flex-1 resize-none overflow-y-auto rounded-md border border-line
                       bg-sunken px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted
                       transition-[border-color,box-shadow] duration-150 ease-out-quart
                       focus:border-brand focus:ring-2 focus:ring-brand/40 focus:outline-none
                       disabled:cursor-not-allowed disabled:opacity-60"
          />

          {messages.length > 0 && (
            <Button
              variant="ghost"
              onClick={clearChat}
              aria-label="Clear conversation"
              title="Clear conversation"
              className="shrink-0 text-ink-muted hover:text-down"
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}

          <Button
            onClick={() => submit(draft)}
            disabled={!draft.trim() || !isAvailable}
            loading={isSending}
            leftIcon={<PaperPlaneRight className="h-4 w-4" aria-hidden="true" />}
            aria-label="Send message"
            title="Send"
            className="shrink-0 rounded-full bg-linear-to-br from-brand to-brand-hover"
          />
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          Model output, not financial advice. Predictions can be based on older price
          data — check the date the assistant quotes.
        </p>
      </div>
    </div>
  );
};
