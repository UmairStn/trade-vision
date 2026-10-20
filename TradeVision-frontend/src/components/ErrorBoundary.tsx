import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

/**
 * Catches render errors so a single bad component doesn't blank the whole app.
 *
 * Without this, an exception inside e.g. the chart's tooltip formatter unmounts
 * the entire tree and leaves a white page with nothing but a console message.
 *
 * Still a class component: `componentDidCatch` has no hook equivalent.
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error-reporting service is wired up, so the console is the only sink.
    // Keeping the component stack makes the trace usable in a production build.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <Card className="w-full max-w-lg">
          <CardBody className="space-y-4 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-down-subtle text-down">
              <Warning className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-h2 text-ink">Something broke on this page</h1>
              <p className="mt-2 text-body text-ink-muted">
                The rest of TradeVision is fine — reloading usually clears it.
              </p>
            </div>
            <pre className="max-h-32 overflow-auto rounded-md bg-sunken px-3 py-2 text-left text-sm wrap-break-word whitespace-pre-wrap text-ink-muted">
              {error.message}
            </pre>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => window.location.reload()}
                leftIcon={<ArrowCounterClockwise className="h-4 w-4" aria-hidden="true" />}
              >
                Reload page
              </Button>
              <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>
                Back to home
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
}
