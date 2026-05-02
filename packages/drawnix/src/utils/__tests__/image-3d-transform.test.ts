import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE_3D_PERSPECTIVE,
  getImage3DSourceRectangle,
  getImage3DSvgOverlayGeometry,
  getImage3DVisualGeometry,
  getImage3DVisualRectangle,
  isOrdinary3DTransformImage,
  isPointInImage3DVisualGeometry,
  isRectangleHitImage3DVisualGeometry,
  sanitizeImage3DTransform,
} from '../image-3d-transform';

describe('image 3D transform helpers', () => {
  it('sanitizes, clamps, and rounds transform values', () => {
    expect(
      sanitizeImage3DTransform({
        rotateX: 91.456,
        rotateY: -192.333,
        perspective: -10,
      })
    ).toEqual({
      rotateX: 91.46,
      rotateY: -180,
      perspective: 1,
    });
  });

  it('removes the transform when both rotations reset to zero', () => {
    expect(
      sanitizeImage3DTransform({
        rotateX: 0.001,
        rotateY: -0.001,
        perspective: DEFAULT_IMAGE_3D_PERSPECTIVE,
      })
    ).toBeUndefined();
  });

  it('builds projected SVG overlay geometry for both rotation axes', () => {
    const horizontal = getImage3DSvgOverlayGeometry(
      { x: 10, y: 20, width: 100, height: 80 },
      { rotateX: 0, rotateY: 60, perspective: 800 }
    );
    expect(horizontal.pointsAttribute).toBe(
      '33.57,17.71 83.72,22.05 83.72,97.95 33.57,102.29'
    );

    const vertical = getImage3DSvgOverlayGeometry(
      { x: 10, y: 20, width: 100, height: 80 },
      { rotateX: 60, rotateY: 0, perspective: 800 }
    );
    expect(vertical.points[0][0]).toBeGreaterThan(vertical.points[3][0]);
    expect(vertical.points[1][0]).toBeLessThan(vertical.points[2][0]);
    expect(vertical.boundingBox.height).toBeGreaterThan(0);
  });

  it('recognizes ordinary images and excludes special image-like elements', () => {
    const ordinaryImage = {
      id: 'image-1',
      type: 'image',
      url: 'https://example.com/image.png',
      points: [
        [0, 0],
        [120, 80],
      ],
    };

    expect(isOrdinary3DTransformImage(ordinaryImage as any)).toBe(true);
    expect(
      isOrdinary3DTransformImage({
        ...ordinaryImage,
        url: 'https://example.com/video.mp4',
      } as any)
    ).toBe(false);
    expect(
      isOrdinary3DTransformImage({
        ...ordinaryImage,
        isAudio: true,
      } as any)
    ).toBe(false);
    expect(
      isOrdinary3DTransformImage({
        ...ordinaryImage,
        pptImagePlaceholder: true,
      } as any)
    ).toBe(false);
  });

  it('builds visual geometry from transformed image elements', () => {
    const image = {
      id: 'image-3d',
      type: 'image',
      url: 'https://example.com/image.png',
      points: [
        [10, 20],
        [110, 100],
      ],
      transform3d: { rotateX: 0, rotateY: 60, perspective: 800 },
    };

    expect(getImage3DSourceRectangle(image as any)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
    expect(getImage3DVisualRectangle(image as any)).toEqual({
      x: 33.57,
      y: 17.71,
      width: 50.15,
      height: 84.58,
    });
  });

  it('uses projected polygon hit testing for transformed images', () => {
    const geometry = getImage3DVisualGeometry({
      id: 'image-3d',
      type: 'image',
      url: 'https://example.com/image.png',
      points: [
        [10, 20],
        [110, 100],
      ],
      transform3d: { rotateX: 0, rotateY: 60, perspective: 800 },
    } as any)!;

    expect(isPointInImage3DVisualGeometry([60, 60], geometry)).toBe(true);
    expect(isPointInImage3DVisualGeometry([12, 60], geometry)).toBe(false);
    expect(
      isRectangleHitImage3DVisualGeometry(
        { x: 30, y: 50, width: 8, height: 8 },
        geometry
      )
    ).toBe(true);
    expect(
      isRectangleHitImage3DVisualGeometry(
        { x: 10, y: 50, width: 10, height: 10 },
        geometry
      )
    ).toBe(false);
  });

  it('keeps visual geometry moving in the same direction as source points', () => {
    const transform3d = { rotateX: 0, rotateY: 60, perspective: 800 };
    const before = getImage3DVisualRectangle({
      id: 'image-3d',
      type: 'image',
      url: 'https://example.com/image.png',
      points: [
        [10, 20],
        [110, 100],
      ],
      transform3d,
    } as any)!;
    const after = getImage3DVisualRectangle({
      id: 'image-3d',
      type: 'image',
      url: 'https://example.com/image.png',
      points: [
        [30, 35],
        [130, 115],
      ],
      transform3d,
    } as any)!;

    expect(after.x - before.x).toBeCloseTo(20);
    expect(after.y - before.y).toBeCloseTo(15);
  });
});
