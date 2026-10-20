import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DownloadSimple, UploadSimple, Trash } from '@phosphor-icons/react';
import type { PortfolioHolding, PortfolioTransaction } from '../../types/stock';
import { addToPortfolio, removeFromPortfolio } from '../../services/api';
import { formatDate, formatInt, formatPrice } from '../../lib/format';
import {
  Badge,
  Button,
  DataTable,
  Delta,
  Modal,
  Stat,
} from '../ui';
import type { Column } from '../ui';

/**
 * Every trade behind one position, and the only place a trade can be deleted.
 *
 * Two fixes over the previous inline version:
 *
 *  - **The holding is derived, not copied.** The old dialog kept its own copy of
 *    the transaction list and hand-patched it after each delete, then closed
 *    itself when the copy hit zero. This reads the holding straight from the
 *    page's portfolio state, so the two can't disagree.
 *  - **A delete can be undone.** `removeFromPortfolio` is irreversible on the
 *    backend, but a transaction is fully described by its symbol, shares, price
 *    and date, so re-posting it restores the position exactly. That is a better
 *    guard than a confirmation step nobody reads — and better than the old
 *    behaviour, which deleted on the first click with no warning at all.
 */

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10));

export const HoldingDetailsModal = ({
  open,
  onOpenChange,
  holding,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: PortfolioHolding | null;
  onChanged: () => void;
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const ticker = holding?.ticker ?? '';

  // Deleting the last trade removes the holding from the portfolio entirely, at
  // which point there is nothing left for this dialog to show.
  useEffect(() => {
    if (open && !holding) onOpenChange(false);
  }, [open, holding, onOpenChange]);

  const restore = async (t: PortfolioTransaction, symbol: string) => {
    try {
      await addToPortfolio(symbol, t.shares, t.price, t.dateAcquired.slice(0, 10));
      onChanged();
      toast.success('Transaction restored');
    } catch (err) {
      toast.error('Could not restore the transaction', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const remove = async (t: PortfolioTransaction, symbol: string) => {
    setBusyId(t.id);
    try {
      await removeFromPortfolio(t.id);
      onChanged();
      toast.success(
        `Removed a ${t.shares >= 0 ? 'buy' : 'sale'} of ${formatInt(Math.abs(t.shares))} ${symbol}`,
        {
          // `dateAcquired` is `'N/A'` for rows the backend stored without one, and
          // re-posting that string would fail — so undo is only offered when the
          // trade can actually be reconstructed.
          action: isIsoDate(t.dateAcquired)
            ? { label: 'Undo', onClick: () => void restore(t, symbol) }
            : undefined,
          description: isIsoDate(t.dateAcquired)
            ? undefined
            : 'This trade has no recorded date, so it cannot be restored.',
        },
      );
    } catch (err) {
      toast.error('Could not remove the transaction', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<PortfolioTransaction>[] = [
    {
      id: 'type',
      header: 'Type',
      primary: true,
      mobile: 'title',
      cell: (t) =>
        // Deliberately not the up/down tones: a buy is not a price rise, and
        // those two colours are reserved for market direction across the app.
        t.shares >= 0 ? (
          <Badge tone="brand" icon={<DownloadSimple className="h-3 w-3" aria-hidden="true" />}>
            Buy
          </Badge>
        ) : (
          <Badge tone="outline" icon={<UploadSimple className="h-3 w-3" aria-hidden="true" />}>
            Sell
          </Badge>
        ),
    },
    {
      id: 'date',
      header: 'Date',
      mobile: 'subtitle',
      sortBy: (t) => (isIsoDate(t.dateAcquired) ? t.dateAcquired : null),
      cell: (t) => (isIsoDate(t.dateAcquired) ? formatDate(t.dateAcquired) : '—'),
    },
    {
      id: 'shares',
      header: 'Shares',
      numeric: true,
      sortBy: (t) => Math.abs(t.shares),
      cell: (t) => formatInt(Math.abs(t.shares)),
    },
    {
      id: 'price',
      header: 'Price',
      numeric: true,
      sortBy: (t) => t.price,
      cell: (t) => `Rs ${formatPrice(t.price)}`,
    },
    {
      id: 'total',
      header: 'Consideration',
      numeric: true,
      mobile: 'value',
      sortBy: (t) => Math.abs(t.shares) * t.price,
      cell: (t) => (
        <span className="font-medium text-ink">
          Rs {formatPrice(Math.abs(t.shares) * t.price)}
        </span>
      ),
    },
    {
      id: 'remove',
      header: 'Remove',
      align: 'right',
      cell: (t) => (
        <Button
          variant="ghost"
          size="sm"
          loading={busyId === t.id}
          onClick={() => void remove(t, ticker)}
          aria-label={`Remove the ${t.shares >= 0 ? 'buy' : 'sale'} of ${formatInt(
            Math.abs(t.shares),
          )} ${ticker} at Rs ${formatPrice(t.price)}`}
          className="text-ink-muted hover:text-down"
        >
          <Trash className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ];

  const cost = holding ? holding.totalShares * holding.avgCost : 0;
  const value = holding ? holding.totalShares * holding.currentPrice : 0;
  const gain = value - cost;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={holding ? `${holding.ticker} transactions` : 'Transactions'}
      description={holding?.name}
      size="lg"
    >
      {holding && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-line pb-5 sm:grid-cols-4">
            <Stat size="sm" label="Shares held" value={formatInt(holding.totalShares)} />
            <Stat size="sm" label="Average cost" value={`Rs ${formatPrice(holding.avgCost)}`} />
            <Stat size="sm" label="Last price" value={`Rs ${formatPrice(holding.currentPrice)}`} />
            <Stat
              size="sm"
              label="Position value"
              value={`Rs ${formatPrice(value)}`}
              delta={
                cost > 0 ? <Delta value={gain} percent={(gain / cost) * 100} size="sm" /> : undefined
              }
            />
          </div>

          <div className="pt-2">
            <DataTable
              columns={columns}
              rows={holding.transactions}
              getRowKey={(t) => t.id}
              caption={`Every recorded trade in ${holding.ticker}, with type, date, shares, price and consideration`}
            />
          </div>
        </>
      )}
    </Modal>
  );
};
