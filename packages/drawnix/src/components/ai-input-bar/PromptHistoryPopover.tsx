/**
 * PromptHistoryPopover 组件
 *
 * 历史提示词悬浮面板
 * - 三个点图标按钮（始终显示）
 * - 鼠标悬浮时显示历史提示词列表和预设提示词
 * - 支持置顶/取消置顶
 * - 点击提示词回填到输入框
 * - 支持删除历史记录
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { usePromptHistory } from '../../hooks/usePromptHistory';
import { useGenerationHistory } from '../../hooks/useGenerationHistory';
import { useConfirmDialog } from '../dialog/ConfirmDialog';
import { PromptListPanel } from '../shared';
import {
  promptStorageService,
  type PromptType,
} from '../../services/prompt-storage-service';
import {
  getMergedPresetPrompts,
  resolvePresetPromptItems,
  resolvePromptItemsByGenerationType,
  type ResolvedPromptItem,
} from '../ttd-dialog/shared/prompt-utils';
import './prompt-history-popover.scss';

/** 选择提示词回调的参数类型 */
export interface PromptSelectInfo {
  content: string;
  /** 生成类型：image/video/audio/text/agent/ppt-common */
  modelType?: PromptType;
  scene?: string;
}

interface PromptHistoryPopoverProps {
  /** 当前生成类型 */
  generationType: PromptType;
  /** 选择提示词后的回调 */
  onSelectPrompt: (info: PromptSelectInfo) => void;
  /** 语言 */
  language: 'zh' | 'en';
  /** 附加快捷操作，显示在更多按钮同组区域 */
  extraActions?: React.ReactNode;
}

export const PromptHistoryPopover: React.FC<PromptHistoryPopoverProps> = ({
  generationType,
  onSelectPrompt,
  language,
  extraActions,
}) => {
  const { history, removeHistory, refreshHistory } = usePromptHistory({
    deduplicateWithPresets: false,
    modelTypeFilter:
      generationType === 'image' || generationType === 'video'
        ? undefined
        : generationType,
  });
  const { imageHistory, videoHistory } = useGenerationHistory();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [, setRenderVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const promptItems =
    generationType === 'image' || generationType === 'video'
      ? resolvePresetPromptItems({
          generationType,
          language,
          promptContents: getMergedPresetPrompts(
            generationType,
            language,
            generationType === 'image' ? imageHistory : videoHistory
          ),
          imageHistory,
          videoHistory,
        })
      : resolvePromptItemsByGenerationType({
          generationType,
          language,
          aiInputHistory: history,
          imageHistory,
          videoHistory,
        });

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    // 清除离开定时器
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    // 延迟显示面板（避免误触）
    hoverTimeoutRef.current = setTimeout(() => {
      // 打开前刷新历史记录，确保显示最新数据
      refreshHistory();
      setRenderVersion((prev) => prev + 1);
      setIsOpen(true);
    }, 150);
  }, [refreshHistory]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    // 清除进入定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 延迟关闭面板（允许鼠标移动到面板上）
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  // 处理选择提示词
  const handleSelectPrompt = useCallback(
    (item: ResolvedPromptItem) => {
      onSelectPrompt({
        content: item.content,
        modelType: item.modelType,
        scene: item.scene,
      });
      setIsOpen(false);
    },
    [onSelectPrompt]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const item = promptItems.find((promptItem) => promptItem.id === id);
      if (!item) {
        return;
      }

      const confirmed = await confirm({
        title: language === 'zh' ? '确认删除提示词' : 'Delete Prompt',
        description:
          language === 'zh'
            ? '确定要删除这条提示词吗？此操作不可撤销。'
            : 'Are you sure you want to delete this prompt? This action cannot be undone.',
        confirmText: language === 'zh' ? '删除' : 'Delete',
        cancelText: language === 'zh' ? '取消' : 'Cancel',
        danger: true,
      });
      if (!confirmed) {
        return;
      }

      promptStorageService.deletePrompt(generationType, item.content);
      if (
        item.historyId &&
        generationType !== 'image' &&
        generationType !== 'video'
      ) {
        removeHistory(item.historyId);
      } else {
        setRenderVersion((prev) => prev + 1);
      }
    },
    [confirm, generationType, language, promptItems, removeHistory]
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      const item = promptItems.find((promptItem) => promptItem.id === id);
      if (!item) {
        return;
      }

      if (promptStorageService.isPinned(generationType, item.content)) {
        promptStorageService.unpinPrompt(generationType, item.content);
      } else {
        promptStorageService.pinPrompt(generationType, item.content);
      }
      setRenderVersion((prev) => prev + 1);
    },
    [generationType, promptItems]
  );

  return (
    <div ref={containerRef} className="prompt-history-popover">
      <div className="prompt-history-popover__actions">
        <button
          className="prompt-history-popover__trigger"
          title={language === 'zh' ? '提示词' : 'Prompts'}
          data-track="ai_input_click_history"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <MoreHorizontal size={18} />
        </button>
        {extraActions}
      </div>

      {/* 提示词面板 */}
      {isOpen && (
        <div
          className="prompt-history-popover__panel-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <PromptListPanel
            title={language === 'zh' ? '提示词' : 'Prompts'}
            items={promptItems}
            onSelect={handleSelectPrompt}
            onTogglePin={handleTogglePin}
            onDelete={handleDelete}
            language={language}
            showCount={true}
          />
        </div>
      )}
      {confirmDialog}
    </div>
  );
};

export default PromptHistoryPopover;
