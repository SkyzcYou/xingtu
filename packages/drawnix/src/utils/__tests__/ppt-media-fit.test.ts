import { createTestingBoard } from '@plait/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateContainedRect,
  canFitSelectedMediaToPPTFrame,
  canFitPPTFrameMediaToFrame,
  fitPPTFrameMediaToFrame,
  fitPPTFrameMediaToFrameWithNaturalSize,
  fitSelectedMediaToPPTFrame,
} from '../ppt-media-fit';

function createBoard(children: any[] = []) {
  return createTestingBoard([], children) as any;
}

function createFrame(overrides: Record<string, unknown> = {}) {
  return {
    id: 'frame-1',
    type: 'frame',
    name: 'PPT 页面 1',
    points: [
      [0, 0],
      [1920, 1080],
    ],
    children: [],
    ...overrides,
  };
}

function createImage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'image-1',
    type: 'image',
    url: 'https://example.com/image.png',
    width: 800,
    height: 600,
    points: [
      [120, 100],
      [520, 400],
    ],
    children: [],
    ...overrides,
  };
}

describe('ppt-media-fit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates the largest contained rectangle centered in a PPT frame', () => {
    const rect = calculateContainedRect(4 / 3, {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });

    expect(rect).toEqual({
      x: 240,
      y: 0,
      width: 1440,
      height: 1080,
    });
  });

  it('fits a bound image to its PPT frame without changing aspect ratio', () => {
    const board = createBoard([
      createFrame(),
      createImage({ frameId: 'frame-1' }),
    ]);

    const result = fitSelectedMediaToPPTFrame(board, [board.children[1]]);

    expect(result).toEqual({ fittedCount: 1, skippedCount: 0 });
    expect(board.children[1].frameId).toBe('frame-1');
    expect(board.children[1].points).toEqual([
      [240, 0],
      [1680, 1080],
    ]);
  });

  it('uses the current intersecting frame when frameId is not set', () => {
    const board = createBoard([
      createFrame({
        points: [
          [1000, 0],
          [2920, 1080],
        ],
      }),
      createImage({
        id: 'video-1',
        url: 'https://example.com/movie.mp4#video',
        width: 720,
        height: 1280,
        points: [
          [1200, 100],
          [1600, 811],
        ],
      }),
    ]);

    const result = fitSelectedMediaToPPTFrame(board, [board.children[1]]);

    expect(result).toEqual({ fittedCount: 1, skippedCount: 0 });
    expect(board.children[1].frameId).toBe('frame-1');
    expect(board.children[1].points[0][0]).toBeCloseTo(1656.25);
    expect(board.children[1].points[0][1]).toBeCloseTo(0);
    expect(board.children[1].points[1][0]).toBeCloseTo(2263.75);
    expect(board.children[1].points[1][1]).toBeCloseTo(1080);
  });

  it('does not show the action when selected media has no PPT frame', () => {
    const board = createBoard([
      createImage({
        points: [
          [3000, 100],
          [3400, 400],
        ],
      }),
    ]);

    expect(canFitSelectedMediaToPPTFrame(board, [board.children[0]])).toBe(
      false
    );
  });

  it('shows the action on the selected PPT frame and fits its media', () => {
    const board = createBoard([
      createFrame(),
      createImage({
        id: 'image-bound',
        frameId: 'frame-1',
        width: 800,
        height: 600,
      }),
      createImage({
        id: 'image-outside',
        points: [
          [3000, 0],
          [3400, 300],
        ],
      }),
    ]);

    expect(canFitPPTFrameMediaToFrame(board, board.children[0])).toBe(true);

    const result = fitPPTFrameMediaToFrame(board, board.children[0]);

    expect(result).toEqual({ fittedCount: 1, skippedCount: 0 });
    expect(board.children[1].points).toEqual([
      [240, 0],
      [1680, 1080],
    ]);
    expect(board.children[2].points).toEqual([
      [3000, 0],
      [3400, 300],
    ]);
  });

  it('uses natural image ratio when fitting framed media', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      referrerPolicy = '';
      naturalWidth = 720;
      naturalHeight = 1280;
      width = 720;
      height = 1280;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', MockImage);
    const board = createBoard([
      createFrame(),
      createImage({
        frameId: 'frame-1',
        width: 1920,
        height: 1080,
        points: [
          [0, 0],
          [1920, 1080],
        ],
      }),
    ]);

    const result = await fitPPTFrameMediaToFrameWithNaturalSize(
      board,
      board.children[0]
    );

    expect(result).toEqual({ fittedCount: 1, skippedCount: 0 });
    expect(board.children[1].points[0][0]).toBeCloseTo(656.25);
    expect(board.children[1].points[0][1]).toBeCloseTo(0);
    expect(board.children[1].points[1][0]).toBeCloseTo(1263.75);
    expect(board.children[1].points[1][1]).toBeCloseTo(1080);
  });

  it('includes unbound media that belongs to the selected PPT frame by intersection', () => {
    const board = createBoard([
      createFrame(),
      createImage({
        id: 'video-unbound',
        url: 'https://example.com/movie.mp4#video',
        width: 1280,
        height: 720,
        points: [
          [100, 100],
          [500, 325],
        ],
      }),
    ]);

    const result = fitPPTFrameMediaToFrame(board, board.children[0]);

    expect(result).toEqual({ fittedCount: 1, skippedCount: 0 });
    expect(board.children[1].frameId).toBe('frame-1');
    expect(board.children[1].points).toEqual([
      [0, 0],
      [1920, 1080],
    ]);
  });
});
