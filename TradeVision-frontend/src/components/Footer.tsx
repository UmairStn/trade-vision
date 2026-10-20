import { Link } from 'react-router-dom';
import { ChartLine, Warning } from '@phosphor-icons/react';

/**
 * Collapsed from four columns to three.
 *
 * The previous footer carried nine `href="#"` links (Documentation, API
 * Reference, Market News, Help Center, Contact Sales, Partnerships, Privacy,
 * Terms, Disclaimer), three dead social icons and a support address that does not
 * exist. On a live deploy those are the clearest signal that a site is
 * unfinished, so the rule here is: every link goes somewhere real, and anything
 * that doesn't exist isn't listed. What's left is the disclaimer and the data
 * provenance — both of which are genuinely worth saying.
 */

const PLATFORM_LINKS = [
  { to: '/analyzer', label: 'Stock Analyzer' },
  { to: '/top-stocks', label: 'Top Movers' },
  { to: '/chat', label: 'AI Chat' },
  { to: '/dashboard', label: 'Dashboard' },
] as const;

export const Footer = () => (
  <footer className="mt-auto bg-card border-t border-line">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Plain border replaces gradient hairline */}
      <div aria-hidden="true" className="h-px bg-line" />
      <div className="py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1.5fr]">
          <div>
            <Link
              to="/"
              className="group inline-flex items-center gap-2 rounded-md
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-sm
                           bg-brand text-on-brand"
              >
                <ChartLine className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-bold tracking-tight text-ink">TradeVision</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Machine-learning price forecasts and AI research for the Colombo Stock
              Exchange.
            </p>
          </div>

          <nav aria-labelledby="footer-platform">
            <h2 id="footer-platform" className="text-sm font-semibold text-ink">
              Platform
            </h2>
            <ul className="mt-3 space-y-2">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded-sm text-sm text-ink-muted transition-colors duration-150
                               hover:text-brand-ink
                               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Warning className="h-4 w-4 text-warn" aria-hidden="true" />
              Before you trade on this
            </h2>
            <div className="mt-3 border-l-2 border-l-warn pl-3">
              <p className="text-sm text-ink-muted">
                TradeVision is a student project, not a licensed advisory service.
                Forecasts are statistical estimates and can be wrong. Nothing here is
                financial advice — verify every figure against the CSE before acting on
                it.
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Market data via the Colombo Stock Exchange and Yahoo Finance. Prices may
                be delayed, and some CSE symbols are no longer updated upstream.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright band */}
      <div className="rounded-md bg-sunken px-4 py-3">
        <p className="text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} TradeVision. Educational prototype.
        </p>
      </div>
    </div>
  </footer>
);
