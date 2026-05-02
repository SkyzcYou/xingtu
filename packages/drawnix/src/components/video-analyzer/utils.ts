import type {
  AnalysisRecord,
  ProductInfo,
  ScriptVersion,
  VideoAnalysisData,
  VideoShot,
  VideoCharacter,
} from './types';
import { generateUUID } from '../../utils/runtime-helpers';
import { computeSegmentPlan } from '../../utils/segment-plan';
import { getVideoModelConfig } from '../../constants/video-model-config';
import {
  DEFAULT_ORIGINAL_VERSION_ID,
  appendVersionToRecord,
  buildCharacterReferencePrompt,
  buildVideoPrompt,
  buildFramePrompt,
  formatCreativeBriefPromptBlock,
  type CreativeBrief,
  readStoredModelSelection,
  switchVersionInRecord,
  writeStoredModelSelection,
  updateActiveVersionShotsInRecord,
} from '../shared/workflow';

export { buildVideoPrompt, buildFramePrompt, buildCharacterReferencePrompt };
export { readStoredModelSelection, writeStoredModelSelection };

function extractJsonObject(text: string): string {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('响应为空，未找到有效 JSON');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] || trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start < 0 || end <= start) {
    throw new Error('响应中未找到有效 JSON');
  }

  return candidate.slice(start, end + 1);
}

function toNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function buildVideoPromptGenerationPrompt(params: {
  userPrompt: string;
  pdfAttachmentName?: string;
  creativeBrief?: CreativeBrief | null;
}): string {
  const userPrompt = String(params.userPrompt || '').trim();
  const pdfAttachmentName = String(params.pdfAttachmentName || '').trim();
  const creativeBriefSection = formatCreativeBriefPromptBlock(
    params.creativeBrief,
    'popular_video'
  );
  const contextSources = [
    '用户提示词',
    ...(creativeBriefSection ? ['专业创作 Brief'] : []),
    ...(pdfAttachmentName ? ['参考 PDF'] : []),
  ].join('、');
  const pdfSection = pdfAttachmentName
    ? [
        `参考 PDF：本次请求附带 PDF「${pdfAttachmentName}」。`,
        '- 请优先阅读 PDF 内容，提取品牌/产品定位、受众、卖点、事实信息、视觉线索和禁忌边界。',
        '- 用户提示词用于限定目标、风格和取舍；PDF 是主要上下文之一。若两者冲突，以用户提示词为准。',
        '- 不要复述 PDF 原文，要重组为适合短视频生成的镜头脚本。',
      ].join('\n')
    : '';

  return `你是爆款短视频脚本策划和视频生成提示词工程师。请根据${contextSources}，直接规划一个可进入视频生成流程的 VideoAnalysisData 兼容结构化短视频脚本，并只返回合法 JSON。

用户提示词：
${userPrompt || '围绕一个适合短视频传播的主题，策划一条完整视频。'}

${creativeBriefSection ? `${creativeBriefSection}\n` : ''}
${pdfSection ? `${pdfSection}\n` : ''}
JSON 字段要求：
- totalDuration: 计划视频总时长（秒）
- productExposureDuration: 产品/主题核心露出时长（秒），没有具体产品时按核心主题出现时长估算
- productExposureRatio: 核心露出占比（0-100）
- shotCount: 镜头总数
- firstProductAppearance: 核心产品/主题首次出现时间（秒）
- aspect_ratio: 从 '16x9'、'9x16'、'1x1' 中选择最适合的平台比例
- video_style: 整体视频风格，包含光影、色调、美术风格
- bgm_mood: 背景音乐情绪
- suggestion: 后续生成建议
- characters: 固定角色列表，无角色则返回 []。每个角色包含 id、name、description，其中 description 必须是英文外貌描述
- shots: 镜头数组，每个镜头包含 id、startTime、endTime、duration、description、first_frame_prompt、last_frame_prompt、camera_movement、type、label、narration、dialogue、dialogue_speakers、speech_relation、transition_hint、character_ids

规划要求：
1. 结构必须兼容视频分析结果，shots 的时间轴必须连续，duration 等于 endTime - startTime。
2. first_frame_prompt 与 last_frame_prompt 必须可直接用于文生图模型，写清主体、构图、动作状态、光线、背景和必要文字。
3. narration 是画外音；dialogue 是角色台词。speech_relation 必须与 narration/dialogue 是否为空一致。
4. 相邻镜头要有可拼接的视觉锚点、动作延续或转场提示。
5. 所有可读内容使用与用户提示词相同的语言；characters[].description 使用英文。
6. 只返回 JSON，不要 markdown。`;
}

