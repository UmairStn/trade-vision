import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageShell } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

/**
 * Session gate.
 *
 * The loading state used to be `bg-gray-900` with a `border-blue-500` spinner —
 * off-brand in both themes and a full-viewport dark flash on every protected
 * route in light mode. It now renders a branded skeleton on the page surface,
 * shaped like the dashboard that follows so the layout doesn't jump when the
 * session resolves.
 */
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <PageShell>
        {/* Not aria-hidden: a screen reader needs to know why nothing is here
            yet. The skeleton bars themselves are hidden by the Skeleton
            component, so this announces once instead of narrating the shapes. */}
        <div role="status" aria-live="polite">
          <span className="sr-only">Checking your session…</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </Card>
          ))}
        </div>
        <Card className="mt-6 p-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!user) {
    // `state` lets the login page send the user back where they were headed
    // instead of dumping everyone on the dashboard.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
