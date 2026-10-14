import { useEffect, type RefObject } from 'react';

const attribute = 'data-search-shortcut';

/**
 * ⌘F / Ctrl+F jumps to the page's search input. Pressing it again moves to the next search on the page, and from
 * the last one it falls through to the browser's own find, so native find is never more than a keypress away.
 *
 * Spread the returned props onto the input. Every registered input runs the same lookup and only the chosen one acts,
 * so pages with several searches need no coordination.
 */
export const useSearchShortcut = (ref: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey ||
        event.key.toLowerCase() !== 'f'
      ) {
        return;
      }

      // Skip inputs hidden behind an open dialog (Radix sets aria-hidden on everything outside it).
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`[${attribute}]`)).filter(
        (input) => !input.closest('[aria-hidden="true"]'),
      );
      const current = inputs.indexOf(document.activeElement as HTMLInputElement);
      const target = inputs[current + 1];

      if (!target || target !== ref.current) return;

      event.preventDefault();
      target.focus();
      target.select();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ref]);

  return { [attribute]: '' };
};