export function parseVideoPromptGenerationResponse(
  text: string
): VideoAnalysisData {
  const parsed = JSON.parse(extractJsonObject(text)) as Partial<VideoAnalysisData>;
  const rawShots = Array.isArray(parsed.shots) ? parsed.shots : [];
  if (rawShots.length === 0) {
    throw new Error('响应中未找到有效镜头数据');
  }

  const shots = rawShots.map((shot, index) => {
    const fallbackStart =
      index === 0 ? 0 : toNumber(rawShots[index - 1]?.endTime, index * 5);
    const startTime = toNumber(shot.startTime, fallbackStart);
    const endTime = toNumber(shot.endTime, startTime + toNumber(shot.duration, 5));
    return {
      ...shot,
      id: String(shot.id || `shot_${index + 1}`),
      startTime,
      endTime,
      duration: toNumber(shot.duration, Math.max(0, endTime - startTime)),
      type: shot.type || 'scene',
      label: String(shot.label || `镜头 ${index + 1}`),
      description: String(shot.description || ''),
      narration: String(shot.narration || ''),
      dialogue: String(shot.dialogue || ''),
      dialogue_speakers: String(shot.dialogue_speakers || ''),
      speech_relation: shot.speech_relation || 'none',
      character_ids: Array.isArray(shot.character_ids) ? shot.character_ids : [],
    } as VideoShot;
  });
  const totalDuration = toNumber(
    parsed.totalDuration,
    shots[shots.length - 1]?.endTime || shots.length * 5
  );

  return {
    totalDuration,
    productExposureDuration: toNumber(parsed.productExposureDuration, totalDuration),
    productExposureRatio: toNumber(parsed.productExposureRatio, 100),
    shotCount: toNumber(parsed.shotCount, shots.length),
    firstProductAppearance: toNumber(parsed.firstProductAppearance, 0),
    suggestion: String(parsed.suggestion || ''),
    video_style: parsed.video_style,
    bgm_mood: parsed.bgm_mood,
    aspect_ratio: parsed.aspect_ratio || '9x16',
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    shots,
  };
}

