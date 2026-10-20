import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Robot, ArrowsOut, ChatCircle, X } from '@phosphor-icons/react';
import { ChatPanel } from './ChatPanel';
import { useChat } from '../context/ChatContext';

/**
 * Floating chat, available on every page except /chat itself.
 *
 * The symbol context is read from the URL rather than from StockContext, because
 * the URL is where the analyzer actually keeps the selected ticker
 * (`/analyzer?ticker=JKH.N0000`). Reading it here means "should I buy this?"
 * resolves to the stock on screen, and resolves to nothing when there isn't one —
 * which is the honest answer on the home page.
 *
 * Deliberately *not* a Radix Dialog: a dialog traps focus and blocks the page
 * behind it, and the point of a docked assistant is that you can keep reading the
 * page while it's open. So the three dialog behaviours worth having are wired by
 * hand — Escape closes, the composer takes focus on open, and focus returns to the
 * launcher on close — without the modality that would come with them.
 */
export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { messages, isAvailable } = useChat();

  const launcherRef = useRef<HTMLButtonElement>(null);
  // Only steal focus back when *we* closed the panel. A route change that
  // unmounts it shouldn't yank focus to a launcher the user never touched.
  const returnFocus = useRef(false);

  useEffect(() => {
    if (isOpen || !returnFocus.current) return;
    returnFocus.current = false;
    launcherRef.current?.focus();
  }, [isOpen]);

  const close = () => {
    returnFocus.current = true;
    setIsOpen(false);
  };

  // Two chats on one screen would share state and fight over scroll position.
  if (location.pathname === '/chat') return null;

  const symbol =
    location.pathname === '/analyzer'
      ? searchParams.get('ticker') ?? undefined
      : undefined;

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen(true)}
        title="Ask TradeVision AI"
        aria-label="Open AI chat"
        aria-expanded={false}
        className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl
                   bg-linear-to-br from-brand to-brand-hover text-on-brand
                   transition-transform duration-150 ease-out-quart
                   motion-safe:hover:scale-105 motion-safe:active:scale-95
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                   sm:right-6 sm:bottom-6"
      >
        <ChatCircle className="relative h-6 w-6" aria-hidden="true" />
        {/* Unread-ish marker: the conversation is still there after closing, so
            hint that reopening resumes rather than starts over. */}
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-semibold text-page">
            <span className="sr-only">{messages.length} messages in this conversation</span>
            <span aria-hidden="true">{messages.length > 9 ? '9+' : messages.length}</span>
          </span>
        )}
      </button>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="TradeVision AI chat"
      onKeyDown={onKeyDown}
      className="glass fixed right-4 bottom-4 z-50 flex h-128 max-h-[calc(100dvh-6rem)]
                 w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl elevated-pop
                 animate-scale-in sm:right-6 sm:bottom-6 sm:w-96"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-linear-to-r from-brand-subtle to-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md
                       bg-linear-to-br from-brand to-brand-hover text-on-brand"
          >
            <Robot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-tight font-semibold text-ink">TradeVision AI</p>
            <p className="truncate text-xs text-ink-muted">
              {!isAvailable ? 'Unavailable' : symbol ? `Context: ${symbol}` : 'Live CSE data'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* The thread lives in ChatContext, so the full page picks it up mid-
              conversation instead of starting a second one. */}
          <Link
            to="/chat"
            onClick={() => setIsOpen(false)}
            title="Open full page"
            aria-label="Open the full chat page"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150
                       hover:bg-card hover:text-ink
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ArrowsOut className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={close}
            title="Close"
            aria-label="Close AI chat"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150
                       hover:bg-card hover:text-ink
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatPanel variant="widget" symbol={symbol} autoFocus />
      </div>
    </div>
  );
};
