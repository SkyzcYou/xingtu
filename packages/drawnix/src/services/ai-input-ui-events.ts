import type { GenerationType } from '../utils/ai-input-parser';

export interface AIInputFocusEventDetail {
  generationType?: GenerationType;
  skillId?: string;
}

export const AI_INPUT_FOCUS_EVENT = 'aitu:ai-input-focus';

export function requestAIInputFocus(
  detail: AIInputFocusEventDetail = {}
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(AI_INPUT_FOCUS_EVENT, { detail }));
}
