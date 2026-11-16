import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useHotkeys } from '@/hooks/use-hotkeys';

function Harness(props: Parameters<typeof useHotkeys>[0] extends never ? never : any) {
  useHotkeys(props.map, props.options);
  return <input aria-label="field" />;
}

const press = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  document.body.dispatchEvent(event);
  return event;
};

describe('useHotkeys', () => {
  it('runs a mod shortcut', () => {
    const onOpen = vi.fn();
    render(<Harness map={{ 'mod+k': onOpen }} />);
    press({ key: 'k', ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('matches punctuation typed with shift', () => {
    const onHelp = vi.fn();
    render(<Harness map={{ '?': onHelp }} />);
    press({ key: '?', shiftKey: true });
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('supports explicit shift combinations', () => {
    const onFocus = vi.fn();
    render(<Harness map={{ 'mod+shift+f': onFocus }} />);
    press({ key: 'F', ctrlKey: true, shiftKey: true });
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('ignores plain keys while typing', () => {
    const onHelp = vi.fn();
    render(<Harness map={{ '?': onHelp }} />);
    const input = document.querySelector('input')!;
    const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true });
    input.dispatchEvent(event);
    expect(onHelp).not.toHaveBeenCalled();
  });

  it('still allows opted-in shortcuts inside the editor', () => {
    const onPalette = vi.fn();
    render(<Harness map={{ 'mod+k': onPalette }} options={{ allowInEditor: ['mod+k'] }} />);
    const input = document.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    expect(onPalette).toHaveBeenCalledTimes(1);
  });

  it('does nothing for unregistered combos', () => {
    const onOpen = vi.fn();
    render(<Harness map={{ 'mod+k': onOpen }} />);
    press({ key: 'j', ctrlKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
