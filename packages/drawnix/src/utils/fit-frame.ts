/**
 * 自适应 Frame 工具函数
 *
 * 将视口缩放到选中的 Frame（或第一个 Frame），
 * 并考虑左侧工具栏/抽屉、右侧 ChatDrawer、底部输入栏等遮挡区域。
 */
import {
  PlaitBoard,
  BoardTransforms,
  RectangleClient,
  getSelectedElements,
} from '@plait/core';
import { isFrameElement, PlaitFrame } from '../types/frame.types';

/** 工具栏右边界兜底值：默认贴边 + 58px 工具栏 */
const DEFAULT_TOOLBAR_RIGHT_EDGE = 58;
/** 底部 AI 输入栏高度 */
const BOTTOM_BAR_HEIGHT = 80;
/** 顶部导航控件高度 */
const TOP_BAR_HEIGHT = 50;
/** 四周留白 */
const FIT_PADDING = 40;

function getToolbarOcclusion(totalWidth: number): {
  left: number;
  right: number;
} {
  const toolbarEl = document.querySelector(
    '.unified-toolbar'
  ) as HTMLElement | null;
  const leftDrawerEl = document.querySelector(
    '.side-drawer--open.side-drawer--toolbar-right'
  ) as HTMLElement | null;
  const isDockRight = document.documentElement.classList.contains(
    'aitu-toolbar-dock-right'
  );
  let left = toolbarEl ? 0 : DEFAULT_TOOLBAR_RIGHT_EDGE;
  let right = 0;

  if (toolbarEl) {
    const rect = toolbarEl.getBoundingClientRect();
    if (isDockRight) {
      right = Math.max(right, totalWidth - rect.left);
    } else {
      left = Math.max(left, rect.right);
    }
  }

  if (leftDrawerEl) {
    const rect = leftDrawerEl.getBoundingClientRect();
    if (isDockRight) {
      right = Math.max(right, totalWidth - rect.left);
    } else {
      left = Math.max(left, rect.right);
    }
  }

  return {
    left: Math.max(0, Math.round(left)),
    right: Math.max(0, Math.round(right)),
  };
}

/**
 * 将视口自适应到指定 Frame 或自动选择一个 Frame
 * @returns 是否成功定位到 Frame
 */
export function fitFrame(board: PlaitBoard): boolean {
  // 1. 找到目标 Frame：优先选中的 Frame，否则用第一个 Frame
  const selectedElements = getSelectedElements(board);
  let targetFrame: PlaitFrame | null = null;

  for (const el of selectedElements) {
    if (isFrameElement(el)) {
      targetFrame = el;
      break;
    }
  }

  if (!targetFrame) {
    for (const el of board.children) {
      if (isFrameElement(el)) {
        targetFrame = el;
        break;
      }
    }
  }

  if (!targetFrame) return false;

  // 2. 计算 Frame 的世界坐标矩形
  const frameRect = RectangleClient.getRectangleByPoints(targetFrame.points);

  // 3. 计算可视区域（排除遮挡元素）
  const container = PlaitBoard.getBoardContainer(board);
  const totalWidth = container.clientWidth;
  const totalHeight = container.clientHeight;

  // 工具栏/抽屉遮挡：工具栏拖到右侧后，抽屉会改为向左展开
  const toolbarOcclusion = getToolbarOcclusion(totalWidth);
  const leftOccluded = toolbarOcclusion.left;

  // 右侧遮挡：ChatDrawer（如果打开）
  const chatDrawerEl = document.querySelector('.chat-drawer--open') as HTMLElement;
  const rightOccluded = Math.max(
    toolbarOcclusion.right,
    chatDrawerEl ? chatDrawerEl.offsetWidth : 0
  );

  // 可用视口尺寸
  const availableWidth = totalWidth - leftOccluded - rightOccluded - FIT_PADDING * 2;
  const availableHeight = totalHeight - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT - FIT_PADDING * 2;

  if (availableWidth <= 0 || availableHeight <= 0) return false;

  // 4. 计算缩放比例（不超过 3x）
  const zoom = Math.min(
    availableWidth / frameRect.width,
    availableHeight / frameRect.height,
    3
  );

  // 5. 计算 origination（视口左上角的世界坐标）
  // 可视区域中心在屏幕坐标中的位置
  const visibleCenterX = leftOccluded + FIT_PADDING + availableWidth / 2;
  const visibleCenterY = TOP_BAR_HEIGHT + FIT_PADDING + availableHeight / 2;

  // Frame 中心的世界坐标
  const frameCenterX = frameRect.x + frameRect.width / 2;
  const frameCenterY = frameRect.y + frameRect.height / 2;

  // origination = Frame 中心 - 可视区域中心偏移量（换算成世界坐标）
  const origination: [number, number] = [
    frameCenterX - visibleCenterX / zoom,
    frameCenterY - visibleCenterY / zoom,
  ];

  BoardTransforms.updateViewport(board, origination, zoom);
  return true;
}
