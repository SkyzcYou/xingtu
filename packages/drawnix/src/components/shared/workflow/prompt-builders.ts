import type {
  VideoAnalysisData,
  VideoCharacter,
  VideoShot,
} from '../../../services/video-analysis-service';
import {
  formatCreativeBriefPromptBlock,
  type CreativeBrief,
} from './creative-brief';

interface WorkflowPromptProductInfo {
  prompt?: string;
  videoStyle?: string;
  bgmMood?: string;
  creativeBrief?: CreativeBrief;
  generationContext?: string;
}

interface WorkflowFramePromptOptions {
  shot?: Pick<VideoShot, 'character_ids'>;
  characters?: VideoCharacter[];
  continueFromPreviousFrame?: boolean;
}

interface WeightedPromptPart {
  text: string;
  contextWeight?: number;
}

export const MAX_VIDEO_GENERATION_PROMPT_LENGTH = 2500;
const PROMPT_SEPARATOR = '。';
const CONTEXT_WEIGHT = {
  creativeBrief: 30,
  generationContext: 40,
  bgmMood: 55,
  videoStyle: 70,
  character: 80,
  continuity: 90,
} as const;

function trimTrailingPeriod(text: string): string {
  return text.replace(/[。.]+$/, '');
}

function compactPromptText(text?: string, maxLength = 700): string {
  const compacted = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compacted) return '';
  return compacted.length > maxLength
    ? `${compacted.slice(0, maxLength)}...`
    : compacted;
}

function buildGenerationContextBlock(
  analysis?: VideoAnalysisData,
  productInfo?: WorkflowPromptProductInfo | null
): string {
  const userPrompt = compactPromptText(productInfo?.prompt, 500);
  const extraContext = compactPromptText(productInfo?.generationContext, 900);
  const aspectRatio = analysis?.aspect_ratio;

  const lines = [
    userPrompt ? `用户目标/主题：${userPrompt}` : '',
    extraContext ? `背景信息：${extraContext}` : '',
    aspectRatio ? `画面比例：${aspectRatio}` : '',
  ].filter(Boolean);

  if (lines.length === 0) return '';

  return [
    '生成上下文：',
    ...lines,
    '使用要求：角色、首帧和镜头必须继承上述主题、世界观、受众、音乐情绪与禁忌，不要只根据单句画面提示发散。',
  ].join('\n');
}

function buildFrameCharacterBlock(
  options?: WorkflowFramePromptOptions
): string {
  const ids = options?.shot?.character_ids || [];
  if (ids.length === 0 || !options?.characters?.length) return '';

  const characterLines = ids
    .map((id) => options.characters?.find((character) => character.id === id))
    .filter((character): character is VideoCharacter => !!character?.description)
    .map((character) => `${character.name || character.id}: ${character.description}`);

  return characterLines.length > 0
    ? `画面内角色：${characterLines.join('; ')}`
    : '';
}

function joinPromptParts(
  parts: WeightedPromptPart[],
  separator = PROMPT_SEPARATOR
): string {
  return parts
    .map((part) => part.text)
    .filter(Boolean)
    .join(separator);
}

function buildWeightedPrompt(
  parts: WeightedPromptPart[],
  maxLength = MAX_VIDEO_GENERATION_PROMPT_LENGTH,
  separator = PROMPT_SEPARATOR
): string {
  const activeParts = parts.filter((part) => part.text);
  let prompt = joinPromptParts(activeParts, separator);

  if (prompt.length <= maxLength) {
    return prompt;
  }

  const removedIndexes = new Set<number>();
  while (prompt.length > maxLength) {
    let dropIndex = -1;
    let dropWeight = Number.POSITIVE_INFINITY;
    let dropLength = -1;

    for (let index = 0; index < activeParts.length; index += 1) {
      if (removedIndexes.has(index)) continue;
      const part = activeParts[index];
      if (typeof part.contextWeight !== 'number') continue;

      if (
        part.contextWeight < dropWeight ||
        (part.contextWeight === dropWeight && part.text.length > dropLength)
      ) {
        dropIndex = index;
        dropWeight = part.contextWeight;
        dropLength = part.text.length;
      }
    }

    if (dropIndex < 0) {
      break;
    }

    removedIndexes.add(dropIndex);
    prompt = joinPromptParts(
      activeParts.filter((_, index) => !removedIndexes.has(index)),
      separator
    );
  }

  return prompt;
}

