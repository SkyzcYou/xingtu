/**
 * PromptListPanel 组件
 *
 * 可复用的提示词列表面板组件
 * - 包含标题和数量显示
 * - 支持自定义列表项渲染
 */

import React, { useCallback, useState } from 'react';
import type { PromptPreviewExample } from '../../constants/prompts';
import {
  PromptListItem,
  type PromptPreviewRequest,
} from './PromptListItem';
import {
  UnifiedMediaViewer,
  type MediaItem as UnifiedMediaItem,
} from './media-preview';
import './prompt-list-panel.scss';

export interface PromptItem {
  /** 唯一标识 */
  id: string;
  /** 提示词内容 */
  content: string;
  /** 是否已置顶 */
  pinned?: boolean;
  /** 是否是预设提示词（预设不允许删除和置顶） */
  isPreset?: boolean;
  /** 生成类型：image/video/audio/text/agent/ppt-common */
  modelType?: 'image' | 'video' | 'audio' | 'text' | 'agent' | 'ppt-common';
  /** 场景描述（用于显示标签） */
  scene?: string;
  /** 悬浮预览示例图 */
  previewExamples?: PromptPreviewExample[];
}

export interface PromptListPanelProps {
  /** 标题 */
  title: string;
  /** 提示词列表 */
  items: PromptItem[];
  /** 点击提示词的回调（传递完整 item 信息） */
  onSelect?: (item: PromptItem) => void;
  /** 置顶/取消置顶的回调 */
  onTogglePin?: (id: string) => void;
  /** 删除的回调 */
  onDelete?: (id: string) => void;
  /** 语言 */
  language?: 'zh' | 'en';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示数量 */
  showCount?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const PromptListPanel: React.FC<PromptListPanelProps> = ({
  title,
  items,
  onSelect,
  onTogglePin,
  onDelete,
  language = 'zh',
  disabled = false,
  showCount = true,
  className = '',
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItems, setPreviewItems] = useState<UnifiedMediaItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const handlePreviewExample = useCallback(
    (
      itemId: string,
      { content, previewExamples, initialIndex }: PromptPreviewRequest
    ) => {
      setPreviewItems(
        previewExamples.map((example, index) => {
          const shouldPlayVideo =
            example.kind === 'video' && example.playable !== false;

          return {
            id: `${itemId}-preview-${index}`,
            url: shouldPlayVideo
              ? example.src
              : example.kind === 'video'
              ? example.posterSrc || example.src
              : example.src,
            type: shouldPlayVideo ? 'video' : 'image',
            posterUrl: shouldPlayVideo ? example.posterSrc : undefined,
            alt: example.alt,
            title: content,
          } satisfies UnifiedMediaItem;
        })
      );
      setPreviewInitialIndex(initialIndex);
      setPreviewVisible(true);
    },
    []
  );

  return (
    <>
      <div className={`prompt-list-panel ${className}`}>
      {/* 头部 */}
        <div className="prompt-list-panel__header">
          <span className="prompt-list-panel__title">{title}</span>
          {showCount && (
            <span className="prompt-list-panel__count">{items.length}</span>
          )}
        </div>
      
        {/* 列表 */}
        <div className="prompt-list-panel__list">
          {items.map((item) => (
            <PromptListItem
              key={item.id}
              content={item.content}
              pinned={item.pinned}
              isPreset={item.isPreset}
              modelType={item.modelType}
              scene={item.scene}
              previewExamples={item.previewExamples}
              onClick={() => onSelect?.(item)}
              onTogglePin={
                onTogglePin && !item.isPreset
                  ? () => onTogglePin(item.id)
                  : undefined
              }
              onDelete={
                onDelete && !item.isPreset
                  ? () => onDelete(item.id)
                  : undefined
              }
              onPreviewExample={(request) =>
                handlePreviewExample(item.id, request)
              }
              language={language}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
      <UnifiedMediaViewer
        visible={previewVisible}
        items={previewItems}
        initialIndex={previewInitialIndex}
        onClose={() => setPreviewVisible(false)}
        showThumbnails={previewItems.length > 1}
        videoAutoPlay={true}
      />
    </>
  );
};

export default PromptListPanel;
