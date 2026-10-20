import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Envelope, Lock, ShieldCheck, Key } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    // Sign up with Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else if (data.session) {
      // If email confirmations are turned off in Supabase, it returns a session immediately!
      navigate('/dashboard');
    } else {
      // Email confirmation is required
      setIsVerifying(true);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
    } else {
      navigate('/dashboard');
    }
  };

  // Simple password strength indicator
  const getStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    if (pass.length < 6) return 1; // weak
    if (pass.length < 10) return 2; // medium
    return 3; // strong
  };
  const strength = getStrength(password);

  const inputClass =
    'w-full rounded-xl border border-line bg-sunken py-2.5 text-ink ' +
    'transition-[border-color,box-shadow] duration-150 ease-out-quart ' +
    'placeholder:text-ink-muted ' +
    'focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none';

  const submitClass =
    'w-full rounded-xl bg-brand py-3 font-semibold text-on-brand ' +
    'transition-[background-color,transform] duration-150 ease-out-quart ' +
    'hover:bg-brand-hover active:translate-y-px ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
    'disabled:pointer-events-none disabled:opacity-50';

  return (
    <div className="bg-page relative flex min-h-[calc(100dvh-var(--spacing-nav))] items-center justify-center p-4 py-12">


      <div className="bg-card elevated-pop relative w-full max-w-md rounded-2xl p-8 border border-line">
        <div className="relative z-10 mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            {isVerifying ? <Key className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}
          </div>
          <h1 className="text-h2 font-bold text-ink">
            {isVerifying ? 'Verify your email' : 'Create an account'}
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            {isVerifying
              ? 'We sent an 8-digit code to your email.'
              : 'Start predicting CSE trends today'}
          </p>
        </div>

        {isVerifying ? (
          <form onSubmit={handleVerify} className="relative z-10 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-l-4 border-l-danger border-danger/20 bg-danger-subtle px-3 py-2.5 text-center text-sm text-danger"
              >
                {error}
              </div>
            )}
            <div>
              <label htmlFor="otp" className="mb-1 block text-sm font-medium text-ink">
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${inputClass} px-4 text-center font-mono text-xl tracking-[0.5em]`}
                placeholder="--------"
                maxLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className={`${submitClass} mt-4`}>
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-l-4 border-l-danger border-danger/20 bg-danger-subtle px-3 py-2.5 text-center text-sm text-danger"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Full name
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${inputClass} pr-4 pl-10`}
                  placeholder="Kasun Perera"
                />
              </div>
            </div>

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
                  className={`${inputClass} pr-4 pl-10`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-4 pl-10`}
                  placeholder="Create a strong password"
                />
              </div>
              {/* Strength meter — gradient fills per segment */}
              {password.length > 0 && (
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${strength >= 1 ? 'bg-down' : 'bg-line'}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${strength >= 2 ? 'bg-warn' : 'bg-line'}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${strength >= 3 ? 'bg-up' : 'bg-line'}`} />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-ink">
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${inputClass} pr-4 pl-10`}
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={`${submitClass} mt-2`}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        {!isVerifying && (
          <p className="relative z-10 mt-6 text-center text-sm text-ink-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-ink transition-colors duration-150 hover:text-brand"
            >
              Log in →
            </Link>
          </p>
        )}


      </div>
    </div>
  );
};