export function buildScriptRewritePrompt(params: {
  recordAnalysis: VideoAnalysisData;
  productInfo: ProductInfo;
  videoModel: string;
  characterDescription?: string;
  characters?: VideoCharacter[];
}): string {
  const { recordAnalysis, productInfo, videoModel, characterDescription, characters } = params;
  const hasCharacters = (characters && characters.length > 0) || !!characterDescription;
  const originalShots = JSON.stringify(recordAnalysis.shots.map(s => ({
    id: s.id,
    label: s.label,
    type: s.type,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.duration,
    description: s.description,
    narration: s.narration,
    dialogue: s.dialogue || '',
    dialogue_speakers: s.dialogue_speakers,
    speech_relation: s.speech_relation || 'none',
    first_frame_prompt: s.first_frame_prompt,
    last_frame_prompt: s.last_frame_prompt,
    camera_movement: s.camera_movement,
    character_ids: s.character_ids || [],
  })));

  const cfg = getVideoModelConfig(videoModel);
  const selectedSegmentDuration =
    productInfo.segmentDuration ||
    parseInt(cfg.defaultDuration, 10) ||
    8;
  const singleOption = [
    { label: `${selectedSegmentDuration}秒`, value: String(selectedSegmentDuration) },
  ];
  const targetDur = productInfo.targetDuration || recordAnalysis.totalDuration;
  const segmentPlan = computeSegmentPlan(targetDur, singleOption);
  const { segments, actualTotal, isFixed, overflow } = segmentPlan;
  const segmentCount = segments.length;

  const durationInfo = isFixed
    ? `当前视频模型（${videoModel}）为固定时长模型，每段固定 ${segments[0]} 秒。
实际可用视频总时长：${actualTotal} 秒（${segmentCount} 段 × ${segments[0]} 秒/段）${overflow > 0 ? `，比目标 ${targetDur} 秒多出 ${overflow} 秒` : ''}。
请按 ${actualTotal} 秒总时长分配内容节奏。`
    : `目标视频总时长：${targetDur} 秒。
分段方案：${segments.map((d, i) => `第${i + 1}段 ${d}s`).join('、')}，实际总时长 ${actualTotal} 秒。
每个镜头的 duration 必须等于对应段的可用时长。`;

  return `你是一个短视频脚本改编专家。请基于以下原始视频脚本，改编脚本。

原始视频信息：
- 总时长：${recordAnalysis.totalDuration}秒
- 风格：${recordAnalysis.video_style || '未知'}
- BGM 情绪：${recordAnalysis.bgm_mood || '未知'}
- 画面比例：${recordAnalysis.aspect_ratio || '16x9'}
${hasCharacters && characters && characters.length > 0 ? `
角色信息（改编时必须保持角色外貌一致）：
${characters.map(c => `- ${c.id}（${c.name}）：${c.description}`).join('\n')}
` : ''}
原始镜头脚本：
${originalShots}

用户提示词：
${productInfo.prompt || '未指定'}

${formatCreativeBriefPromptBlock(productInfo.creativeBrief, 'popular_video')}

视频生成约束：
- 使用的视频模型：${videoModel}
- ${durationInfo}
- 需要 ${segmentCount} 个视频片段拼接成完整视频

改编要求（所有字段必须使用与用户提示词相同的语言）：
1. **description（画面描述）**：根据用户提示词”${productInfo.prompt || ''}”改编画面内容，详细描述场景、人物、动作、光线、色调${characterDescription ? `；若画面中有角色，必须保持角色描述与”${characterDescription}”一致` : ''}
2. **narration（旁白）**：画外音/解说词，无旁白则为空字符串
3. **dialogue（角色说话）**：角色台词，无角色说话则为空字符串；多角色请按”角色名: 台词”分行输出
4. **dialogue_speakers（对白角色）**：单角色填角色名，多角色用”角色A|角色B”按发言顺序列出；无对白填空字符串
5. **speech_relation（旁白与对白关系）**：必须是 'none' | 'narration_only' | 'dialogue_only' | 'both' 之一，并与 narration/dialogue 是否为空严格一致
6. **first_frame_prompt（首帧图片提示词）**：用于生成镜头开场画面，需精确描述主体位置、动作起始状态、构图、光线与背景${hasCharacters ? `；若该镜头有角色（character_ids 非空），必须在 prompt 中包含对应角色的完整外貌描述` : ''}
7. **last_frame_prompt（尾帧图片提示词）**：用于生成镜头结尾画面，需精确描述主体位置、动作定格状态、构图、光线与背景${hasCharacters ? `；若该镜头有角色（character_ids 非空），必须在 prompt 中包含对应角色的完整外貌描述` : ''}
8. **camera_movement（运镜方式）**：根据新内容适当调整
9. **character_ids（角色 ID 列表）**：保留原镜头的 character_ids，若改编后该镜头不再涉及角色则设为空数组 []
${characterDescription ? `10. **character_description（角色描述）**：所有镜头统一填写”${characterDescription}”，不得修改` : ''}

拼接衔接要求（极其重要！）：
1. 视觉锚点：相邻镜头之间必须有一个共同的视觉元素（同一商品、同一场景、同一手部动作），确保画面连贯
2. 运镜方向延续：如果一个镜头结尾是向右平移(pan right)，下一个镜头开头应继续向右或保持静止，不能突然反向
3. 色调一致性：所有镜头统一使用相同的色调和光线风格
4. 动作连贯：如果一个镜头结尾主体正在做某个动作，下一个镜头开头要延续这个动作

每个镜头的额外输出字段：
- **transition_hint**：到下一个镜头的转场方式，从 'cut'(硬切)、'dissolve'(交叉溶解)、'match_cut'(匹配切)、'fade_to_black'(淡出到黑) 中选择。同场景内推荐 'cut'，跨场景推荐 'dissolve'，最后一个镜头设为 'fade_to_black'

重要：所有字段的值必须使用与用户提示词相同的语言，保持语言一致性。

返回一个 JSON 数组，每个元素包含：id、startTime、endTime、duration、description、narration、dialogue、dialogue_speakers、speech_relation、first_frame_prompt、last_frame_prompt、camera_movement、label、type、transition_hint、character_ids${characterDescription ? '、character_description' : ''} 字段。
只返回 JSON 数组，不要 markdown 格式。`;
}

