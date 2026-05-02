import { getVideoModelConfig } from '../constants/video-model-config';
import { waitForTaskCompletion } from '../services/media-executor/task-polling';
import type { Task } from '../types/task.types';
import type { VideoModel } from '../types/video.types';

const NON_RETRYABLE_VIDEO_ERROR_STATUS_PATTERN =
  /(?:^|[^\d])(?:400|401|402|403|404|413|415|422)(?:[^\d]|$)/;

const NON_RETRYABLE_VIDEO_ERROR_PATTERNS = [
  /invalid\s*(?:request|parameters?|argument|input|field|payload|schema)/i,
  /bad\s*request/i,
  /unprocessable/i,
  /unsupported\s*(?:model|parameter|size|duration|resolution|format|input|image|media)?/i,
  /(?:missing|required)\s*(?:parameter|field|argument|input|prompt|model|duration|size)/i,
  /requires?\s+(?:a\s+)?(?:reference\s+image|input|image)/i,
  /(?:must|should)\s+be/i,
  /no\s+(?:task\s+)?id\s+returned|no\s+video\s+url/i,
  /\b(?:invalid_argument|invalid_parameter|parameter_invalid|validation_error|bad_request|unsupported_model)\b/i,
  /参数(?:错误|无效|非法|不正确|校验失败|验证失败)/,
  /请求(?:参数|数据).*?(?:无效|错误|非法|不支持)/,
  /缺少(?:必填|必要|参数|字段)/,
  /必须(?:是|为)|仅支持/,
  /不支持(?:的)?(?:参数|模型|尺寸|时长|分辨率|格式|图片|视频)/,
  /未返回(?:任务\s*)?ID|未返回有效的视频 URL/,
  /(?:校验|验证)失败|格式错误|字段错误/,
  /内容(?:政策|审核|安全)|安全策略|违规|敏感内容|policy|safety/i,
];

interface BuildBatchVideoReferenceImagesParams {
  model: VideoModel;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  extraReferenceUrls?: string[];
  /** 角色参考图 URL 列表，优先级高于 extraReferenceUrls */
  characterReferenceUrls?: string[];
}

export interface BatchVideoReferenceResult {
  /** 传给视频生成 API 的参考图列表 */
  referenceImages?: string[];
  /**
   * frames 模式下无法在 referenceImages 中传角色参考图（槽位被首尾帧占满），
   * 调用方应将此字段注入 prompt（如 "The same [characterDescription]"）
   * 非 frames 模式下此字段为空（角色参考图已包含在 referenceImages 中）
   */
  unusedCharacterReferenceUrls?: string[];
}

function buildVideoFailureText(
  task?: Pick<Task, 'error'> | null,
  fallbackError?: string
): string {
  return [task?.error?.code, task?.error?.message, fallbackError]
    .filter(
      (item): item is string =>
        typeof item === 'string' && item.trim() !== ''
    )
    .join(' ');
}

export function getNonRetryableBatchVideoFailureReason(
  task?: Pick<Task, 'error'> | null,
  fallbackError?: string
): string | null {
  const failureText = buildVideoFailureText(task, fallbackError);
  if (!failureText) {
    return null;
  }

  const isNonRetryable =
    NON_RETRYABLE_VIDEO_ERROR_STATUS_PATTERN.test(failureText) ||
    NON_RETRYABLE_VIDEO_ERROR_PATTERNS.some((pattern) =>
      pattern.test(failureText)
    );

  if (!isNonRetryable) {
    return null;
  }

  return (
    task?.error?.message ||
    fallbackError ||
    task?.error?.code ||
    '不可重试的视频生成错误'
  );
}

/**
 * 根据模型上传模式构建批量视频生成所需的参考图列表。
 *
 * frames 模式（Veo3.1/Seedance）：
 *   - referenceImages = [首帧, 尾帧]（固定，角色参考图无法放入）
 *   - unusedCharacterReferenceUrls = characterReferenceUrls（供调用方注入 prompt）
 *
 * 其它模式（Kling 等）：
 *   - referenceImages = [角色参考图..., 首帧, ...extras]（角色参考图优先）
 *   - unusedCharacterReferenceUrls = undefined
 */
export function buildBatchVideoReferenceImages(
  params: BuildBatchVideoReferenceImagesParams
): BatchVideoReferenceResult {
  const { model, firstFrameUrl, lastFrameUrl, extraReferenceUrls = [], characterReferenceUrls = [] } = params;
  const config = getVideoModelConfig(model);
  const urls: string[] = [];
  const append = (url?: string) => {
    if (!url || urls.includes(url)) {
      return;
    }
    urls.push(url);
  };

  if (config.imageUpload.mode === 'frames') {
    append(firstFrameUrl);
    append(lastFrameUrl);
    const referenceImages = urls.length > 0 ? urls.slice(0, config.imageUpload.maxCount) : undefined;
    // frames 模式槽位被首尾帧占满，角色参考图只能通过 prompt 注入
    const unusedCharacterReferenceUrls = characterReferenceUrls.length > 0 ? characterReferenceUrls : undefined;
    return { referenceImages, unusedCharacterReferenceUrls };
  }

  // 非 frames 模式：角色参考图优先，然后是首帧，再是额外参考图
  for (const url of characterReferenceUrls) {
    append(url);
    if (urls.length >= config.imageUpload.maxCount) break;
  }
  append(firstFrameUrl);
  for (const url of extraReferenceUrls) {
    append(url);
    if (urls.length >= config.imageUpload.maxCount) break;
  }

  return { referenceImages: urls.length > 0 ? urls : undefined };
}

export async function waitForBatchVideoTask(
  taskId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; task?: Task; error?: string }> {
  return waitForTaskCompletion(taskId, {
    interval: 1000,
    timeout: 30 * 60 * 1000,
    signal,
  });
}
