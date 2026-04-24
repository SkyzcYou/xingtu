import { useState, useEffect, useCallback } from 'react';
import { promptForApiKey } from '../../../utils/gemini-api';
import { CACHE_DURATION } from './size-constants';
import { classifyApiCredentialError } from '../../../utils/api-auth-error-event';

const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name || 'Error';
  }
  return 'Unknown error';
};

export const isInvalidTokenError = (errorMessage: string): boolean => {
  return classifyApiCredentialError(errorMessage) === 'invalid';
};

export const notifyGenerationStateChange = (
  generating: boolean, 
  loading: boolean, 
  type: 'image' | 'video'
) => {
  const eventDetail = type === 'image' 
    ? { isGenerating: generating, imageLoading: loading }
    : { isGenerating: generating, videoLoading: loading };
    
  window.dispatchEvent(new CustomEvent('ai-generation-state-change', {
    detail: eventDetail
  }));
};

export const handleApiKeyError = async (errorMessage: string, language: 'zh' | 'en') => {
  if (!isInvalidTokenError(errorMessage)) {
    return null;
  }

  try {
    const newApiKey = await promptForApiKey();
    if (newApiKey) {
      // promptForApiKey 内部已经更新了 geminiSettings 并同步到 SW
      return null; // Success, no error
    } else {
      return language === 'zh' 
        ? '需要有效的API Key才能生成内容' 
        : 'Valid API Key is required to generate content';
    }
  } catch (apiKeyError) {
    // 只记录错误类型，不记录详细信息（可能包含敏感数据）
    console.error('API Key setup error:', getSafeErrorMessage(apiKeyError));
    return language === 'zh' 
      ? 'API Key设置失败，请稍后重试' 
      : 'API Key setup failed, please try again later';
  }
};

export interface PreviewCacheBase {
  prompt: string;
  timestamp: number;
}

export const createCacheManager = <T extends PreviewCacheBase>(cacheKey: string) => ({
  save: (data: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save preview cache:', error);
    }
  },
  
  load: (): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached) as T;
        const now = Date.now();
        const cacheAge = now - data.timestamp;
        if (cacheAge < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to load preview cache:', error);
    }
    return null;
  },
  
  clear: () => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
});

export const useKeyboardShortcuts = (
  isGenerating: boolean,
  prompt: string,
  onGenerate: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isGenerating && prompt.trim()) {
          onGenerate();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGenerating, prompt, onGenerate]);
};

export const useGenerationState = (type: 'image' | 'video') => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const updateIsGenerating = useCallback((value: boolean) => {
    setIsGenerating(value);
    notifyGenerationStateChange(value, isLoading, type);
  }, [isLoading, type]);
  
  const updateIsLoading = useCallback((value: boolean) => {
    setIsLoading(value);
    notifyGenerationStateChange(isGenerating, value, type);
  }, [isGenerating, type]);
  
  return {
    isGenerating,
    isLoading,
    updateIsGenerating,
    updateIsLoading
  };
};

export const getPromptExample = (
  language: 'zh' | 'en',
  type: 'image' | 'video',
  videoProvider?: 'sora' | 'veo' | string
) => {
  if (type === 'image') {
    return language === 'zh'
      ? '一只可爱的小猫坐在窗台上，阳光透过窗户洒在它的毛发上，背景是温馨的家居环境'
      : 'A cute kitten sitting on a windowsill, with sunlight streaming through the window onto its fur, with a cozy home environment in the background';
  } else {
    // For Sora models, include @ mention hint in the placeholder
    if (videoProvider === 'sora') {
      return language === 'zh'
        ? '描述视频内容，输入 @ 可引用已创建的角色，如 @username 在海边漫步...'
        : 'Describe video content, type @ to reference created characters, e.g. @username walking on the beach...';
    }
    return language === 'zh'
      ? '生成一个美丽的日出场景，阳光从山峰后缓缓升起，云朵轻柔地飘动'
      : 'Generate a beautiful sunrise scene where the sun slowly rises from behind mountains with clouds gently floating';
  }
};

export interface PromptOptimizationRequestOptions {
  originalPrompt: string;
  optimizationRequirements?: string;
  language: 'zh' | 'en';
  type: 'image' | 'video';
  mode?: 'polish' | 'structured';
}

