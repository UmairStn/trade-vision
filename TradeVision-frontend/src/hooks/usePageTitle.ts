import { useEffect } from 'react';

const BASE = 'TradeVision';

/**
 * Sets `document.title` per route. Every page shared the single static title
 * from index.html, so browser history and pinned tabs were indistinguishable.
 */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Colombo Stock Exchange Analytics`;
  }, [title]);
};
