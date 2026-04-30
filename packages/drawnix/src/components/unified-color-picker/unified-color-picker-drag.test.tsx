// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlphaSlider } from './AlphaSlider';
import { HSPanel } from './HSPanel';
import { HueSlider } from './HueSlider';

function setRect(element: Element, rect: Partial<DOMRect>) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  });
}

describe('unified color picker drag', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('鼠标按下开始拖拽，mousemove 更新，mouseup 后停止', () => {
    const onChange = vi.fn();
    const { container } = render(<HueSlider hue={0} onChange={onChange} />);
    const slider = container.querySelector('.ucp-hue-slider');

    expect(slider).toBeTruthy();
    if (!slider) {
      throw new Error('hue slider not found');
    }

    setRect(slider, { width: 100 });

    fireEvent.mouseDown(slider, { clientX: 25, clientY: 0 });
    expect(onChange).toHaveBeenLastCalledWith(90);

    fireEvent.mouseMove(document, { clientX: 75, clientY: 0 });
    expect(onChange).toHaveBeenLastCalledWith(270);

    fireEvent.mouseUp(document);
    const callCountAfterMouseUp = onChange.mock.calls.length;

    fireEvent.mouseMove(document, { clientX: 100, clientY: 0 });
    expect(onChange).toHaveBeenCalledTimes(callCountAfterMouseUp);
  });

  it('触摸开始拖拽，touchmove 使用 passive false 更新，touchend 后停止', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const onChange = vi.fn();
    const { container } = render(
      <AlphaSlider alpha={0} color="#ff0000" onChange={onChange} />
    );
    const slider = container.querySelector('.ucp-alpha-slider');

    expect(slider).toBeTruthy();
    if (!slider) {
      throw new Error('alpha slider not found');
    }

    setRect(slider, { width: 100 });

    fireEvent.touchStart(slider, {
      touches: [{ clientX: 10, clientY: 0 }],
    });
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      { passive: false }
    );

    fireEvent.touchMove(document, {
      touches: [{ clientX: 60, clientY: 0 }],
    });
    expect(onChange).toHaveBeenLastCalledWith(60);

    fireEvent.touchEnd(document);
    const callCountAfterTouchEnd = onChange.mock.calls.length;

    fireEvent.touchMove(document, {
      touches: [{ clientX: 90, clientY: 0 }],
    });
    expect(onChange).toHaveBeenCalledTimes(callCountAfterTouchEnd);
  });

  it('拖拽中 unmount 会清理 document listener', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const onChange = vi.fn();
    const { container, unmount } = render(
      <HSPanel hue={120} saturation={0} value={100} onChange={onChange} />
    );
    const panel = container.querySelector('.ucp-hs-panel');

    expect(panel).toBeTruthy();
    if (!panel) {
      throw new Error('hs panel not found');
    }

    setRect(panel, { height: 100, width: 100 });

    fireEvent.mouseDown(panel, { clientX: 40, clientY: 20 });
    expect(onChange).toHaveBeenLastCalledWith(40, 80);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchend',
      expect.any(Function)
    );
  });
});
