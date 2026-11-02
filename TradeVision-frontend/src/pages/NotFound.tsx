import { Link, useLocation } from 'react-router-dom';
import { ChartBar, Compass, House as HomeIcon, ChartLine } from '@phosphor-icons/react';
import { buttonClass } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * An unknown URL used to render the navbar and footer around an empty <main>,
 * which looks like a data-loading failure rather than a wrong address.
 */
const suggestions = [
  { to: '/', label: 'Home', hint: 'Market overview and movers', icon: HomeIcon },
  { to: '/top-stocks', label: 'Top stocks', hint: 'Gainers, losers, most active', icon: ChartBar },
  { to: '/analyzer', label: 'Analyzer', hint: 'Charts and forecasts per symbol', icon: ChartLine },
];

export const NotFound = () => {
  const { pathname } = useLocation();
  usePageTitle('Page not found');

  return (
    <div className="relative flex min-h-[calc(100dvh-var(--spacing-nav))] items-center justify-center overflow-hidden bg-page px-4 py-16">
      {/* Giant decorative 404 — brand tint, no dark theme flip. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center
                   text-[6rem] font-black text-brand opacity-10 select-none sm:text-[9rem]"
      >
        404
      </p>

      <div className="relative w-full max-w-2xl">
        <div className="rounded-xl border border-line bg-card p-8 elevated text-center sm:p-10">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl
                       bg-brand-subtle text-brand-subtle-ink"
          >
            <Compass className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-semibold tracking-widest text-ink-muted uppercase">
            Error 404
          </p>
          <h1 className="mt-2 text-h1 text-ink">This page doesn't exist</h1>
          <p className="mx-auto mt-3 max-w-md text-body text-ink-secondary">
            Nothing is served at{' '}
            <code className="rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-sm text-ink">
              {pathname}
            </code>
            . It may have moved, or the link may be mistyped.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className={buttonClass({
                size: 'lg',
              })}
            >
              Back to home
            </Link>
            <Link
              to="/top-stocks"
              className={buttonClass({
                variant: 'ghost',
                size: 'lg',
              })}
            >
              Browse the market
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {suggestions.map(({ to, label, hint, icon: Icon }) => (
            <Link key={to} to={to} className="rounded-xl">
              <div className="border border-line bg-card p-4 transition-all duration-200 hover:elevated-pop hover:border-line-strong">
                <div className="space-y-1">
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                  <p className="text-body font-semibold text-ink">{label}</p>
                  <p className="text-sm text-ink-muted">{hint}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
