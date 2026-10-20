import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion`.
 *
 * index.css has a global CSS kill switch, but Recharts animates in JavaScript by
 * setting inline styles frame by frame, so CSS can't stop it — the duration has
 * to be zeroed at the source.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
};
