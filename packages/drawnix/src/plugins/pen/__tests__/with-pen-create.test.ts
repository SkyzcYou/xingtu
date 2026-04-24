import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaitBoard } from '@plait/core';
import { PenShape } from '../type';

const {
  insertNodeMock,
  clearSelectedElementMock,
  addSelectedElementMock,
} = vi.hoisted(() => ({
  insertNodeMock: vi.fn((board: TestBoard, node: unknown) => {
    board.children.push(node);
  }),
  clearSelectedElementMock: vi.fn(),
  addSelectedElementMock: vi.fn(),
}));

vi.mock('@plait/core', () => ({
  DEFAULT_COLOR: '#000000',
  ThemeColorMode: {
    default: 'default',
    colorful: 'colorful',
    soft: 'soft',
    retro: 'retro',
    dark: 'dark',
    starry: 'starry',
  },
  PlaitBoard: {
    getPointer: (board: TestBoard) => board.pointer,
    getElementHost: (board: TestBoard) => board.host,
  },
  Transforms: {
    insertNode: insertNodeMock,
  },
  toViewBoxPoint: (_board: TestBoard, point: [number, number]) => point,
  toHostPoint: (_board: TestBoard, x: number, y: number) => [x, y],
  throttleRAF: (_board: TestBoard, _key: string, callback: () => void) => callback(),
  clearSelectedElement: clearSelectedElementMock,
  addSelectedElement: addSelectedElementMock,
  createG: () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
}));

vi.mock('../utils', () => ({
  createPenPath: (_board: TestBoard, anchors: unknown[], closed = false) => ({
    id: 'pen-path-1',
    type: 'pen-path',
    anchors,
    closed,
  }),
  isHitStartAnchor: () => false,
  updatePenPathPoints: vi.fn(),
}));

vi.mock('../bezier-utils', () => ({
  createSymmetricHandles: vi.fn(),
  distanceBetweenPoints: () => 0,
}));

vi.mock('../pen.generator', () => ({
  drawPenPreview: (anchors: unknown[]) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('pen-preview');
    anchors.forEach(() => {
      const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      anchor.classList.add('pen-anchor');
      g.appendChild(anchor);
    });
    return g;
  },
}));

vi.mock('../pen-settings', () => ({
  getPenSettings: () => ({
    defaultAnchorType: 'smooth',
  }),
}));

import { withPenCreate } from '../with-pen-create';

type TestBoard = PlaitBoard & {
  pointer: string;
  children: unknown[];
  host: SVGGElement;
  pointerDown: (event: PointerEvent) => void;
  pointerMove: (event: PointerEvent) => void;
  pointerUp: (event: PointerEvent) => void;
  globalPointerUp: (event: PointerEvent) => void;
  keyDown: (event: KeyboardEvent) => void;
  globalKeyDown: (event: KeyboardEvent) => void;
};

function createBoard(): TestBoard {
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  return {
    pointer: PenShape.pen,
    children: [],
    host,
    pointerDown: vi.fn(),
    pointerMove: vi.fn(),
    pointerUp: vi.fn(),
    globalPointerUp: vi.fn(),
    keyDown: vi.fn(),
    globalKeyDown: vi.fn(),
  } as unknown as TestBoard;
}

function createPointerEvent(x: number, y: number, target: EventTarget | null): PointerEvent {
  return {
    x,
    y,
    target,
  } as PointerEvent;
}

function addAnchor(board: TestBoard, x: number, y: number) {
  const event = createPointerEvent(x, y, board.host);
  board.pointerDown(event);
  board.pointerUp(event);
}

function getPreviewAnchorCount(board: TestBoard) {
  return board.host.querySelectorAll('.pen-preview .pen-anchor').length;
}

function createKeyboardEvent(
  key: string,
  target?: EventTarget | null
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key });
  if (target !== undefined) {
    Object.defineProperty(event, 'target', {
      configurable: true,
      value: target,
    });
  }
  return event;
}

describe('withPenCreate', () => {
  beforeEach(() => {
    insertNodeMock.mockClear();
    clearSelectedElementMock.mockClear();
    addSelectedElementMock.mockClear();
    document.body.innerHTML = '';
  });

  it('removes the last anchor when Backspace is pressed via globalKeyDown during creation', () => {
    const board = withPenCreate(createBoard()) as TestBoard;

    addAnchor(board, 100, 100);
    addAnchor(board, 200, 120);

    expect(getPreviewAnchorCount(board)).toBe(2);

    board.globalKeyDown(createKeyboardEvent('Backspace'));

    expect(getPreviewAnchorCount(board)).toBe(1);
  });

  it('finishes the path when Enter is pressed via globalKeyDown during creation', () => {
    const board = withPenCreate(createBoard()) as TestBoard;

    addAnchor(board, 100, 100);
    addAnchor(board, 200, 120);

    expect(getPreviewAnchorCount(board)).toBe(2);

    board.globalKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(insertNodeMock).toHaveBeenCalledTimes(1);
    expect(board.children).toHaveLength(1);
    expect(getPreviewAnchorCount(board)).toBe(0);
  });

  it('does not handle Backspace or Enter when the event target is an input element', () => {
    const board = withPenCreate(createBoard()) as TestBoard;
    const input = document.createElement('input');

    addAnchor(board, 100, 100);
    addAnchor(board, 200, 120);

    board.globalKeyDown(createKeyboardEvent('Backspace', input));
    expect(getPreviewAnchorCount(board)).toBe(2);
    expect(insertNodeMock).not.toHaveBeenCalled();

    board.globalKeyDown(createKeyboardEvent('Enter', input));
    expect(getPreviewAnchorCount(board)).toBe(2);
    expect(insertNodeMock).not.toHaveBeenCalled();
    expect(board.children).toHaveLength(0);
  });
});
