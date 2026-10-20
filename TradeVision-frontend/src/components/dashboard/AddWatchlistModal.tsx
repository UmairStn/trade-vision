import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { addToWatchlist } from '../../services/api';
import { Button, Modal, ModalClose, Notice } from '../ui';
import { SymbolSearch } from '../SymbolSearch';

/**
 * Add one symbol to the watchlist.
 *
 * `overflowVisible` is set here but not on the trade dialog: this body is a single
 * field, so the combobox popup can spill past the card without anything needing to
 * scroll. The trade form is five fields tall and keeps a scrollable body instead.
 */
export const AddWatchlistModal = ({
  open,
  onOpenChange,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tickers already on the watchlist, to catch a duplicate before the request. */
  existing: string[];
  onSaved: () => void;
}) => {
  const formId = useId();
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymbol('');
    setError(null);
    setFailure(null);
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!symbol) {
      setError('Pick a listed CSE symbol.');
      return;
    }
    if (existing.includes(symbol)) {
      // The old code sent the request anyway and reported the rejection as
      // `alert('Maybe it already exists?')` — a guess, in a blocking dialog.
      setError(`${symbol} is already on your watchlist.`);
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      await addToWatchlist(symbol);
      toast.success(`${symbol} added to your watchlist`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'The symbol could not be added.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add to watchlist"
      description="Watchlist symbols show a live price and day change."
      overflowVisible
      footer={
        <>
          <ModalClose asChild>
            <Button variant="ghost">Cancel</Button>
          </ModalClose>
          <Button type="submit" form={formId} loading={submitting} loadingText="Adding…">
            Add symbol
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        {failure && (
          <Notice tone="error" title="Could not add the symbol" className="mb-4">
            {failure}
          </Notice>
        )}
        <SymbolSearch
          label="Symbol"
          showLabel
          required
          error={error}
          onSelect={(quote) => {
            setSymbol(quote.ticker);
            setError(null);
          }}
        />
      </form>
    </Modal>
  );
};
