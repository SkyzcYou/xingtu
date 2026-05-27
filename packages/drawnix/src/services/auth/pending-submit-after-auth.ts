import type { GenerationType } from '../../utils/ai-input-parser';
import type { ModelRef } from '../../utils/settings-manager';
import type { KnowledgeContextRef } from '../../types/task.types';

export type PendingSubmitContentType = 'image' | 'video' | 'graphics' | 'text';

export interface PendingSubmitContent {
  type: PendingSubmitContentType;
  url?: string;
  maskImage?: string;
  text?: string;
  name: string;
  width?: number;
  height?: number;
}

export interface PendingSubmitAfterAuthDraft {
  version: 1;
  createdAt: number;
  expiresAt: number;
  source: 'ai-input-bar';
  reason: 'login-required';
  prompt: string;
  generationType: GenerationType;
  uploadedContent: PendingSubmitContent[];
  selectedContent: PendingSubmitContent[];
  selectedModel: string;
  selectedModelRef?: ModelRef | null;
  selectedParams: Record<string, string>;
  selectedCount: number;
  selectedSkillId?: string;
  knowledgeContextRefs: KnowledgeContextRef[];
}

export type PendingSubmitAfterAuthInput = Omit<
  PendingSubmitAfterAuthDraft,
  'version' | 'createdAt' | 'expiresAt' | 'source' | 'reason'
>;

const STORAGE_KEY = 'aitu:ai-input:pending-submit-after-auth:v1';
const DRAFT_TTL_MS = 60 * 60 * 1000;
const VALID_CONTENT_TYPES = new Set<PendingSubmitContentType>([
  'image',
  'video',
  'graphics',
  'text',
]);

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, string>
  >((result, [key, entry]) => {
    if (typeof key === 'string' && key && typeof entry === 'string') {
      result[key] = entry;
    }
    return result;
  }, {});
}

function normalizeModelRef(value: unknown): ModelRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const profileId =
    typeof record.profileId === 'string' && record.profileId
      ? record.profileId
      : null;
  const modelId =
    typeof record.modelId === 'string' && record.modelId ? record.modelId : null;
  return profileId || modelId ? { profileId, modelId } : null;
}

function normalizeContentList(value: unknown): PendingSubmitContent[] {
  if (!Array.isArray(value)) return [];

  return value.reduce<PendingSubmitContent[]>((result, item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return result;

    const record = item as Record<string, unknown>;
    const type = record.type;
    if (typeof type !== 'string' || !VALID_CONTENT_TYPES.has(type as PendingSubmitContentType)) {
      return result;
    }

    const url = typeof record.url === 'string' ? record.url : undefined;
    const text = typeof record.text === 'string' ? record.text : undefined;
    if (!url && !text) return result;

    const name =
      typeof record.name === 'string' && record.name.trim()
        ? record.name
        : `参考内容 ${index + 1}`;
    const width = typeof record.width === 'number' ? record.width : undefined;
    const height = typeof record.height === 'number' ? record.height : undefined;
    const maskImage =
      typeof record.maskImage === 'string' ? record.maskImage : undefined;

    result.push({
      type: type as PendingSubmitContentType,
      url,
      maskImage,
      text,
      name,
      width,
      height,
    });
    return result;
  }, []);
}

function normalizeKnowledgeContextRefs(value: unknown): KnowledgeContextRef[] {
  if (!Array.isArray(value)) return [];

  return value.reduce<KnowledgeContextRef[]>((result, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return result;
    const record = item as Record<string, unknown>;
    if (typeof record.noteId !== 'string' || !record.noteId) return result;
    if (typeof record.title !== 'string' || !record.title) return result;

    result.push({
      noteId: record.noteId,
      title: record.title,
      directoryId:
        typeof record.directoryId === 'string' ? record.directoryId : undefined,
      updatedAt:
        typeof record.updatedAt === 'number' ? record.updatedAt : undefined,
    });
    return result;
  }, []);
}

function normalizeDraft(value: unknown): PendingSubmitAfterAuthDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  if (record.source !== 'ai-input-bar') return null;
  if (record.reason !== 'login-required') return null;

  const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : 0;
  if (!expiresAt || expiresAt <= Date.now()) return null;

  const prompt = typeof record.prompt === 'string' ? record.prompt : '';
  const uploadedContent = normalizeContentList(record.uploadedContent);
  const selectedContent = normalizeContentList(record.selectedContent);
  const knowledgeContextRefs = normalizeKnowledgeContextRefs(
    record.knowledgeContextRefs
  );
  if (
    !prompt.trim() &&
    uploadedContent.length === 0 &&
    selectedContent.length === 0 &&
    knowledgeContextRefs.length === 0
  ) {
    return null;
  }

  if (typeof record.generationType !== 'string') return null;
  if (typeof record.selectedModel !== 'string' || !record.selectedModel) {
    return null;
  }

  return {
    version: 1,
    createdAt:
      typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
    expiresAt,
    source: 'ai-input-bar',
    reason: 'login-required',
    prompt,
    generationType: record.generationType as GenerationType,
    uploadedContent,
    selectedContent,
    selectedModel: record.selectedModel,
    selectedModelRef: normalizeModelRef(record.selectedModelRef),
    selectedParams: normalizeStringRecord(record.selectedParams),
    selectedCount:
      typeof record.selectedCount === 'number' && record.selectedCount > 0
        ? record.selectedCount
        : 1,
    selectedSkillId:
      typeof record.selectedSkillId === 'string' && record.selectedSkillId
        ? record.selectedSkillId
        : undefined,
    knowledgeContextRefs,
  };
}

export function savePendingSubmitAfterAuthDraft(
  input: PendingSubmitAfterAuthInput
): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;

  const now = Date.now();
  const draft: PendingSubmitAfterAuthDraft = {
    version: 1,
    createdAt: now,
    expiresAt: now + DRAFT_TTL_MS,
    source: 'ai-input-bar',
    reason: 'login-required',
    prompt: input.prompt,
    generationType: input.generationType,
    uploadedContent: normalizeContentList(input.uploadedContent),
    selectedContent: normalizeContentList(input.selectedContent),
    selectedModel: input.selectedModel,
    selectedModelRef: input.selectedModelRef ?? null,
    selectedParams: normalizeStringRecord(input.selectedParams),
    selectedCount: input.selectedCount,
    selectedSkillId: input.selectedSkillId,
    knowledgeContextRefs: normalizeKnowledgeContextRefs(input.knowledgeContextRefs),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingSubmitAfterAuthDraft(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures during cleanup.
  }
}

export function consumePendingSubmitAfterAuthDraft(): PendingSubmitAfterAuthDraft | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  clearPendingSubmitAfterAuthDraft();
  if (!raw) return null;

  try {
    return normalizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}