export function buildVideoPrompt(
  shot: VideoShot,
  analysis?: VideoAnalysisData,
  productInfo?: WorkflowPromptProductInfo | null
): string {
  const description = shot.description ? trimTrailingPeriod(shot.description) : '';
  const cameraMovement = shot.camera_movement
    ? trimTrailingPeriod(shot.camera_movement)
    : '';
  const firstFramePrompt = shot.first_frame_prompt
    ? trimTrailingPeriod(shot.first_frame_prompt)
    : '';
  const lastFramePrompt = shot.last_frame_prompt
    ? trimTrailingPeriod(shot.last_frame_prompt)
    : '';
  const transitionHint = shot.transition_hint
    ? trimTrailingPeriod(shot.transition_hint)
    : '';
  const narration = shot.narration ? trimTrailingPeriod(shot.narration) : '';
  const dialogue = shot.dialogue ? trimTrailingPeriod(shot.dialogue) : '';
  const dialogueSpeakers = shot.dialogue_speakers
    ? trimTrailingPeriod(shot.dialogue_speakers)
    : '';
  const speechRelation = shot.speech_relation
    ? trimTrailingPeriod(shot.speech_relation)
    : narration && dialogue
      ? 'both'
      : narration
        ? 'narration_only'
        : dialogue
          ? 'dialogue_only'
          : 'none';
  const narrationPrompt = narration ? `旁白：${narration}` : '';
  const dialoguePrompt = dialogue
    ? dialogueSpeakers
      ? `角色对白：由${dialogueSpeakers}发言。对白内容：${dialogue}`
      : `角色对白：${dialogue}`
    : '';

  const videoStyle = productInfo?.videoStyle || analysis?.video_style;
  const bgmMood = productInfo?.bgmMood || analysis?.bgm_mood;
  const generationContextBlock = buildGenerationContextBlock(
    analysis,
    productInfo
  );
  const creativeBriefBlock = formatCreativeBriefPromptBlock(
    productInfo?.creativeBrief,
    'generation'
  );

  const characterAnchor = shot.character_description
    ? `The same ${trimTrailingPeriod(shot.character_description)}`
    : '';

  return buildWeightedPrompt([
    { text: '请生成一个真实自然、上下文连贯的单镜头短视频' },
    {
      text: videoStyle ? `画面风格：${trimTrailingPeriod(videoStyle)}` : '',
      contextWeight: CONTEXT_WEIGHT.videoStyle,
    },
    {
      text: bgmMood ? `BGM情绪：${trimTrailingPeriod(bgmMood)}` : '',
      contextWeight: CONTEXT_WEIGHT.bgmMood,
    },
    {
      text: generationContextBlock,
      contextWeight: CONTEXT_WEIGHT.generationContext,
    },
    {
      text: creativeBriefBlock,
      contextWeight: CONTEXT_WEIGHT.creativeBrief,
    },
    {
      text: characterAnchor ? `角色一致性：${characterAnchor}` : '',
      contextWeight: CONTEXT_WEIGHT.character,
    },
    { text: description ? `镜头主题：${description}` : '' },
    { text: narrationPrompt },
    { text: dialoguePrompt },
    { text: `语音关系：${speechRelation}` },
    { text: firstFramePrompt ? `开场关键帧：${firstFramePrompt}` : '' },
    { text: lastFramePrompt ? `结束关键帧：${lastFramePrompt}` : '' },
    { text: cameraMovement ? `运镜方式：${cameraMovement}` : '' },
    { text: transitionHint ? `转场建议：${transitionHint}` : '' },
    { text: '要求主体动作连贯、时序自然、画面风格统一，避免突兀跳变与闪烁' },
  ]);
}

