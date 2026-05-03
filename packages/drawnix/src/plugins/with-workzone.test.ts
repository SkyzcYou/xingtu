import { describe, expect, it } from 'vitest';
import { getWorkZoneVisualRectangle } from './workzone-transforms';
import type { PlaitWorkZone } from '../types/workzone.types';

function createWorkZone(zoom: number): PlaitWorkZone {
  return {
    id: 'workzone-1',
    type: 'workzone',
    points: [
      [10, 20],
      [370, 260],
    ],
    angle: 0,
    createdAt: Date.now(),
    zoom,
    workflow: {
      id: 'workflow-1',
      name: '生成 PPT 大纲',
      generationType: 'text',
      prompt: '生成 PPT 大纲',
      count: 1,
      steps: [],
    },
    children: [],
  };
}

describe('getWorkZoneVisualRectangle', () => {
  it('expands the hit rectangle to match scaled content when zoomed out', () => {
    expect(getWorkZoneVisualRectangle(createWorkZone(0.5))).toMatchObject({
      x: 10,
      y: 20,
      width: 720,
      height: 480,
    });
  });

  it('shrinks the hit rectangle to match scaled content when zoomed in', () => {
    expect(getWorkZoneVisualRectangle(createWorkZone(2))).toMatchObject({
      x: 10,
      y: 20,
      width: 180,
      height: 120,
    });
  });
});
