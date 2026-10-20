import { Robot, Newspaper, MagnifyingGlass, TrendUp } from '@phosphor-icons/react';
import { ChatPanel } from '../components/ChatPanel';
import { useChat } from '../context/ChatContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { Notice, PageHeader, PageShell } from '../components/ui';

/**
 * Full-page chat. Same conversation as the floating widget — both read
 * ChatContext — so switching between them mid-thread loses nothing.
 */

const CAPABILITIES = [
  {
    icon: TrendUp,
    title: 'Live market data',
    body: "Prices, gainers, losers and the ASPI, read from the CSE's own API when you ask.",
  },
  {
    icon: Robot,
    title: 'Model predictions',
    body: 'Next-day direction from the XGBoost model, with its probability and the date it was computed for.',
  },
  {
    icon: Newspaper,
    title: 'News sentiment',
    body: 'FinBERT over recent headlines — requested only when you ask about news, since scraping is slow.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Company lookup',
    body: 'Name a company and it finds the ticker across all listed CSE securities.',
  },
];

export const Chat = () => {
  const { isAvailable } = useChat();
  usePageTitle('AI Chat');

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-subtle-ink">
            <span
              className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <Robot className="h-3.5 w-3.5" aria-hidden="true" />
            TradeVision AI
          </span>
        }
        title="Ask about the Colombo Stock Exchange"
        description="Answers are built from live data fetched during the conversation, not from the model's training set."
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        {/* The conversation gets its own scroll container so the composer stays
            reachable without scrolling the page. Height comes off `--spacing-nav`
            rather than a hardcoded `19rem` guess at the header's size. */}
        <div className="flex h-[calc(100dvh-var(--spacing-nav)-14rem)] min-h-112 flex-col overflow-hidden border border-line bg-page lg:col-span-2">
          <ChatPanel variant="page" />
        </div>

        {/* Capability list. Deliberately concrete: a chat box with no stated
            limits invites questions it cannot answer, like intraday history or
            anything outside the CSE. */}
        <aside className="space-y-12">
          <div>
            <h2 className="text-h3 font-medium tracking-tight text-ink">What it can reach</h2>
            <ul className="mt-6 space-y-6">
              {CAPABILITIES.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-sunken text-ink"
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-line pt-12">
            <h2 className="text-h3 font-medium tracking-tight text-ink">Worth knowing</h2>
            <ul className="mt-6 list-outside list-disc space-y-3 pl-4 text-sm leading-relaxed text-ink-muted">
              <li>
                Live prices come from the CSE. Predictions are computed from Yahoo
                history, which has stopped updating for many CSE symbols — so a
                prediction can be months old while the price beside it is current.
                The assistant reports the date; take it seriously.
              </li>
              <li>
                A question about news triggers a live scrape plus FinBERT and can
                take up to a minute the first time.
              </li>
              <li>Nothing here is financial advice.</li>
            </ul>
          </div>

          {!isAvailable && (
            <Notice tone="warn" title="Chat is unconfigured on the server">
              The composer is disabled until an API key is set, so nothing you type
              would be sent.
            </Notice>
          )}
        </aside>
      </div>
    </PageShell>
  );
};
