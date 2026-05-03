import { describe, expect, it } from 'vitest';
import {
  AUDIENCE_OPTIONS,
  PACING_OPTIONS,
  TARGET_PLATFORM_OPTIONS,
  getCreativeBriefPresetOptions,
} from './creative-brief';
import { VISUAL_STYLE_OPTIONS } from './style-presets';

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

  it('includes original physical comedy animation presets', () => {
    const options = getCreativeBriefPresetOptions('popular_video');

    expect(options.purposeOptions).toContainEqual(expect.objectContaining({
      label: '动画短片',
      options: expect.arrayContaining([
        expect.objectContaining({ label: '原创物理喜剧短片' }),
        expect.objectContaining({ label: '无对白肢体喜剧' }),
      ]),
    }));
    expect(options.directorStyleOptions).toContainEqual(expect.objectContaining({
      label: '动画导演',
      options: expect.arrayContaining([
        expect.objectContaining({ label: '原创物理喜剧动画导演' }),
        expect.objectContaining({ label: '无对白肢体喜剧导演' }),
      ]),
    }));
    expect(options.narrativeStyleOptions).toContainEqual(expect.objectContaining({
      label: '动画喜剧',
      options: expect.arrayContaining([
        expect.objectContaining({ label: '冲突升级' }),
        expect.objectContaining({ label: '机关连锁反应' }),
      ]),
    }));
    expect(TARGET_PLATFORM_OPTIONS).toContain('儿童/合家欢横屏动画');
    expect(AUDIENCE_OPTIONS).toContain('亲子/合家欢用户');
    expect(PACING_OPTIONS).toContain('物理喜剧，预备-爆发-反应-升级循环');
    expect(VISUAL_STYLE_OPTIONS[0].options).toContainEqual(expect.objectContaining({
      label: '原创物理喜剧动画',
    }));
  });
});