export const buildPromptOptimizationRequest = ({
  originalPrompt,
  optimizationRequirements,
  language,
  type,
  mode = 'polish',
}: PromptOptimizationRequestOptions): string => {
  const trimmedPrompt = originalPrompt.trim();
  const trimmedRequirements = optimizationRequirements?.trim() || '';
  const modalityLabel =
    language === 'zh'
      ? type === 'image'
        ? '图片生成'
        : '视频生成'
      : type === 'image'
      ? 'image generation'
      : 'video generation';
  const domainFocus =
    language === 'zh'
      ? type === 'image'
        ? '重点补足主体、构图、风格、光线、材质与画面细节。'
        : '重点补足主体动作、镜头语言、运镜、时序、转场与画面连续性。'
      : type === 'image'
      ? 'Improve subject detail, composition, style, lighting, materials, and visual detail.'
      : 'Improve subject motion, camera language, camera movement, timing, transitions, and continuity.';
  const isStructuredMode = mode === 'structured';

  if (isStructuredMode) {
    if (language === 'zh') {
      return [
        `你是一名专业的${modalityLabel}结构化提示词设计师。`,
        '请把原始需求整理成适合复杂场景生成的 JSON 结构化提示词。',
        '',
        '目标：',
        '1. 保留用户原始意图，不要擅自改题。',
        '2. 将复杂场景拆解为稳定、可复用、可继续编辑的结构字段。',
        '3. 如果原文中有明确的布局、数量、标题、区域、主体、材质、风格、时间线、图例、标注等信息，尽量显式结构化。',
        `4. ${domainFocus}`,
        '5. 只输出一个合法 JSON 对象，不要解释、不要标题、不要 Markdown 代码块。',
        '',
        'JSON 结构要求：',
        '1. 顶层优先包含这些键：type、instruction、style、layout。',
        '2. style 是对象，放背景、主体风格、材质、镜头或质感等。',
        '3. layout 是对象，放标题、分区、数量、位置、图例、时间轴、主体布局等。',
        '4. 对复杂主体区域，优先使用 centerpiece、focal_point、sections、annotations、timeline、legends 等语义化字段。',
        '5. 数量必须用数字，枚举信息尽量使用数组。',
        '6. 不确定的扩展项可以补充 defaults、constraints、notes，但保持简洁。',
        '7. 如果用户已经给了某种 JSON 雏形，要在其基础上补全，而不是完全推翻重写。',
        '',
        '输出风格要求：',
        '1. value 尽量写成可直接给生图/生视频模型使用的短句或短段落。',
        '2. 字段命名保持英文 snake_case 或 lowerCamelCase 二选一，但同一份 JSON 内保持一致。',
        '3. 内容语言尽量与原始提示词一致。',
        '',
        '【原始提示词】',
        trimmedPrompt,
        '',
        '【补充要求】',
        trimmedRequirements ||
          '将其整理成适合复杂结构场景的 JSON 提示词，便于后续继续扩写与复用。',
      ].join('\n');
    }

    return [
      `You are a professional ${modalityLabel} prompt architect for structured prompts.`,
      'Transform the original request into a JSON-based structured prompt for complex scenes.',
      '',
      'Goals:',
      '1. Preserve the original intent without changing the subject.',
      '2. Decompose the scene into stable, reusable, and editable fields.',
      '3. Explicitly structure layout, counts, titles, regions, subjects, materials, style, timeline, legends, labels, and annotations whenever present.',
      `4. ${domainFocus}`,
      '5. Output exactly one valid JSON object. No explanation, no title, no Markdown code fence.',
      '',
      'JSON structure rules:',
      '1. Prefer these top-level keys: type, instruction, style, layout.',
      '2. style should be an object for background, subject style, materials, camera, rendering, or texture.',
      '3. layout should be an object for title, sections, counts, positions, legends, timelines, and composition.',
      '4. For the main subject area, prefer semantic fields such as centerpiece, focal_point, sections, annotations, timeline, or legends.',
      '5. Use numbers for counts and arrays for enumerations whenever possible.',
      '6. Add defaults, constraints, or notes only when useful, and keep them concise.',
      '7. If the user already provided a JSON draft, extend and normalize it instead of replacing it entirely.',
      '',
      'Output style rules:',
      '1. Values should be concise and directly usable for downstream generation.',
      '2. Use either snake_case or lowerCamelCase field names, but stay consistent within the same JSON.',
      '3. Keep the language aligned with the original prompt as much as possible.',
      '',
      '[Original Prompt]',
      trimmedPrompt,
      '',
      '[Additional Requirements]',
      trimmedRequirements ||
        'Restructure it into a reusable JSON prompt for a complex visual scene.',
    ].join('\n');
  }

  if (language === 'zh') {
    return [
      `你是一名专业的${modalityLabel}提示词优化助手。`,
      '请基于原始提示词和优化要求，输出一版可直接用于生成的最终提示词。',
      '',
      '要求：',
      '1. 保持原始提示词的核心意图，不要偏题。',
      '2. 优先满足优化要求；如果优化要求为空，仅做必要润色与结构优化。',
      '3. 保持与原始提示词相同的语言风格；原文中英混合时，尽量沿用原表达。',
      '4. 如果原始提示词已经较完整，只做轻量优化，避免无意义堆砌。',
      `5. ${domainFocus}`,
      '6. 只输出最终优化后的提示词，不要解释、不要加标题、不要用代码块。',
      '',
      '【原始提示词】',
      trimmedPrompt,
      '',
      '【优化要求】',
      trimmedRequirements || '无，做通顺、准确、可执行的轻量优化。',
    ].join('\n');
  }

  return [
    `You are a professional ${modalityLabel} prompt optimizer.`,
    'Based on the original prompt and refinement requirements, output one final prompt that can be used directly.',
    '',
    'Requirements:',
    '1. Preserve the core intent of the original prompt.',
    '2. Prioritize the refinement requirements; if they are empty, only do light polishing and restructuring.',
    '3. Keep the same language style as the original prompt. If the original is mixed-language, preserve that style when possible.',
    '4. If the original prompt is already detailed, only refine lightly and avoid unnecessary expansion.',
    `5. ${domainFocus}`,
    '6. Output only the final optimized prompt. No explanation, no title, no code block.',
    '',
    '[Original Prompt]',
    trimmedPrompt,
    '',
    '[Refinement Requirements]',
    trimmedRequirements || 'None. Apply light polishing for clarity and execution quality.',
  ].join('\n');
};

export const normalizeOptimizedPromptResult = (value: string): string => {
  const trimmed = value.trim();
  const codeFenceMatch = trimmed.match(/^```[\w-]*\n?([\s\S]*?)\n?```$/);
  if (codeFenceMatch) {
    return codeFenceMatch[1].trim();
  }
  return trimmed;
};
