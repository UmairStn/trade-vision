import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { SquaresFour, ChartLine, SignOut, List as MenuIcon, ChatCircleText, X } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { buttonClass } from './ui/Button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from './ui/Menu';
import { cn } from '../lib/cn';
import { displayName } from '../lib/user';

const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Analyzer', path: '/analyzer' },
  { name: 'Top Stocks', path: '/top-stocks' },
  { name: 'News & Signals', path: '/news' },
  { name: 'AI Chat', path: '/chat' },
  { name: 'Dashboard', path: '/dashboard' },
] as const;

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Radix closes on Escape and on outside click, but not on a route change that
  // the sheet itself didn't trigger (a browser back, say).
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const name = user ? displayName(user.user_metadata, user.email) : '';
  const initial = name.charAt(0).toUpperCase() || '?';

  return (
    <header
      className="sticky top-4 z-40 mx-auto w-max max-w-[calc(100vw-2rem)] rounded-full border border-line bg-page/90
                 elevated-pop backdrop-blur-xl"
    >
      <nav aria-label="Main" className="relative flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-md
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full
                       bg-brand text-on-brand"
          >
            <ChartLine className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-h3 font-bold tracking-tight text-ink">TradeVision</span>
        </Link>

        {/* Desktop links. The active indicator is a compact brand pill — colour
            alone marked the active link before, which is also why it borrowed
            the market-green. */}
        <ul className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-9 items-center rounded-full px-3 text-sm font-medium',
                    'transition-colors duration-150 ease-out-quart',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                    isActive
                      ? 'bg-brand-subtle text-brand-subtle-ink'
                      : 'text-ink-secondary hover:text-brand-ink',
                  )
                }
              >
                {link.name}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <div className="hidden md:block">
              <Menu>
                <MenuTrigger
                  className="flex items-center gap-2 rounded-md p-1 pr-2 text-sm font-medium text-ink
                             transition-colors duration-150 hover:bg-sunken
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                             data-[state=open]:bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full
                               bg-linear-to-br from-brand to-brand-hover text-xs font-semibold text-on-brand
                               ring-2 ring-brand/40 ring-offset-1 ring-offset-page"
                  >
                    {initial}
                  </span>
                  <span className="max-w-32 truncate">{name}</span>
                </MenuTrigger>
                <MenuContent>
                  <MenuLabel>
                    <p className="text-sm font-medium text-ink">{name}</p>
                    {user.email && (
                      <p className="truncate text-xs text-ink-muted">{user.email}</p>
                    )}
                  </MenuLabel>
                  <MenuSeparator />
                  <MenuItem asChild>
                    <Link to="/dashboard">
                      <SquaresFour className="h-4 w-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </MenuItem>
                  <MenuItem asChild>
                    <Link to="/chat">
                      <ChatCircleText className="h-4 w-4" aria-hidden="true" />
                      AI Chat
                    </Link>
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem tone="danger" onSelect={() => void signOut()}>
                    <SignOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </MenuItem>
                </MenuContent>
              </Menu>
            </div>
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <Link to="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                Log in
              </Link>
              <Link to="/register" className={buttonClass({ size: 'sm' })}>
                Get started
              </Link>
            </div>
          )}

          {/* Mobile sheet. A Radix Dialog rather than a conditional div, so it
              traps focus, closes on Escape, locks page scroll and returns focus
              to the trigger — none of which the previous markup did. */}
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary
                         transition-colors duration-150 hover:bg-sunken hover:text-ink
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                         md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MenuIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-inverse/40 backdrop-blur-sm data-[state=open]:animate-fade-in md:hidden" />
              <Dialog.Content
                className="fixed inset-x-0 top-nav z-50 max-h-[calc(100dvh-var(--spacing-nav))]
                           overflow-y-auto glass elevated-pop
                           data-[state=open]:animate-slide-down md:hidden"
              >
                <Dialog.Title className="sr-only">Site menu</Dialog.Title>
                <ul className="space-y-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.path}>
                      <Dialog.Close asChild>
                        <NavLink
                          to={link.path}
                          end={link.path === '/'}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium',
                              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                              isActive
                                ? 'bg-brand-subtle text-brand-subtle-ink'
                                : 'text-ink-secondary hover:bg-sunken hover:text-ink',
                            )
                          }
                        >
                          {link.name}
                        </NavLink>
                      </Dialog.Close>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 border-t border-line pt-4">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-1">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 items-center justify-center rounded-full
                                     bg-linear-to-br from-brand to-brand-hover text-sm font-semibold text-on-brand
                                     ring-2 ring-brand/40 ring-offset-1 ring-offset-page"
                        >
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{name}</p>
                          {user.email && (
                            <p className="truncate text-xs text-ink-muted">{user.email}</p>
                          )}
                        </div>
                      </div>
                      <Dialog.Close
                        onClick={() => void signOut()}
                        className={buttonClass({ variant: 'secondary', fullWidth: true })}
                      >
                        <SignOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </Dialog.Close>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Dialog.Close asChild>
                        <Link
                          to="/login"
                          className={buttonClass({ variant: 'secondary', fullWidth: true })}
                        >
                          Log in
                        </Link>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <Link to="/register" className={buttonClass({ fullWidth: true })}>
                          Get started
                        </Link>
                      </Dialog.Close>
                    </div>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  );
};
