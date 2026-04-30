import { describe, expect, it } from 'vitest';
import {
  clamp,
  clampSizeByHeight,
  clampSizeByWidth,
  normalizeDimension,
  type AspectResizeBounds,
} from './media-size-utils';

const bounds: AspectResizeBounds = {
  minWidth: 80,
  maxWidth: 400,
  minHeight: 60,
  maxHeight: 240,
};

describe('media-size-utils', () => {
  it('normalizes invalid and empty dimensions', () => {
    expect(normalizeDimension(null)).toBeUndefined();
    expect(normalizeDimension(undefined)).toBeUndefined();
    expect(normalizeDimension(Number.NaN)).toBeUndefined();
    expect(normalizeDimension(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizeDimension(0)).toBeUndefined();
    expect(normalizeDimension(-12)).toBeUndefined();
    expect(normalizeDimension(120.6)).toBe(121);
  });

  it('clamps values to min and max boundaries', () => {
    expect(clamp(24, 80, 400)).toBe(80);
    expect(clamp(120, 80, 400)).toBe(120);
    expect(clamp(520, 80, 400)).toBe(400);
  });

  it('keeps aspect ratio when resizing by width', () => {
    expect(clampSizeByWidth(320, 16 / 9, bounds)).toEqual({
      width: 320,
      height: 180,
    });
  });

  it('keeps aspect ratio when resizing by height', () => {
    expect(clampSizeByHeight(180, 16 / 9, bounds)).toEqual({
      width: 320,
      height: 180,
    });
  });

  it('honors min and max bounds while preserving ratio as much as possible', () => {
    expect(clampSizeByWidth(20, 16 / 9, bounds)).toEqual({
      width: 106.66666666666666,
      height: 60,
    });

    expect(clampSizeByHeight(600, 16 / 9, bounds)).toEqual({
      width: 400,
      height: 225,
    });
  });
});