export function buildFramePrompt(
  shotPrompt: string,
  analysis?: VideoAnalysisData,
  productInfo?: WorkflowPromptProductInfo | null,
  options?: WorkflowFramePromptOptions
): string {
  const videoStyle = productInfo?.videoStyle || analysis?.video_style;
  if (!shotPrompt) return shotPrompt;
  const bgmMood = productInfo?.bgmMood || analysis?.bgm_mood;
  const generationContextBlock = buildGenerationContextBlock(
    analysis,
    productInfo
  );
  const creativeBriefBlock = formatCreativeBriefPromptBlock(
    productInfo?.creativeBrief,
    'generation'
  );
  const characterBlock = buildFrameCharacterBlock(options);
  return buildWeightedPrompt([
    {
      text: videoStyle ? trimTrailingPeriod(videoStyle) : '',
      contextWeight: CONTEXT_WEIGHT.videoStyle,
    },
    {
      text: bgmMood ? `BGM情绪：${trimTrailingPeriod(bgmMood)}` : '',
      contextWeight: CONTEXT_WEIGHT.bgmMood,
    },
    {
      text: generationContextBlock,
      contextWeight: CONTEXT_WEIGHT.generationContext,
    },
    {
      text: creativeBriefBlock,
      contextWeight: CONTEXT_WEIGHT.creativeBrief,
    },
    { text: `当前关键帧：${shotPrompt}` },
    {
      text: characterBlock,
      contextWeight: CONTEXT_WEIGHT.character,
    },
    {
      text: options?.continueFromPreviousFrame
        ? '连续性要求：当前首帧必须自然承接上一镜头尾帧参考图，保持主体位置、光线方向、色彩和动作趋势连贯。'
        : '',
      contextWeight: CONTEXT_WEIGHT.continuity,
    },
  ]);
}

export function buildCharacterReferencePrompt(
  character: VideoCharacter,
  analysis?: VideoAnalysisData,
  productInfo?: WorkflowPromptProductInfo | null
): string {
  const videoStyle = productInfo?.videoStyle || analysis?.video_style;
  const bgmMood = productInfo?.bgmMood || analysis?.bgm_mood;
  const generationContextBlock = buildGenerationContextBlock(
    analysis,
    productInfo
  );
  const creativeBriefBlock = formatCreativeBriefPromptBlock(
    productInfo?.creativeBrief,
    'generation'
  );

  return buildWeightedPrompt(
    [
      {
        text: '请生成一个可复用的角色参考图，单个主体，1:1 构图，完整清晰展示角色外貌、发型、服装、气质和材质细节。',
      },
      {
        text: videoStyle ? `画面风格：${trimTrailingPeriod(videoStyle)}` : '',
        contextWeight: CONTEXT_WEIGHT.videoStyle,
      },
      {
        text: bgmMood ? `BGM情绪：${trimTrailingPeriod(bgmMood)}` : '',
        contextWeight: CONTEXT_WEIGHT.bgmMood,
      },
      {
        text: generationContextBlock,
        contextWeight: CONTEXT_WEIGHT.generationContext,
      },
      {
        text: creativeBriefBlock,
        contextWeight: CONTEXT_WEIGHT.creativeBrief,
      },
      { text: `角色名称：${character.name || character.id}` },
      { text: `角色外貌：${character.description}` },
      {
        text: '要求：根据上下文校准角色气质、年代感、职业感、服装和色彩；不要生成多人、文字、Logo、水印或无关背景。',
      },
    ],
    MAX_VIDEO_GENERATION_PROMPT_LENGTH,
    '\n'
  );
}
