import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import type { PortfolioHolding } from '../../types/stock';
import { addToPortfolio } from '../../services/api';
import { formatDate, formatInt, formatPrice } from '../../lib/format';
import { todayLocal } from '../../lib/user';
import {
  Button,
  Modal,
  ModalClose,
  Notice,
  Input,
  SegmentedControl,
} from '../ui';
import { SymbolSearch } from '../SymbolSearch';

/**
 * Record a buy or a sale.
 *
 * Replaces the taller of the two hand-rolled `fixed inset-0` dialogs. Beyond the
 * a11y that `Modal` brings (focus trap, Escape, scroll lock, return focus), three
 * behaviours changed:
 *
 *  - **Its own `SymbolSearch`.** The old page held one `searchResults` array for
 *    both add-forms, so typing in one populated the other's dropdown.
 *  - **Validation before the request**, shown inline per field. There was none —
 *    `parseInt` of an empty box, a future date, or a sale larger than the position
 *    all went straight to the API.
 *  - **A failure keeps the dialog open.** The old `alert('Failed to add to
 *    portfolio.')` closed nothing but told the user nothing either, and the
 *    surrounding code had already begun clearing the fields.
 */

export const AddPositionModal = ({
  open,
  onOpenChange,
  holdings,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Used to check a sale against the shares actually held. */
  holdings: PortfolioHolding[];
  onSaved: () => void;
}) => {
  // The submit button lives in the modal footer, outside the <form> element, so
  // it reaches the form by id rather than by being a descendant of it.
  const formId = useId();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [company, setCompany] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Radix unmounts the content when closed, so most of this is belt-and-braces —
  // but `side` sticking on "sell" from a previous visit would be a nasty default.
  useEffect(() => {
    if (!open) return;
    setSide('buy');
    setSymbol('');
    setCompany('');
    setShares('');
    setPrice('');
    setDate(todayLocal());
    setErrors({});
    setFailure(null);
  }, [open]);

  const held = holdings.find((h) => h.ticker === symbol)?.totalShares ?? 0;

  /** Drops one field's message so a correction clears it without a resubmit. */
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validate = () => {
    const found: Record<string, string> = {};

    if (!symbol) found.symbol = 'Pick a listed CSE symbol.';

    const quantity = Number(shares);
    if (!shares.trim()) {
      found.shares = 'Enter a number of shares.';
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      found.shares = 'Shares must be a whole number of at least 1.';
    } else if (side === 'sell' && quantity > held) {
      // Not a house rule — a sale bigger than the position drives `totalShares`
      // negative, at which point the API reports an average cost of 0 and the
      // holding's value and return both read as nonsense.
      found.shares =
        held > 0
          ? `You hold ${formatInt(held)} ${symbol}. A sale cannot be larger than the position.`
          : `You have no ${symbol} shares to sell.`;
    }

    const unitPrice = Number(price);
    if (!price.trim()) {
      found.price = 'Enter the price per share.';
    } else if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      found.price = 'Price must be greater than zero.';
    }

    if (!date) found.date = 'Pick the trade date.';
    // ISO dates compare correctly as strings.
    else if (date > todayLocal()) found.date = 'The trade date cannot be in the future.';

    return found;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const quantity = Number(shares);
    const unitPrice = Number(price);

    setSubmitting(true);
    setFailure(null);
    try {
      await addToPortfolio(symbol, side === 'sell' ? -quantity : quantity, unitPrice, date);
      toast.success(
        side === 'buy'
          ? `Added ${formatInt(quantity)} ${symbol}`
          : `Logged a sale of ${formatInt(quantity)} ${symbol}`,
        {
          description: `Rs ${formatPrice(unitPrice)} per share on ${formatDate(date)}.`,
        },
      );
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'The trade could not be saved.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record a trade"
      description="Buys and sales both live here; positions are grouped by symbol."
      footer={
        <>
          <ModalClose asChild>
            <Button variant="ghost">Cancel</Button>
          </ModalClose>
          <Button
            type="submit"
            form={formId}
            variant={side === 'sell' ? 'danger' : 'primary'}
            loading={submitting}
            loadingText="Saving…"
          >
            {side === 'buy' ? 'Add position' : 'Log sale'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
        {failure && (
          <Notice tone="error" title="Could not save the trade">
            {failure}
          </Notice>
        )}

        <SegmentedControl
          label="Trade type"
          fullWidth
          value={side}
          onChange={(next) => {
            setSide(next);
            // The held-shares rule only applies to a sale, so a stale error from
            // the other side of the switch has to go.
            clearError('shares');
          }}
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'sell', label: 'Sell' },
          ]}
        />

        <SymbolSearch
          label="Symbol"
          showLabel
          required
          error={errors.symbol}
          hint={company || undefined}
          onSelect={(quote) => {
            setSymbol(quote.ticker);
            setCompany(quote.name);
            // A new symbol invalidates whatever price was in the box.
            setPrice(String(quote.price));
            clearError('symbol');
            clearError('price');
          }}
        />

        <Input
          label="Shares"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          placeholder="100"
          value={shares}
          error={errors.shares}
          hint={
            side === 'sell' && symbol && held > 0
              ? `You currently hold ${formatInt(held)} ${symbol}.`
              : undefined
          }
          onChange={(e) => {
            setShares(e.target.value);
            clearError('shares');
          }}
        />

        <Input
          label="Price per share"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          placeholder="150.50"
          value={price}
          error={errors.price}
          hint="Pre-filled with the last traded price — change it to your actual fill."
          leftIcon={<span className="text-sm">Rs</span>}
          onChange={(e) => {
            setPrice(e.target.value);
            clearError('price');
          }}
        />

        <Input
          label="Trade date"
          type="date"
          required
          max={todayLocal()}
          value={date}
          error={errors.date}
          onChange={(e) => {
            setDate(e.target.value);
            clearError('date');
          }}
        />
      </form>
    </Modal>
  );
};
