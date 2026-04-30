import { describe, expect, it } from 'vitest';
import { RectangleClient } from '@plait/core';
import {
  getHitRectangleResizeHandleRef,
  rotatePoint,
} from '../resize-utils';

describe('resize-utils', () => {
  it('rotates a point around a center', () => {
    const rotated = rotatePoint([10, 0], [0, 0], 90);

    expect(rotated[0]).toBeCloseTo(0);
    expect(rotated[1]).toBeCloseTo(10);
  });

  it('hit tests non-rotated resize handles', () => {
    const rectangle = {
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    } as RectangleClient;

    const hit = getHitRectangleResizeHandleRef(rectangle, [0, 0]);

    expect(hit?.handle).toBeDefined();
    expect(hit?.cursorClass).toBeTruthy();
  });

  it('honors allowed resize handles', () => {
    const rectangle = {
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    } as RectangleClient;

    expect(
      getHitRectangleResizeHandleRef(rectangle, [50, 0], 0, new Set(['5', '7']))
    ).toBeUndefined();
    expect(
      getHitRectangleResizeHandleRef(rectangle, [100, 40], 0, new Set(['5', '7']))
        ?.handle
    ).toBe('5');
  });

  it('hit tests rotated resize handles by reverse-rotating the pointer', () => {
    const rectangle = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    } as RectangleClient;
    const center = RectangleClient.getCenterPoint(rectangle);
    const unrotatedHandlePoint: [number, number] = [0, 0];
    const rotatedPointer = rotatePoint(unrotatedHandlePoint, center, 45);

    const baseHit = getHitRectangleResizeHandleRef(
      rectangle,
      unrotatedHandlePoint
    );
    const rotatedHit = getHitRectangleResizeHandleRef(
      rectangle,
      rotatedPointer,
      45
    );

    expect(rotatedHit?.handle).toBe(baseHit?.handle);
    expect(rotatedHit?.cursorClass).toBeTruthy();
  });
});
