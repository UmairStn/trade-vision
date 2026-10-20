import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Dropdown menu on Radix, themed from the token layer.
 *
 * Radix is here for the behaviour, not the markup: typeahead, arrow-key roving
 * focus, Escape, click-outside, focus return to the trigger, and correct
 * `aria-expanded`/`aria-haspopup` wiring. The navbar's user menu used to be a
 * bare name span next to a Logout button, which is not a menu at all.
 */

export const Menu = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;

export const MenuContent = ({
  children,
  align = 'end',
  sideOffset = 8,
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        'z-50 min-w-52 rounded-md border border-line bg-card p-1 elevated-pop',
        // Radix reports where it actually placed itself, so the scale-in grows
        // from the trigger rather than from the panel's own centre.
        'origin-[var(--radix-dropdown-menu-content-transform-origin)]',
        'data-[state=open]:animate-scale-in',
        className,
      )}
    >
      {children}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
);

interface MenuItemProps
  extends ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  /** Red highlight for sign-out and delete. */
  tone?: 'default' | 'danger';
}

export const MenuItem = ({ tone = 'default', className, ...rest }: MenuItemProps) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm select-none outline-none',
      'transition-colors duration-100',
      tone === 'danger'
        ? 'text-ink-secondary data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger'
        : 'text-ink-secondary data-[highlighted]:bg-sunken data-[highlighted]:text-ink',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...rest}
  />
);

/** Non-interactive heading. Use for the signed-in identity block. */
export const MenuLabel = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <DropdownMenuPrimitive.Label className={cn('px-2.5 py-2', className)}>
    {children}
  </DropdownMenuPrimitive.Label>
);

export const MenuSeparator = () => (
  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-line" />
);
