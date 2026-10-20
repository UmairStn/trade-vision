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
    <div className="relative flex min-h-[calc(100dvh-var(--spacing-nav))] items-center justify-center overflow-hidden bg-linear-to-br from-ink via-[#0f1420] to-[#1a2035] px-4 py-16">
      {/* Giant decorative 404 */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center
                   text-[8rem] font-black text-gradient-brand opacity-20 select-none sm:text-[12rem]"
      >
        404
      </p>


      <div className="relative w-full max-w-2xl">
        <div className="glass rounded-2xl p-8 text-center elevated-pop sm:p-10">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full
                       bg-linear-to-br from-brand to-brand-hover text-on-brand"
          >
            <Compass className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-semibold tracking-widest text-ink-inverse/60 uppercase">
            Error 404
          </p>
          <h1 className="mt-2 text-h1 text-ink-inverse">This page doesn't exist</h1>
          <p className="mx-auto mt-3 max-w-md text-body text-ink-inverse/70">
            Nothing is served at{' '}
            <code className="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-sm text-ink-inverse">
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
              <div className="glass h-full rounded-xl p-4 transition-all duration-300 ease-out-quart hover:-translate-y-1 hover:elevated-pop">
                <div className="space-y-1">
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                  <p className="text-body font-semibold text-ink-inverse">{label}</p>
                  <p className="text-sm text-ink-inverse/60">{hint}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
