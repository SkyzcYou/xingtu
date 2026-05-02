import { describe, expect, it } from 'vitest';
import {
  buildFramePrompt,
  buildVideoPrompt,
  MAX_VIDEO_GENERATION_PROMPT_LENGTH,
} from './prompt-builders';

describe('prompt-builders', () => {
  it('builds video prompt with style, bgm and character anchor', () => {
    const prompt = buildVideoPrompt(
      {
        id: 'shot_1',
        startTime: 0,
        endTime: 3,
        description: '城市夜景。',
        narration: '旁白内容。',
        dialogue: '你好。',
        dialogue_speakers: '主角',
        speech_relation: 'both',
        first_frame_prompt: '首帧描述。',
        last_frame_prompt: '尾帧描述。',
        camera_movement: '缓慢推近。',
        transition_hint: '硬切。',
        character_description: 'young woman with short hair.',
        type: 'opening',
        label: '开场',
      },
      {
        totalDuration: 10,
        aspect_ratio: '16x9',
        shots: [],
        video_style: '赛博朋克',
        bgm_mood: '紧张',
      }
    );

    expect(prompt).toContain('画面风格：赛博朋克');
    expect(prompt).toContain('BGM情绪：紧张');
    expect(prompt).toContain('角色一致性：The same young woman with short hair');
    expect(prompt).toContain('镜头主题：城市夜景');
  });

  it('prefixes frame prompt with product video style', () => {
    expect(
      buildFramePrompt('角色站在雨夜街头', undefined, {
        videoStyle: '电影感光影',
      })
    ).toBe('电影感光影。当前关键帧：角色站在雨夜街头');
  });

  it('injects creative brief into video and frame prompts', () => {
    const creativeBrief = {
      purpose: '口播种草',
      directorStyle: '快节奏短视频导演',
      narrativeStyle: '痛点-解决-转化',
      targetPlatform: '抖音 / TikTok 竖屏信息流',
      audience: '年轻女性',
      pacing: '前三秒强钩子，全程快节奏',
      negativePrompt: '不要硬广口吻',
    };
    const shot = {
      id: 'shot_1',
      startTime: 0,
      endTime: 3,
      description: '展示产品。',
      type: 'product' as const,
      label: '卖点',
    };

    const videoPrompt = buildVideoPrompt(shot, undefined, { creativeBrief });
    const framePrompt = buildFramePrompt('产品放在桌面上', undefined, { creativeBrief });

    expect(videoPrompt).toContain('创作 Brief');
    expect(videoPrompt).toContain('视频用途/场景：口播种草');
    expect(videoPrompt).toContain('导演风格：快节奏短视频导演');
    expect(videoPrompt).toContain('目标平台：抖音 / TikTok 竖屏信息流');
    expect(videoPrompt).toContain('避免：不要硬广口吻');
    expect(framePrompt).toContain('单镜头生成必须继承导演风格');
    expect(framePrompt).toContain('当前关键帧：产品放在桌面上');
  });

  it('injects generation context and frame characters', () => {
    const prompt = buildFramePrompt(
      '主角站在舞台中央',
      {
        totalDuration: 8,
        aspect_ratio: '9x16',
        shots: [],
        bgm_mood: 'Synth Pop',
      },
      {
        prompt: '城市夜跑 MV',
        generationContext: '音乐标题：追光\n歌词/意象：穿过雨夜',
      },
      {
        shot: { character_ids: ['char_1'] },
        characters: [
          {
            id: 'char_1',
            name: '主角',
            description: 'young woman in a silver running jacket',
          },
        ],
        continueFromPreviousFrame: true,
      }
    );

    expect(prompt).toContain('生成上下文');
    expect(prompt).toContain('用户目标/主题：城市夜跑 MV');
    expect(prompt).toContain('音乐标题：追光');
    expect(prompt).toContain('画面内角色：主角: young woman in a silver running jacket');
    expect(prompt).toContain('连续性要求');
  });

  it('drops low-weight video context before required shot prompt when too long', () => {
    const longBrief = '创意上下文'.repeat(140);
    const prompt = buildVideoPrompt(
      {
        id: 'shot_1',
        startTime: 0,
        endTime: 5,
        description: '核心镜头画面。',
        first_frame_prompt: '核心首帧。',
        last_frame_prompt: '核心尾帧。',
        camera_movement: '缓慢推进。',
        type: 'scene',
        label: '重点镜头',
      },
      {
        totalDuration: 10,
        aspect_ratio: '9x16',
        shots: [],
      },
      {
        videoStyle: '电影感',
        bgmMood: '振奋',
        generationContext: '背景资料'.repeat(180),
        creativeBrief: {
          purpose: longBrief,
          directorStyle: longBrief,
          narrativeStyle: longBrief,
          targetPlatform: longBrief,
          audience: longBrief,
          pacing: longBrief,
          negativePrompt: longBrief,
        },
      }
    );

    expect(prompt.length).toBeLessThanOrEqual(MAX_VIDEO_GENERATION_PROMPT_LENGTH);
    expect(prompt).toContain('背景信息：背景资料');
    expect(prompt).toContain('镜头主题：核心镜头画面');
    expect(prompt).toContain('开场关键帧：核心首帧');
    expect(prompt).toContain('结束关键帧：核心尾帧');
    expect(prompt).not.toContain('创作 Brief');
  });

  it('keeps empty frame prompt empty when only creative brief exists', () => {
    expect(
      buildFramePrompt('', undefined, {
        creativeBrief: { purpose: '品牌广告' },
      })
    ).toBe('');
  });
});
