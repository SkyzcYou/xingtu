// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardDropdown, type DropdownPlacement } from './KeyboardDropdown';

function setViewportHeight(height: number) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
}

function mockRect(
  element: Element,
  rect: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'width'>
) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.left,
    y: rect.top,
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.left + rect.width,
    width: rect.width,
    height: rect.bottom - rect.top,
    toJSON: () => ({}),
  } as DOMRect);
}

async function renderDropdown(
  rect: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'width'>,
  placement: DropdownPlacement = 'auto'
) {
  const view = render(
    <KeyboardDropdown
      isOpen
      setIsOpen={vi.fn()}
      placement={placement}
      minMenuHeight={80}
      maxMenuHeight={240}
    >
      {({ containerRef, menuStyle, resolvedPlacement, availableHeight }) => (
        <div ref={containerRef} data-testid="container">
          <div
            data-testid="menu"
            data-placement={resolvedPlacement}
            data-available-height={availableHeight}
            style={menuStyle}
          />
        </div>
      )}
    </KeyboardDropdown>
  );
  mockRect(screen.getByTestId('container'), rect);
  await act(async () => {
    window.dispatchEvent(new Event('resize'));
  });
  return view;
}

describe('KeyboardDropdown', () => {
  beforeEach(() => {
    setViewportHeight(600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('trigger 靠近底部时自动向上展开', async () => {
    await renderDropdown({ top: 520, left: 24, bottom: 552, width: 160 });

    const menu = screen.getByTestId('menu');

    expect(menu.dataset.placement).toBe('up');
    expect(menu.style.bottom).toBe('88px');
    expect(menu.style.maxHeight).toBe('240px');
  });

  it('下方空间不足完整菜单时自动向上而不是缩高向下', async () => {
    await renderDropdown({ top: 340, left: 24, bottom: 372, width: 160 });

    const menu = screen.getByTestId('menu');

    expect(menu.dataset.placement).toBe('up');
    expect(menu.style.bottom).toBe('268px');
    expect(menu.style.maxHeight).toBe('240px');
  });

  it('trigger 靠近顶部时自动向下展开', async () => {
    await renderDropdown({ top: 24, left: 30, bottom: 56, width: 160 });

    const menu = screen.getByTestId('menu');

    expect(menu.dataset.placement).toBe('down');
    expect(menu.style.top).toBe('64px');
    expect(menu.style.maxHeight).toBe('240px');
  });

  it('上下都有足够空间时自动优先向下展开', async () => {
    await renderDropdown({ top: 220, left: 30, bottom: 252, width: 160 });

    expect(screen.getByTestId('menu').dataset.placement).toBe('down');
  });

  it('显式 placement 仍生效并限制最大高度', async () => {
    await renderDropdown({ top: 120, left: 30, bottom: 152, width: 160 }, 'up');

    const menu = screen.getByTestId('menu');

    expect(menu.dataset.placement).toBe('up');
    expect(menu.style.bottom).toBe('488px');
    expect(menu.style.maxHeight).toBe('100px');
  });
});
