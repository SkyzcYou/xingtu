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
    expect(prompt).toContain('完整服装款式、服装颜色、材质和配饰');
    expect(prompt).toContain('不得重新设计衣服');
    expect(prompt).toContain('歌词意象、相似案例和相似剧情只作背景');
    expect(prompt).toContain('只描述当前段起始画面');
    expect(prompt).toContain('不要写上一段剧情经过');
    expect(prompt).toContain('非空时必须沿用同一人物和同一套服装');
    expect(prompt).toContain('不写下一镜头剧情');
    expect(prompt).toContain('原创性与合规要求');
  });

  it('injects creative brief into MV rewrite prompt', () => {
    const characterShot: VideoShot = {
      ...shot,
      character_ids: ['char_1'],
    };
    const record: MVRecord = {
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      selectedClipDuration: 8,
      videoStyle: '霓虹',
      characters: [
        {
          id: 'char_1',
          name: '主角',
          description: 'young woman with short black hair, wearing a silver jacket',
        },
      ],
      creativeBrief: {
        directorStyle: 'MV 视觉导演',
        narrativeStyle: '歌词画面化',
        pacing: '音乐驱动，随节拍切镜',
      },
    };

    const prompt = buildMVScriptRewritePrompt({
      record,
      currentShots: [characterShot],
      rewritePrompt: '更强烈一点',
      videoModel: 'veo3',
      segmentDuration: 8,
    });

    expect(prompt).toContain('创作 Brief');
    expect(prompt).toContain('导演风格：MV 视觉导演');
    expect(prompt).toContain('节奏策略：音乐驱动，随节拍切镜');
    expect(prompt).toContain('同一人物、同一发型、同一套衣服');
    expect(prompt).toContain('只改变结尾姿态、表情、动作、镜头角度或环境');
    expect(prompt).toContain('故事、相似案例或相似剧情只作背景');
    expect(prompt).toContain('不要复述到 first_frame_prompt/last_frame_prompt');
    expect(prompt).toContain('只描述当前段起始画面');
    expect(prompt).toContain('非空尾帧只写本镜头结束画面');
    expect(prompt).toContain('"video_style"');
    expect(prompt).toContain('原创性与合规要求');
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
