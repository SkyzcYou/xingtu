import type { PlaitBoard, Point } from '@plait/core';
import { getRectangleByElements } from '@plait/core';
import { insertImageFromUrl } from '../../data/image';
import { insertVideoFromUrl } from '../../data/video';
import { scrollToPointIfNeeded } from '../../utils/selection-utils';
import { insertMediaIntoSelectedFrame } from '../../utils/frame-insertion-utils';
import { getCanvasBoard } from './canvas-board-ref';

type CanvasMediaType = 'image' | 'video';

interface CanvasMediaInsertResult {
  success: boolean;
  error?: string;
  data?: {
    insertedCount: number;
    items: Array<{
      type: CanvasMediaType;
      point: Point;
      elementId?: string;
      size: { width: number; height: number };
    }>;
    firstElementId?: string;
    firstElementPosition?: Point;
    firstElementSize?: { width: number; height: number };
  };
  type: 'text' | 'error';
}

const DEFAULT_VERTICAL_GAP = 50;
const MEDIA_DEFAULT_SIZE = 400;

function getStartPointFromSelection(board: PlaitBoard): Point | undefined {
  const appState = (board as any).appState;
  const savedElementIds = appState?.lastSelectedElementIds || [];

  if (savedElementIds.length === 0) {
    return undefined;
  }

  const elements = savedElementIds
    .map((id: string) => board.children.find((el: any) => el.id === id))
    .filter(Boolean);

  if (elements.length === 0) {
    return undefined;
  }

  try {
    const boundingRect = getRectangleByElements(board, elements, false);
    return [
      boundingRect.x,
      boundingRect.y + boundingRect.height + DEFAULT_VERTICAL_GAP,
    ] as Point;
  } catch (error) {
    console.warn('[MediaQuickInsert] Error calculating start point:', error);
    return undefined;
  }
}

function getBottomMostPoint(board: PlaitBoard): Point {
  if (!board.children || board.children.length === 0) {
    return [100, 100] as Point;
  }

  let maxY = 0;
  let maxYLeftX = 100;

  for (const element of board.children) {
    try {
      const rect = getRectangleByElements(board, [element], false);
      const elementBottom = rect.y + rect.height;
      if (elementBottom > maxY) {
        maxY = elementBottom;
        maxYLeftX = rect.x;
      }
    } catch {
      // 忽略无法计算矩形的元素
    }
  }

  return [maxYLeftX, maxY + DEFAULT_VERTICAL_GAP] as Point;
}

function getDefaultMediaSize(type: CanvasMediaType): {
  width: number;
  height: number;
} {
  if (type === 'video') {
    return {
      width: MEDIA_DEFAULT_SIZE,
      height: Math.round(MEDIA_DEFAULT_SIZE * (9 / 16)),
    };
  }

  return {
    width: MEDIA_DEFAULT_SIZE,
    height: MEDIA_DEFAULT_SIZE,
  };
}

async function insertMedia(
  board: PlaitBoard,
  type: CanvasMediaType,
  content: string,
  point: Point,
  dimensions?: { width: number; height: number }
): Promise<{ width: number; height: number }> {
  const size = dimensions || getDefaultMediaSize(type);

  if (type === 'video') {
    await insertVideoFromUrl(board, content, point, false, size, true, true);
    return size;
  }

  await insertImageFromUrl(board, content, point, false, size, true, true);
  return size;
}

export async function quickInsertCanvasMedia(
  type: CanvasMediaType,
  content: string,
  point?: Point,
  dimensions?: { width: number; height: number }
): Promise<CanvasMediaInsertResult> {
  const board = getCanvasBoard();

  if (!board) {
    return {
      success: false,
      error: '画布未初始化，请先打开画布',
      type: 'error',
    };
  }

  try {
    if (!point) {
      const inserted = await insertMediaIntoSelectedFrame(
        board,
        content,
        type,
        dimensions
      );

      if (inserted) {
        return {
          success: true,
          data: {
            insertedCount: 1,
            items: [
              {
                type,
                point: inserted.point,
                elementId: inserted.elementId,
                size: inserted.size,
              },
            ],
            firstElementId: inserted.elementId,
            firstElementPosition: inserted.point,
            firstElementSize: inserted.size,
          },
          type: 'text',
        };
      }
    }

    const targetPoint = point || getStartPointFromSelection(board) || getBottomMostPoint(board);
    const childrenCountBefore = board.children.length;
    const size = await insertMedia(board, type, content, targetPoint, dimensions);
    const insertedElement = board.children[childrenCountBefore] as
      | { id?: string }
      | undefined;

    requestAnimationFrame(() => {
      scrollToPointIfNeeded(board, [
        targetPoint[0] + MEDIA_DEFAULT_SIZE / 2,
        targetPoint[1] + MEDIA_DEFAULT_SIZE / 2,
      ]);
    });

    return {
      success: true,
      data: {
        insertedCount: 1,
        items: [
          {
            type,
            point: targetPoint,
            elementId: insertedElement?.id,
            size,
          },
        ],
        firstElementId: insertedElement?.id,
        firstElementPosition: targetPoint,
        firstElementSize: size,
      },
      type: 'text',
    };
  } catch (error: any) {
    console.error('[MediaQuickInsert] Failed to insert media:', error);
    return {
      success: false,
      error: `插入失败: ${error.message || '未知错误'}`,
      type: 'error',
    };
  }
}