export function parseRewriteShotUpdates(text: string): Array<Partial<VideoShot> & { id: string }> {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Array<Partial<VideoShot> & { id: string }>;
    } catch {
      // JSON 被截断，尝试提取已完成的对象
    }
  }

  // 逐个提取完整的 JSON 对象（应对 AI 输出被截断的情况）
  const objects: Array<Partial<VideoShot> & { id: string }> = [];
  const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj === 'object' && obj.id) {
        objects.push(obj);
      }
    } catch {
      // 跳过不完整的对象
    }
  }

  if (objects.length > 0) return objects;
  throw new Error('响应中未找到有效 JSON（可能因输出过长被截断）');
}

export function applyRewriteShotUpdates(
  currentShots: VideoShot[],
  updates: Array<Partial<VideoShot> & { id: string }>
): VideoShot[] {
  if (updates.length > 0 && updates[0].startTime !== undefined) {
    return updates.map((update, index) => ({
      ...(currentShots.find(shot => shot.id === update.id) || currentShots[index] || {}),
      ...update,
      id: update.id || `shot_${index + 1}`,
    })) as VideoShot[];
  }

  return currentShots.map(shot => {
    const update = updates.find(item => item.id === shot.id);
    return update ? { ...shot, ...update } : shot;
  });
}

// ── 脚本版本管理 ──

const MAX_SCRIPT_VERSIONS = 10;

/** 从当前 shots 创建一个版本快照 */
export function createScriptVersion(
  shots: VideoShot[],
  label: string,
  prompt?: string
): ScriptVersion {
  return {
    id: generateUUID(),
    createdAt: Date.now(),
    label,
    prompt,
    shots: structuredClone(shots),
  };
}

/** 将新版本追加到记录，同时更新 editedShots + activeVersionId，返回 patch */
export function addVersionToRecord(
  record: AnalysisRecord,
  version: ScriptVersion
): Partial<AnalysisRecord> {
  return appendVersionToRecord(record, 'scriptVersions', version, MAX_SCRIPT_VERSIONS, {
    editedShots: version.shots,
  });
}

/** 原始分析版本的特殊 ID */
export const ORIGINAL_VERSION_ID = DEFAULT_ORIGINAL_VERSION_ID;

/** 切换到指定版本，返回 record patch；版本不存在返回 null */
export function switchToVersion(
  record: AnalysisRecord,
  versionId: string
): Partial<AnalysisRecord> | null {
  return switchVersionInRecord(record, 'scriptVersions', versionId, {
    getVersionPatch: (version) => ({ editedShots: version.shots }),
    getOriginalPatch: () => ({
      editedShots: [...record.analysis.shots],
    }),
    originalVersionId: ORIGINAL_VERSION_ID,
  });
}

/** 更新 editedShots 时同步更新 scriptVersions 中活跃版本的 shots */
export function updateActiveShotsInRecord(
  record: AnalysisRecord,
  updatedShots: VideoShot[]
): Partial<AnalysisRecord> {
  return updateActiveVersionShotsInRecord(record, 'scriptVersions', updatedShots);
}
