import { describe, expect, it } from 'vitest';
import { buildMVResetPayload, buildMVWorkflowExportOptions } from './generate-page-helpers';
import type { MVRecord, VideoShot } from './types';
import type { WorkflowExportAssetItem } from '../../utils/workflow-generation-utils';

describe('mv-creator generate helpers', () => {
  it('builds workflow export options with selected audio', () => {
    const shots: VideoShot[] = [
      {
        id: 'shot_1',
        startTime: 0,
        endTime: 5,
        description: '镜头描述',
        narration: '',
        type: 'opening',
        label: '开场',
      },
    ];
    const record: MVRecord = {
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      musicTitle: '歌名',
      musicStyleTags: ['pop'],
      aspectRatio: '1x1',
      videoStyle: '霓虹',
      creativeBrief: {
        purpose: '品牌广告',
        directorStyle: '高质感广告导演',
      },
      selectedClipId: 'clip_1',
      generatedClips: [
        {
          clipId: 'clip_1',
          audioUrl: 'https://example.com/audio.mp3',
          taskId: 'task_1',
        },
      ],
    };
    const assets: WorkflowExportAssetItem[] = [
      { url: 'https://example.com/frame.png', type: 'image', kind: 'first', shotIndex: 0 },
    ];

    const options = buildMVWorkflowExportOptions(record, shots, assets);

    expect(options.recordMeta).toMatchObject({
      musicTitle: '歌名',
      musicStyleTags: ['pop'],
      aspectRatio: '1x1',
      videoStyle: '霓虹',
      creativeBriefSummary: expect.stringContaining('视频用途/场景：品牌广告'),
      shotCount: 1,
    });
    expect(options.audioAsset).toMatchObject({
      url: 'https://example.com/audio.mp3',
      fallbackExtension: 'mp3',
    });
    expect(options.scriptMarkdown).toContain('# 爆款MV脚本');
    expect(options.scriptMarkdown).toContain('## 创作 Brief');
  });

  it('marks missing audio when no clip is selected', () => {
    const record: MVRecord = {
      id: 'mv_2',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
    };

    const options = buildMVWorkflowExportOptions(record, [], []);

    expect(options.audioAsset).toEqual({
      url: '',
      missingErrorMessage: '缺少已选中的音乐文件',
    });
  });

  it('builds reset payload from record characters only', () => {
    const shots: VideoShot[] = [{
      id: 'shot_1',
      startTime: 0,
      endTime: 5,
      description: '镜头描述',
      narration: '',
      type: 'opening',
      label: '开场',
      generated_first_frame_url: 'first-url',
    }];

    const payload = buildMVResetPayload(
      {
        characters: [{
          id: 'char_1',
          name: '主角',
          description: 'mv-char',
          referenceImageUrl: 'ref-url',
        }],
      },
      shots
    );

    expect(payload.shots[0].generated_first_frame_url).toBeUndefined();
    expect(payload.shots[0].suppressed_generated_urls?.first).toBe('first-url');
    expect(payload.characters[0].description).toBe('mv-char');
    expect(payload.characters[0].referenceImageUrl).toBeUndefined();
  });
});
