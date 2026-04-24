import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { MessagePlugin } from 'tdesign-react';
import { executorFactory } from '../../services/media-executor';
import { ModelDropdown } from '../ai-input-bar/ModelDropdown';
import { useSelectableModels } from '../../hooks/use-runtime-models';
import {
  createModelRef,
  resolveInvocationRoute,
  type ModelRef,
} from '../../utils/settings-manager';
import { getPinnedSelectableModel } from '../../utils/runtime-model-discovery';
import {
  findMatchingSelectableModel,
  getModelRefFromConfig,
  getSelectionKey,
} from '../../utils/model-selection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeading,
} from '../dialog/dialog';
import {
  buildPromptOptimizationRequest,
  normalizeOptimizedPromptResult,
} from '../ttd-dialog/shared/ai-generation-utils';
import './prompt-optimize-dialog.scss';

export type PromptOptimizeMode = 'polish' | 'structured';

interface PromptOptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalPrompt: string;
  language: 'zh' | 'en';
  type: 'image' | 'video';
  onApply: (prompt: string) => void;
  allowStructuredMode?: boolean;
  defaultMode?: PromptOptimizeMode;
}

export const PromptOptimizeDialog: React.FC<PromptOptimizeDialogProps> = ({
  open,
  onOpenChange,
  originalPrompt,
  language,
  type,
  onApply,
  allowStructuredMode = false,
  defaultMode = 'polish',
}) => {
  const [requirements, setRequirements] = useState('');
  const [mode, setMode] = useState<PromptOptimizeMode>(defaultMode);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const optimizationAbortRef = useRef<AbortController | null>(null);

  const textModels = useSelectableModels('text');
  const initialTextRoute = resolveInvocationRoute('text');
  const initialTextModelId = initialTextRoute.modelId || textModels[0]?.id || '';
  const initialTextModelRef =
    createModelRef(initialTextRoute.profileId, initialTextRoute.modelId) ||
    (initialTextModelId ? createModelRef(null, initialTextModelId) : null);
  const [optimizerModel, setOptimizerModel] = useState(initialTextModelId);
  const [optimizerModelRef, setOptimizerModelRef] = useState<ModelRef | null>(
    initialTextModelRef
  );

  const visibleTextModels = useMemo(() => {
    const matchedModel = findMatchingSelectableModel(
      textModels,
      optimizerModel,
      optimizerModelRef
    );
    if (matchedModel || !optimizerModel) {
      return textModels;
    }

    const pinnedModel = getPinnedSelectableModel(
      'text',
      optimizerModel,
      optimizerModelRef
    );
    return pinnedModel ? [pinnedModel, ...textModels] : textModels;
  }, [optimizerModel, optimizerModelRef, textModels]);

  const syncOptimizerModelFromRoute = useCallback(() => {
    const route = resolveInvocationRoute('text');
    const routeModelRef = createModelRef(route.profileId, route.modelId);
    const matchedModel =
      findMatchingSelectableModel(textModels, route.modelId, routeModelRef) ||
      getPinnedSelectableModel('text', route.modelId, routeModelRef);
    const nextModelId = matchedModel?.id || route.modelId || textModels[0]?.id || '';
    const nextModelRef =
      getModelRefFromConfig(matchedModel) ||
      routeModelRef ||
      (nextModelId ? createModelRef(null, nextModelId) : null);

    setOptimizerModel(nextModelId);
    setOptimizerModelRef(nextModelRef);
  }, [textModels]);

  const handleClose = useCallback(() => {
    optimizationAbortRef.current?.abort();
    optimizationAbortRef.current = null;
    setIsOptimizing(false);
    setRequirements('');
    setMode(defaultMode);
    onOpenChange(false);
  }, [defaultMode, onOpenChange]);

  const handleOptimizePrompt = useCallback(async () => {
    const rawPrompt = originalPrompt.trim();
    if (!rawPrompt) {
      MessagePlugin.warning(
        language === 'zh' ? '请先输入提示词' : 'Please enter a prompt first'
      );
      return;
    }

    const controller = new AbortController();
    optimizationAbortRef.current?.abort();
    optimizationAbortRef.current = controller;
    setIsOptimizing(true);

    try {
      const optimizedPrompt = normalizeOptimizedPromptResult(
        (
          await executorFactory.getFallbackExecutor().generateText(
            {
              prompt: buildPromptOptimizationRequest({
                originalPrompt: rawPrompt,
                optimizationRequirements: requirements,
                language,
                type,
                mode,
              }),
              model: optimizerModel || undefined,
              modelRef: optimizerModelRef,
            },
            {
              signal: controller.signal,
            }
          )
        ).content
      );

      if (!optimizedPrompt) {
        throw new Error('Empty optimized prompt');
      }

      onApply(optimizedPrompt);
      MessagePlugin.success(
        language === 'zh'
          ? mode === 'structured'
            ? '结构化提示词已生成'
            : '提示词优化完成'
          : mode === 'structured'
          ? 'Structured prompt generated'
          : 'Prompt optimized'
      );
      setRequirements('');
      setMode(defaultMode);
      onOpenChange(false);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[PromptOptimizeDialog] Failed to optimize prompt:', error);
      MessagePlugin.error(
        language === 'zh'
          ? mode === 'structured'
            ? '结构化提示词生成失败，请稍后重试'
            : '提示词优化失败，请稍后重试'
          : mode === 'structured'
          ? 'Failed to generate structured prompt, please try again later'
          : 'Failed to optimize prompt, please try again later'
      );
    } finally {
      if (optimizationAbortRef.current === controller) {
        optimizationAbortRef.current = null;
      }
      setIsOptimizing(false);
    }
  }, [
    defaultMode,
    language,
    mode,
    onApply,
    onOpenChange,
    optimizerModel,
    optimizerModelRef,
    originalPrompt,
    requirements,
    type,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    syncOptimizerModelFromRoute();
    setRequirements('');
    setMode(defaultMode);
  }, [defaultMode, open, syncOptimizerModelFromRoute]);

  useEffect(() => {
    return () => {
      optimizationAbortRef.current?.abort();
      optimizationAbortRef.current = null;
    };
  }, []);

  const description =
    language === 'zh'
      ? mode === 'structured'
        ? '把复杂场景整理成可复用的 JSON 结构化提示词，结果会直接回填输入框。'
        : '输入优化方向，选择文本模型，优化后会直接回填当前提示词。'
      : mode === 'structured'
      ? 'Turn complex scenes into reusable JSON structured prompts and fill the result back into the current field.'
      : 'Describe how to refine the prompt and the optimized result will fill back into the current field.';

  const requirementsPlaceholder =
    language === 'zh'
      ? mode === 'structured'
        ? '例如：突出时间轴结构、把区域与数量拆开、保留标题与图例、输出 JSON 不要解释...'
        : '例如：更电影感、补充镜头语言、减少冗余、强调主体与光线...'
      : mode === 'structured'
      ? 'For example: emphasize timeline structure, split regions and counts, preserve titles and legends, output JSON only...'
      : 'For example: make it more cinematic, add camera language, reduce redundancy, emphasize subject and lighting...';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="Dialog prompt-optimize-dialog">
        <div className="prompt-optimize-dialog__header">
          <div className="prompt-optimize-dialog__headline">
            <DialogHeading className="prompt-optimize-dialog__title">
              {language === 'zh'
                ? mode === 'structured'
                  ? '结构化提示词'
                  : '优化提示词'
                : mode === 'structured'
                ? 'Structured Prompt'
                : 'Optimize Prompt'}
            </DialogHeading>
            <DialogDescription className="prompt-optimize-dialog__description">
              {description}
            </DialogDescription>
          </div>
          <button
            type="button"
            className="prompt-optimize-dialog__close"
            onClick={handleClose}
            aria-label={language === 'zh' ? '关闭' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="prompt-optimize-dialog__body">
          {allowStructuredMode && (
            <div className="prompt-optimize-dialog__section">
              <span className="prompt-optimize-dialog__label">
                {language === 'zh' ? '输出模式' : 'Output Mode'}
              </span>
              <div className="prompt-optimize-dialog__mode-switch">
                <button
                  type="button"
                  className={`prompt-optimize-dialog__mode-btn ${
                    mode === 'polish'
                      ? 'prompt-optimize-dialog__mode-btn--active'
                      : ''
                  }`}
                  onClick={() => setMode('polish')}
                  disabled={isOptimizing}
                >
                  <Sparkles size={14} />
                  <span>{language === 'zh' ? '普通润色' : 'Polish'}</span>
                </button>
                <button
                  type="button"
                  className={`prompt-optimize-dialog__mode-btn ${
                    mode === 'structured'
                      ? 'prompt-optimize-dialog__mode-btn--active'
                      : ''
                  }`}
                  onClick={() => setMode('structured')}
                  disabled={isOptimizing}
                >
                  <span>{language === 'zh' ? '结构化 JSON' : 'Structured JSON'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="prompt-optimize-dialog__section">
            <span className="prompt-optimize-dialog__label">
              {language === 'zh' ? '当前提示词' : 'Current Prompt'}
            </span>
            <div className="prompt-optimize-dialog__source">
              {originalPrompt.trim()}
            </div>
          </div>

          <div className="prompt-optimize-dialog__section">
            <label
              className="prompt-optimize-dialog__label"
              htmlFor={`prompt-optimize-requirements-${type}`}
            >
              {language === 'zh' ? '补充要求' : 'Additional Requirements'}
            </label>
            <textarea
              id={`prompt-optimize-requirements-${type}`}
              className="prompt-optimize-dialog__textarea"
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              placeholder={requirementsPlaceholder}
              rows={4}
              disabled={isOptimizing}
            />
          </div>

          <div className="prompt-optimize-dialog__section">
            <span className="prompt-optimize-dialog__label">
              {language === 'zh' ? '文本模型' : 'Text Model'}
            </span>
            <div className="prompt-optimize-dialog__model">
              <ModelDropdown
                variant="form"
                selectedModel={optimizerModel}
                selectedSelectionKey={getSelectionKey(
                  optimizerModel,
                  optimizerModelRef
                )}
                onSelect={(modelId, modelRef) => {
                  setOptimizerModel(modelId);
                  setOptimizerModelRef(modelRef || null);
                }}
                onSelectModel={(model) => {
                  setOptimizerModel(model.id);
                  setOptimizerModelRef(getModelRefFromConfig(model));
                }}
                language={language}
                models={visibleTextModels}
                placement="down"
                disabled={isOptimizing}
                placeholder={
                  language === 'zh'
                    ? '选择文本模型'
                    : 'Select text model'
                }
              />
            </div>
          </div>
        </div>

        <div className="prompt-optimize-dialog__footer">
          <button
            type="button"
            className="prompt-optimize-dialog__footer-btn prompt-optimize-dialog__footer-btn--secondary"
            onClick={handleClose}
            disabled={isOptimizing}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            className="prompt-optimize-dialog__footer-btn prompt-optimize-dialog__footer-btn--primary"
            onClick={() => void handleOptimizePrompt()}
            disabled={isOptimizing || !originalPrompt.trim()}
          >
            {language === 'zh'
              ? isOptimizing
                ? mode === 'structured'
                  ? '生成中...'
                  : '优化中...'
                : mode === 'structured'
                ? '生成结构化提示词'
                : '开始优化'
              : isOptimizing
              ? mode === 'structured'
                ? 'Generating...'
                : 'Optimizing...'
              : mode === 'structured'
              ? 'Generate Structured Prompt'
              : 'Optimize'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptOptimizeDialog;
