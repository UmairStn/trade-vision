import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChartLine, Envelope, Lock } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-page relative flex min-h-[calc(100dvh-var(--spacing-nav))] items-center justify-center p-4">

      <div className="bg-card elevated-pop relative w-full max-w-md rounded-2xl p-8 border border-line">
        <div className="relative z-10 mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ChartLine className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-h2 font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Log in to your TradeVision account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-l-4 border-l-danger border-danger/20 bg-danger-subtle px-3 py-2.5 text-center text-sm text-danger"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email address
            </label>
            <div className="relative">
              <Envelope
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line bg-sunken py-2.5 pr-4 pl-10 text-ink
                           transition-[border-color,box-shadow] duration-150 ease-out-quart
                           placeholder:text-ink-muted
                           focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <span className="text-xs text-ink-muted" aria-hidden="true">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-line bg-sunken py-2.5 pr-4 pl-10 text-ink
                           transition-[border-color,box-shadow] duration-150 ease-out-quart
                           placeholder:text-ink-muted
                           focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="rounded border-line bg-sunken text-brand focus:ring-brand/40"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-ink-secondary">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-on-brand
                       transition-[background-color,transform] duration-150 ease-out-quart
                       hover:bg-brand-hover active:translate-y-px
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                       disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="relative z-10 mt-6 text-center text-sm text-ink-secondary">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-brand-ink transition-colors duration-150 hover:text-brand"
          >
            Get started →
          </Link>
        </p>


      </div>
    </div>
  );
};
