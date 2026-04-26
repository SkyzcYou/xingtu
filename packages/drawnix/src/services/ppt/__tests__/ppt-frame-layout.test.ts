import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PPT_FRAME_LAYOUT_COLUMNS,
  getPPTFrameGridPosition,
  getPPTFrameGridPositions,
  PPT_FRAME_GRID_GAP,
  sanitizePPTFrameLayoutColumns,
} from '../ppt-frame-layout';
import { PPT_FRAME_HEIGHT, PPT_FRAME_WIDTH } from '../ppt-layout-engine';

describe('ppt-frame-layout', () => {
  it('sanitizes PPT layout columns to 1..10 with default 3', () => {
    expect(sanitizePPTFrameLayoutColumns(undefined)).toBe(
      DEFAULT_PPT_FRAME_LAYOUT_COLUMNS
    );
    expect(sanitizePPTFrameLayoutColumns(0)).toBe(1);
    expect(sanitizePPTFrameLayoutColumns(11)).toBe(10);
    expect(sanitizePPTFrameLayoutColumns('4')).toBe(4);
  });

  it('builds row-major PPT frame grid positions', () => {
    expect(getPPTFrameGridPositions(5, [100, 200], 3)).toEqual([
      [100, 200],
      [100 + PPT_FRAME_WIDTH + PPT_FRAME_GRID_GAP, 200],
      [100 + (PPT_FRAME_WIDTH + PPT_FRAME_GRID_GAP) * 2, 200],
      [100, 200 + PPT_FRAME_HEIGHT + PPT_FRAME_GRID_GAP],
      [
        100 + PPT_FRAME_WIDTH + PPT_FRAME_GRID_GAP,
        200 + PPT_FRAME_HEIGHT + PPT_FRAME_GRID_GAP,
      ],
    ]);
  });

  it('uses sanitized columns when calculating a single position', () => {
    expect(getPPTFrameGridPosition([0, 0], 1, 0)).toEqual([
      0,
      PPT_FRAME_HEIGHT + PPT_FRAME_GRID_GAP,
    ]);
  });
});
