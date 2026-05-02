import { describe, expect, it } from 'vitest';
import {
  buildScriptRewritePrompt,
  buildVideoPromptGenerationPrompt,
  parseVideoPromptGenerationResponse,
} from './utils';
import { migrateProductInfo } from './types';

describe('video-analyzer utils', () => {
  it('injects creative brief into script rewrite prompt', () => {
    const prompt = buildScriptRewritePrompt({
      videoModel: 'veo3',
      productInfo: {
        prompt: '防滑拖鞋',
        targetDuration: 8,
        segmentDuration: 8,
        creativeBrief: {
          purpose: '口播种草',
          directorStyle: '快节奏短视频导演',
          narrativeStyle: '痛点-解决-转化',
          negativePrompt: '不要夸大功效',
        },
      },
      recordAnalysis: {
        totalDuration: 8,
        productExposureDuration: 0,
        productExposureRatio: 0,
        shotCount: 1,
        firstProductAppearance: 0,
        shots: [{
          id: 'shot_1',
          startTime: 0,
          endTime: 8,
          duration: 8,
          description: '旧画面',
          type: 'opening',
          label: '开场',
        }],
      },
    });

    expect(prompt).toContain('创作 Brief');
    expect(prompt).toContain('视频用途/场景：口播种草');
    expect(prompt).toContain('调整开场钩子、卖点顺序、口播密度、镜头内容形态');
    expect(prompt).toContain('避免：不要夸大功效');
  });

  it('migrates old product info without creative brief', () => {
    const migrated = migrateProductInfo({ prompt: '旧提示词' }, 12);

    expect(migrated.prompt).toBe('旧提示词');
    expect(migrated.targetDuration).toBe(12);
    expect(migrated.creativeBrief).toEqual({});
  });

  it('builds prompt-start instructions with PDF context', () => {
    const prompt = buildVideoPromptGenerationPrompt({
      userPrompt: '给防滑拖鞋做一条小红书爆款视频',
      pdfAttachmentName: '品牌资料.pdf',
      creativeBrief: {
        purpose: '口播种草',
        directorStyle: '快节奏短视频导演',
        narrativeStyle: '痛点-解决-转化',
      },
    });

    expect(prompt).toContain('参考 PDF：本次请求附带 PDF「品牌资料.pdf」');
    expect(prompt).toContain('创作 Brief');
    expect(prompt).toContain('视频用途/场景：口播种草');
    expect(prompt).toContain('VideoAnalysisData');
    expect(prompt).toContain('只返回 JSON，不要 markdown');
    expect(prompt).toContain('first_frame_prompt');
  });

  it('parses prompt-start response into video analysis data', () => {
    const analysis = parseVideoPromptGenerationResponse(`\`\`\`json
{
  "totalDuration": 8,
  "productExposureDuration": 8,
  "productExposureRatio": 100,
  "shotCount": 1,
  "firstProductAppearance": 0,
  "aspect_ratio": "9x16",
  "video_style": "明亮清爽",
  "bgm_mood": "轻快",
  "suggestion": "先出首帧再生成视频",
  "characters": [],
  "shots": [
    {
      "id": "shot_1",
      "startTime": 0,
      "endTime": 8,
      "description": "雨天门口展示防滑拖鞋",
      "type": "product",
      "label": "防滑展示"
    }
  ]
}
\`\`\``);

    expect(analysis.shotCount).toBe(1);
    expect(analysis.aspect_ratio).toBe('9x16');
    expect(analysis.shots[0]).toMatchObject({
      id: 'shot_1',
      duration: 8,
      narration: '',
      speech_relation: 'none',
    });
  });
});
