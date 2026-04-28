import { cleanup, render, waitFor } from '@testing-library/react';
import {
  PlaitElement,
  getSelectedElements,
  initializeViewBox,
  initializeViewportContainer,
  updateViewportOffset,
  type Viewport,
} from '@plait/core';
import React from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Board } from './board';
import { Wrapper } from './wrapper';

vi.mock('@plait/core', async () => {
  const actual = await vi.importActual<typeof import('@plait/core')>(
    '@plait/core'
  );
  return {
    ...actual,
    PlaitElement: {
      ...actual.PlaitElement,
      getElementRef: vi.fn(actual.PlaitElement.getElementRef),
    },
    getSelectedElements: vi.fn(actual.getSelectedElements),
    initializeViewportContainer: vi.fn(),
    initializeViewBox: vi.fn(),
    initializeViewportOffset: vi.fn(),
    updateViewportOffset: vi.fn(),
  };
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const boardRect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 1000,
  bottom: 800,
  width: 1000,
  height: 800,
  toJSON: () => ({}),
} as DOMRect;

const mockedInitializeViewportContainer = vi.mocked(
  initializeViewportContainer
);
const mockedInitializeViewBox = vi.mocked(initializeViewBox);
const mockedUpdateViewportOffset = vi.mocked(updateViewportOffset);
const mockedGetSelectedElements = vi.mocked(getSelectedElements);
const mockedGetElementRef = vi.mocked(PlaitElement.getElementRef);

const renderBoard = (value: PlaitElement[], viewport?: Viewport) => (
  <Wrapper value={value} viewport={viewport} options={{}} plugins={[]}>
    <Board />
  </Wrapper>
);

describe('ReactBoard', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      boardRect
    );
  });

  beforeEach(() => {
    mockedGetSelectedElements.mockReturnValue([]);
    mockedGetElementRef.mockReturnValue(undefined as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('syncs the viewport container after restoring value and viewport props', async () => {
    const initialValue: PlaitElement[] = [];
    const restoredValue: PlaitElement[] = [];
    const restoredViewport = {
      zoom: 1,
      origination: [0, 1200],
    } as Viewport;

    const { rerender } = render(renderBoard(initialValue));

    vi.clearAllMocks();

    rerender(renderBoard(restoredValue, restoredViewport));

    await waitFor(() => {
      expect(mockedInitializeViewportContainer).toHaveBeenCalledTimes(1);
    });

    expect(mockedInitializeViewBox).toHaveBeenCalledTimes(1);
    expect(mockedUpdateViewportOffset).toHaveBeenCalledTimes(1);
    expect(
      mockedInitializeViewportContainer.mock.invocationCallOrder[0]
    ).toBeLessThan(mockedInitializeViewBox.mock.invocationCallOrder[0]);
    expect(
      mockedInitializeViewBox.mock.invocationCallOrder[0]
    ).toBeLessThan(mockedUpdateViewportOffset.mock.invocationCallOrder[0]);
  });

  it('syncs the viewport container when only the viewport prop changes', async () => {
    const value: PlaitElement[] = [];
    const restoredViewport = {
      zoom: 1.25,
      origination: [100, 600],
    } as Viewport;

    const { rerender } = render(renderBoard(value));

    vi.clearAllMocks();

    rerender(renderBoard(value, restoredViewport));

    await waitFor(() => {
      expect(mockedInitializeViewportContainer).toHaveBeenCalledTimes(1);
    });

    expect(mockedInitializeViewBox).toHaveBeenCalledTimes(1);
    expect(mockedUpdateViewportOffset).toHaveBeenCalledTimes(1);
  });

  it('refreshes selected active sections after viewport prop changes', async () => {
    const value: PlaitElement[] = [];
    const selectedElement = { id: 'selected' } as PlaitElement;
    const elementRef = { updateActiveSection: vi.fn() };
    const restoredViewport = {
      zoom: 1.25,
      origination: [100, 600],
    } as Viewport;

    mockedGetSelectedElements.mockReturnValue([selectedElement]);
    mockedGetElementRef.mockReturnValue(elementRef as any);

    const { rerender } = render(renderBoard(value));

    vi.clearAllMocks();
    mockedGetSelectedElements.mockReturnValue([selectedElement]);
    mockedGetElementRef.mockReturnValue(elementRef as any);

    rerender(renderBoard(value, restoredViewport));

    await waitFor(() => {
      expect(elementRef.updateActiveSection).toHaveBeenCalled();
    });
    expect(mockedGetElementRef).toHaveBeenCalledWith(selectedElement);
  });

  it('refreshes selected active sections after restoring viewport scroll', async () => {
    const value: PlaitElement[] = [];
    const selectedElement = { id: 'selected' } as PlaitElement;
    const elementRef = { updateActiveSection: vi.fn() };
    const restoredViewport = {
      zoom: 2,
      origination: [20, 30],
    } as Viewport;

    mockedGetSelectedElements.mockReturnValue([selectedElement]);
    mockedGetElementRef.mockReturnValue(elementRef as any);

    const { container, rerender } = render(renderBoard(value));
    container
      .querySelector('.board-host-svg')
      ?.setAttribute('viewBox', '0 0 1000 800');
    const viewportContainer = container.querySelector(
      '.viewport-container'
    ) as HTMLElement;

    vi.clearAllMocks();
    mockedGetSelectedElements.mockReturnValue([selectedElement]);
    mockedGetElementRef.mockReturnValue(elementRef as any);

    rerender(renderBoard(value, restoredViewport));

    await waitFor(() => {
      expect(viewportContainer.scrollLeft).toBe(40);
      expect(viewportContainer.scrollTop).toBe(60);
    });
    expect(elementRef.updateActiveSection.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not refresh element refs when viewport changes without selection', async () => {
    const value: PlaitElement[] = [];
    const restoredViewport = {
      zoom: 1.25,
      origination: [100, 600],
    } as Viewport;

    mockedGetSelectedElements.mockReturnValue([]);

    const { rerender } = render(renderBoard(value));

    vi.clearAllMocks();
    mockedGetSelectedElements.mockReturnValue([]);

    rerender(renderBoard(value, restoredViewport));

    await waitFor(() => {
      expect(mockedInitializeViewportContainer).toHaveBeenCalledTimes(1);
    });
    expect(mockedGetElementRef).not.toHaveBeenCalled();
  });
});
