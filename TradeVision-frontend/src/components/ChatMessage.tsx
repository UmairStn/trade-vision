import type { ReactNode } from 'react';
import { WarningCircle, Robot, User, Wrench } from '@phosphor-icons/react';
import type { ChatMessage as ChatMessageData } from '../types/stock';
import { cn } from '../lib/cn';

/**
 * One chat bubble.
 *
 * WHY THERE IS A HAND-ROLLED FORMATTER HERE
 * Gemini writes in markdown — `**bold**` for figures, `*` bullets for lists — and
 * raw asterisks on screen look like a bug. Pulling in react-markdown for two
 * constructs would add a parser and a sanitiser to the bundle for no other
 * benefit, so bold and bullets are handled below and everything else renders as
 * plain text. Nothing here uses dangerouslySetInnerHTML: model output is
 * untrusted input, and it is only ever turned into React nodes.
 */

/** `**19.90**` -> a <strong> node. Leaves everything else alone. */
const renderInline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );

const BULLET = /^\s*[*-]\s+/;

/** Paragraphs and bullet lists. Blank lines separate blocks. */
const renderBlocks = (content: string): ReactNode[] => {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
        {bullets.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of content.split('\n')) {
    if (BULLET.test(line)) {
      bullets.push(line.replace(BULLET, ''));
      continue;
    }
    flushBullets();
    if (line.trim()) {
      blocks.push(
        <p key={`p${blocks.length}`} className="my-1">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();

  return blocks;
};

/** Round avatar beside a bubble. */
const Avatar = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'brand' | 'down' | 'neutral';
}) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
      tone === 'brand' && 'bg-brand-subtle text-brand-subtle-ink',
      tone === 'down' && 'bg-down-subtle text-down',
      tone === 'neutral' && 'border border-line bg-sunken text-ink-muted',
    )}
  >
    {children}
  </span>
);

export const ChatMessage = ({ message }: { message: ChatMessageData }) => {
  if (message.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-2">
        {/* `bg-brand text-on-brand`, not the old `bg-accent-green text-white`,
            which measured 2.28:1 in light mode and 1.74:1 in dark. */}
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-on-brand">
          {message.content}
        </div>
        <Avatar tone="neutral">
          <User className="h-4 w-4" />
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar tone={message.isError ? 'down' : 'brand'}>
        {message.isError ? (
          <WarningCircle className="h-4 w-4" />
        ) : (
          <Robot className="h-4 w-4" />
        )}
      </Avatar>

      <div className="min-w-0 max-w-[85%] space-y-2">
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm border px-4 py-2.5 text-sm leading-relaxed wrap-break-word',
            message.isError
              ? 'border-down/35 bg-down-subtle text-down'
              : 'glass text-ink-secondary',
          )}
        >
          {message.isError ? message.content : renderBlocks(message.content)}
        </div>

        {/* The assistant may not state a figure it did not fetch, so show what it
            fetched. This is the user's check on the answer, not decoration. */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {message.toolsUsed.map((tool, i) => (
              <li key={`${tool}-${i}`} className="min-w-0">
                <span
                  title="Live data this answer was built from"
                  className="inline-flex max-w-full items-center gap-1 rounded-sm border border-line bg-card px-2 py-0.5 font-mono text-xs text-ink-muted"
                >
                  <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tool}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {message.warnings && message.warnings.length > 0 && (
          <ul className="space-y-1">
            {message.warnings.map((warning, i) => (
              <li
                key={`${warning}-${i}`}
                className="flex items-start gap-1 text-xs text-warn"
              >
                <WarningCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
