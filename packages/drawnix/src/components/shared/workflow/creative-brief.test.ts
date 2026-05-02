import { describe, expect, it } from 'vitest';
import { getCreativeBriefPresetOptions } from './creative-brief';

describe('creative brief preset ordering', () => {
  it('keeps popular video presets conversion-first', () => {
    const options = getCreativeBriefPresetOptions('popular_video');

    expect(options.purposeOptions[0].label).toBe('转化成交');
    expect(options.purposeOptions[0].options[1]).toMatchObject({
      label: '口播种草',
    });
    expect(options.directorStyleOptions[0].label).toBe('商业导演');
    expect(options.narrativeStyleOptions[0].label).toBe('转化结构');
  });

  it('prioritizes music-related groups for MV workflow', () => {
    const options = getCreativeBriefPresetOptions('mv');

    expect(options.purposeOptions[0].label).toBe('音乐/MV');
    expect(options.directorStyleOptions[0].label).toBe('音乐视觉');
    expect(options.narrativeStyleOptions[0].label).toBe('音乐/MV叙事');
    expect(options.purposeOptions[0].options[0]).toMatchObject({
      label: '音乐 MV',
    });
    expect(options.purposeOptions[0].options).toContainEqual(expect.objectContaining({
      label: '歌词意象短片',
    }));
    expect(options.directorStyleOptions[0].options[0]).toMatchObject({
      label: 'MV 视觉导演',
    });
    expect(options.narrativeStyleOptions[0].options[0]).toMatchObject({
      label: '歌词画面化',
    });
  });
});
