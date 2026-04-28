import type { PlaitBoard } from '@plait/core';

let boardRef: PlaitBoard | null = null;

export function setCanvasBoard(board: PlaitBoard | null): void {
  boardRef = board;
}

export function getCanvasBoard(): PlaitBoard | null {
  return boardRef;
}
