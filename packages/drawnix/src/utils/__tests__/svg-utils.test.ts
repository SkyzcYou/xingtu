import { describe, expect, it } from 'vitest';
import { normalizeSvg, parseSvgDimensions, svgToDataUrl } from '../svg-utils';

describe('svg-utils', () => {
  it('adds xmlns when missing', () => {
    expect(normalizeSvg('<svg><rect /></svg>')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>'
    );
  });

  it('keeps existing xmlns unchanged', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>';

    expect(normalizeSvg(svg)).toBe(svg);
  });

  it('parses dimensions from viewBox', () => {
    expect(parseSvgDimensions('<svg viewBox="0 0 320 180"></svg>')).toEqual({
      width: 320,
      height: 180,
    });
  });

  it('parses dimensions from width and height attributes', () => {
    expect(parseSvgDimensions('<svg width="640px" height="360px"></svg>')).toEqual({
      width: 640,
      height: 360,
    });
  });

  it('falls back to default dimensions', () => {
    expect(parseSvgDimensions('<svg></svg>')).toEqual({
      width: 400,
      height: 400,
    });
  });

  it('encodes svg as data url', () => {
    expect(svgToDataUrl('<svg><text a="b">hi</text></svg>')).toBe(
      'data:image/svg+xml,%3Csvg%3E%3Ctext%20a%3D%22b%22%3Ehi%3C%2Ftext%3E%3C%2Fsvg%3E'
    );
  });
});
