import type { Point, PlaitElement } from '@plait/core';
import { PlaitBoard, getRectangleByElements } from '@plait/core';

export const CANVAS_INSERTION_LAYOUT = {
  DEFAULT_VERTICAL_GAP: 50,
  DEFAULT_HORIZONTAL_GAP: 20,
  TEXT_DEFAULT_WIDTH: 300,
  TEXT_LINE_HEIGHT: 24,
  MEDIA_DEFAULT_SIZE: 400,
  MEDIA_MAX_SIZE: 600,
  DEFAULT_POINT: [100, 100] as Point,
};

const CANVAS_INSERTION_DEBUG_FLAG = 'aitu:debug-canvas-insertion';

type InsertionAlignment = 'left' | 'center';

interface InsertionPointOptions {
  verticalGap?: number;
  align?: InsertionAlignment;
  targetWidth?: number;
  emptyPoint?: Point;
  logPrefix?: string;
}

interface TextSizeOptions {
  maxWidth?: number;
  lineHeight?: number;
}

interface FlowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlowLayoutOptions {
  horizontalGap?: number;
  verticalGap?: number;
  rowWidth?: number;
}

export interface BatchInsertionFlowState {
  startX: number;
  startY: number;
  cursorX: number;
  cursorY: number;
  rowRightLimit: number;
  horizontalGap: number;
  verticalGap: number;
  rowMaxHeight: number;
  bounds: FlowBounds | null;
}

export interface ViewportCanvasMetrics {
  width: number;
  height: number;
  zoom: number;
}

export function shouldDebugCanvasInsertion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const isDev =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
    return isDev || window.localStorage?.getItem(CANVAS_INSERTION_DEBUG_FLAG) === '1';
  } catch {
    return false;
  }
}

export function logCanvasInsertionDebug(
  label: string,
  payload?: Record<string, unknown>
): void {
  if (!shouldDebugCanvasInsertion()) {
    return;
  }

  if (payload) {
    console.info(label, payload);
    return;
  }

  console.info(label);
}

function getFallbackViewportMetric(axis: 'width' | 'height'): number {
  if (typeof window !== 'undefined') {
    return axis === 'width' ? window.innerWidth : window.innerHeight;
  }

  return axis === 'width'
    ? CANVAS_INSERTION_LAYOUT.MEDIA_DEFAULT_SIZE
    : CANVAS_INSERTION_LAYOUT.MEDIA_DEFAULT_SIZE;
}

export function getViewportCanvasMetrics(board: PlaitBoard): ViewportCanvasMetrics {
  const zoom = Math.max(Number((board as any)?.viewport?.zoom) || 1, 0.001);
  let containerRect: DOMRect | { width: number; height: number } | undefined;

  try {
    const boardContainer = PlaitBoard.getBoardContainer(board);
    containerRect = boardContainer?.getBoundingClientRect?.();
  } catch {
    containerRect = undefined;
  }

  const width = containerRect && containerRect.width > 0
    ? containerRect.width / zoom
    : getFallbackViewportMetric('width') / zoom;
  const height = containerRect && containerRect.height > 0
    ? containerRect.height / zoom
    : getFallbackViewportMetric('height') / zoom;

  return { width, height, zoom };
}

export function getViewportAwareCardWidth(
  board: PlaitBoard,
  ratio = 0.5
): number {
  const { width } = getViewportCanvasMetrics(board);
  return Math.max(1, Math.round(width * ratio));
}

