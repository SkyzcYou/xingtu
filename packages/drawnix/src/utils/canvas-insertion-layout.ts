import type { PlaitBoard, Point, PlaitElement } from '@plait/core';
import { getRectangleByElements } from '@plait/core';

export const CANVAS_INSERTION_LAYOUT = {
  DEFAULT_VERTICAL_GAP: 50,
  DEFAULT_HORIZONTAL_GAP: 20,
  TEXT_DEFAULT_WIDTH: 300,
  TEXT_LINE_HEIGHT: 24,
  MEDIA_DEFAULT_SIZE: 400,
  MEDIA_MAX_SIZE: 600,
  DEFAULT_POINT: [100, 100] as Point,
};

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
