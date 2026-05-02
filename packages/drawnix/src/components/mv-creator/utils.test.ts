import { describe, expect, it } from 'vitest';
import {
  buildMVScriptRewritePrompt,
  buildStoryboardPrompt,
  formatMVShotsMarkdown,
} from './utils';
import type { MVRecord, VideoShot } from './types';

describe('mv-creator utils', () => {
  const shot: VideoShot = {
    id: 'shot_1',
    startTime: 0,
    endTime: 8,
    duration: 8,
    description: '旧分镜',
    narration: '',
    type: 'opening',
    label: '开场',
  };

  it('injects creative brief, style and aspect ratio into storyboard prompt', () => {
    const prompt = buildStoryboardPrompt({
      clipDuration: 8,
      videoModel: 'veo3',
      segmentDuration: 8,
      aspectRatio: '9x16',
      videoStyle: '电影感光影',
      creativeBrief: {
        purpose: '品牌广告',
        directorStyle: '高质感广告导演',
        narrativeStyle: '情绪递进',
      },
    });

    expect(prompt).toContain('画面比例：9x16');
    expect(prompt).toContain('画面风格：电影感光影');
    expect(prompt).toContain('创作 Brief');
    expect(prompt).toContain('视频用途/场景：品牌广告');
    expect(prompt).toContain('歌词画面化和段落推进');
  });

  it('injects creative brief into MV rewrite prompt', () => {
    const record: MVRecord = {
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      selectedClipDuration: 8,
      videoStyle: '霓虹',
      creativeBrief: {
        directorStyle: 'MV 视觉导演',
        narrativeStyle: '歌词画面化',
        pacing: '音乐驱动，随节拍切镜',
      },
    };

    const prompt = buildMVScriptRewritePrompt({
      record,
      currentShots: [shot],
      rewritePrompt: '更强烈一点',
      videoModel: 'veo3',
      segmentDuration: 8,
    });

    expect(prompt).toContain('创作 Brief');
    expect(prompt).toContain('导演风格：MV 视觉导演');
    expect(prompt).toContain('节奏策略：音乐驱动，随节拍切镜');
  });

  it('formats creative brief in MV markdown', () => {
    const markdown = formatMVShotsMarkdown({
      id: 'mv_2',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      creativeBrief: {
        purpose: '品牌广告',
      },
      editedShots: [shot],
    });

    expect(markdown).toContain('## 创作 Brief');
    expect(markdown).toContain('视频用途/场景：品牌广告');
  });
});