function mergeFlowBounds(
  current: FlowBounds | null,
  point: Point,
  size: { width: number; height: number }
): FlowBounds {
  const nextBounds = {
    x: point[0],
    y: point[1],
    width: size.width,
    height: size.height,
  };

  if (!current) {
    return nextBounds;
  }

  const left = Math.min(current.x, nextBounds.x);
  const top = Math.min(current.y, nextBounds.y);
  const right = Math.max(current.x + current.width, nextBounds.x + nextBounds.width);
  const bottom = Math.max(current.y + current.height, nextBounds.y + nextBounds.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function createBatchInsertionFlowState(
  board: PlaitBoard,
  startPoint: Point,
  options: FlowLayoutOptions = {}
): BatchInsertionFlowState {
  const { width } = getViewportCanvasMetrics(board);
  const {
    horizontalGap = CANVAS_INSERTION_LAYOUT.DEFAULT_HORIZONTAL_GAP,
    verticalGap = CANVAS_INSERTION_LAYOUT.DEFAULT_VERTICAL_GAP,
    rowWidth = width,
  } = options;

  return {
    startX: startPoint[0],
    startY: startPoint[1],
    cursorX: startPoint[0],
    cursorY: startPoint[1],
    rowRightLimit: startPoint[0] + Math.max(1, Math.round(rowWidth)),
    horizontalGap,
    verticalGap,
    rowMaxHeight: 0,
    bounds: null,
  };
}

export function advanceBatchInsertionFlow(
  state: BatchInsertionFlowState,
  size: { width: number; height: number }
): { point: Point; state: BatchInsertionFlowState; wrapped: boolean } {
  const wrapped =
    state.cursorX > state.startX &&
    state.cursorX + size.width > state.rowRightLimit;

  const nextState: BatchInsertionFlowState = wrapped
    ? {
        ...state,
        cursorX: state.startX,
        cursorY: state.cursorY + state.rowMaxHeight + state.verticalGap,
        rowMaxHeight: 0,
      }
    : { ...state };

  const point = [nextState.cursorX, nextState.cursorY] as Point;
  nextState.cursorX = point[0] + size.width + nextState.horizontalGap;
  nextState.rowMaxHeight = Math.max(nextState.rowMaxHeight, size.height);
  nextState.bounds = mergeFlowBounds(nextState.bounds, point, size);

  return {
    point,
    state: nextState,
    wrapped,
  };
}

export function getBatchInsertionFlowCenter(
  state: Pick<BatchInsertionFlowState, 'bounds'>
): Point | undefined {
  if (!state.bounds) {
    return undefined;
  }

  return [
    state.bounds.x + state.bounds.width / 2,
    state.bounds.y + state.bounds.height / 2,
  ] as Point;
}

function resolveAlignedX(
  rect: { x: number; width: number },
  align: InsertionAlignment,
  targetWidth?: number
): number {
  if (align === 'center') {
    const centerX = rect.x + rect.width / 2;
    return typeof targetWidth === 'number' ? centerX - targetWidth / 2 : centerX;
  }

  return rect.x;
}

function getSavedSelectionElements(board: PlaitBoard): PlaitElement[] {
  const appState = (board as any).appState;
  const savedElementIds: string[] = Array.isArray(appState?.lastSelectedElementIds)
    ? appState.lastSelectedElementIds
    : [];

  if (savedElementIds.length === 0 || !Array.isArray(board.children)) {
    return [];
  }

  const selectedIds = new Set(savedElementIds);
  const elementsById = new Map<string, PlaitElement>();

  for (const element of board.children as PlaitElement[]) {
    if (selectedIds.has(element.id)) {
      elementsById.set(element.id, element);
    }
  }

  return savedElementIds
    .map((id: string) => elementsById.get(id))
    .filter((element): element is PlaitElement => Boolean(element));
}

export function getInsertionPointFromSavedSelection(
  board: PlaitBoard,
  options: InsertionPointOptions = {}
): Point | undefined {
  const elements = getSavedSelectionElements(board);
  if (elements.length === 0) {
    return undefined;
  }

  const {
    verticalGap = CANVAS_INSERTION_LAYOUT.DEFAULT_VERTICAL_GAP,
    align = 'left',
    targetWidth,
    logPrefix = 'CanvasInsertion',
  } = options;

  try {
    const rect = getRectangleByElements(board, elements, false);
    return [
      resolveAlignedX(rect, align, targetWidth),
      rect.y + rect.height + verticalGap,
    ] as Point;
  } catch (error) {
    console.warn(`[${logPrefix}] Error calculating insertion point:`, error);
    return undefined;
  }
}

export function getBottomMostInsertionPoint(
  board: PlaitBoard,
  options: InsertionPointOptions = {}
): Point | undefined {
  const {
    verticalGap = CANVAS_INSERTION_LAYOUT.DEFAULT_VERTICAL_GAP,
    align = 'left',
    targetWidth,
    emptyPoint,
  } = options;

  if (!Array.isArray(board.children) || board.children.length === 0) {
    return emptyPoint;
  }

  let bottomRect: { x: number; y: number; width: number; height: number } | null =
    null;
  let maxBottomY = 0;

  for (const element of board.children as PlaitElement[]) {
    try {
      const rect = getRectangleByElements(board, [element], false);
      const bottomY = rect.y + rect.height;
      if (bottomY > maxBottomY) {
        maxBottomY = bottomY;
        bottomRect = rect;
      }
    } catch {
      // Ignore elements without a usable rectangle.
    }
  }

  if (!bottomRect) {
    const fallbackX = emptyPoint?.[0] ?? CANVAS_INSERTION_LAYOUT.DEFAULT_POINT[0];
    return [fallbackX, verticalGap] as Point;
  }

  return [
    resolveAlignedX(bottomRect, align, targetWidth),
    bottomRect.y + bottomRect.height + verticalGap,
  ] as Point;
}

export function estimateCanvasTextSize(
  text: string,
  options: TextSizeOptions = {}
): { width: number; height: number } {
  const {
    maxWidth = CANVAS_INSERTION_LAYOUT.TEXT_DEFAULT_WIDTH,
    lineHeight = CANVAS_INSERTION_LAYOUT.TEXT_LINE_HEIGHT,
  } = options;
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map((line) => line.length));

  return {
    width: Math.min(maxLineLength * 8, maxWidth),
    height: lines.length * lineHeight,
  };
}

export function groupInsertionItems<T extends { groupId?: string }>(
  items: T[]
): T[][] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    if (!item.groupId) {
      continue;
    }

    const group = groups.get(item.groupId) || [];
    group.push(item);
    groups.set(item.groupId, group);
  }

  const result: T[][] = [];
  let currentGroupId: string | null = null;

  for (const item of items) {
    if (item.groupId) {
      if (currentGroupId !== item.groupId) {
        currentGroupId = item.groupId;
        const group = groups.get(item.groupId);
        if (group) {
          result.push(group);
        }
      }
    } else {
      result.push([item]);
      currentGroupId = null;
    }
  }

  return result;
}
