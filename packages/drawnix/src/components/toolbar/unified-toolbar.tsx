import React, {
  Suspense,
  lazy,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import classNames from 'classnames';
import { ATTACHED_ELEMENT_CLASS_NAME } from '@plait/core';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { AppToolbar } from './app-toolbar/app-toolbar';
import { CreationToolbar } from './creation-toolbar';
import { UnifiedToolbarProps } from './toolbar.types';
import { Island } from '../island';
import { BottomActionsSection } from './bottom-actions-section';
import { CanvasAvatarPlaceholder } from '../canvas-avatar-placeholder';
import { CanvasResourcesButton } from './canvas-resources-button';
import { useViewportScale } from '../../hooks/useViewportScale';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useMessageCenter } from '../../hooks/use-message-center';
import { MessageHornIcon, TaskIcon } from '../icons';
import { HoverTip } from '../shared/hover';
import {
  loadOidcProfileViewModel,
  type OidcProfileViewModel,
} from '../../services/auth/oidc-session';

const TaskQueuePanel = lazy(() =>
  import('../task-queue/TaskQueuePanel').then((module) => ({
    default: module.TaskQueuePanel,
  }))
);

const ProfilePanel = lazy(() =>
  import('../profile-dialog/ProfilePanel').then((module) => ({
    default: module.ProfilePanel,
  }))
);

// 工具栏高度阈值: 当容器高度小于此值时切换到图标模式
// 基于四个分区的最小高度 + 分割线 + padding 计算得出
const TOOLBAR_MIN_HEIGHT = 460;

// AI 按钮 ID，用于初始化时滚动到可见位置
const AI_BUTTON_IDS = ['ai-image', 'ai-video'];

const TOOLBAR_LEFT_STORAGE_KEY = 'aitu-toolbar-left';
const TOOLBAR_MOBILE_LEFT_STORAGE_KEY = 'aitu-toolbar-mobile-left';
const TOOLBAR_DEFAULT_LEFT = 0;
const TOOLBAR_MOBILE_LEFT = 8;
const TOOLBAR_VIEWPORT_GAP = 0;
const TOOLBAR_CONTENT_WIDTH = 58;
type ToolbarDockSide = 'left' | 'right';

function clampToolbarLeft(left: number, toolbarWidth = TOOLBAR_CONTENT_WIDTH) {
  const viewportWidth =
    typeof window === 'undefined' ? toolbarWidth : window.innerWidth;
  const maxLeft = Math.max(
    TOOLBAR_DEFAULT_LEFT,
    viewportWidth - toolbarWidth - TOOLBAR_VIEWPORT_GAP
  );

  return Math.round(Math.max(TOOLBAR_DEFAULT_LEFT, Math.min(left, maxLeft)));
}

function getToolbarDockSide(
  left: number,
  toolbarWidth = TOOLBAR_CONTENT_WIDTH
): ToolbarDockSide {
  if (typeof window === 'undefined') {
    return 'left';
  }

  return left + toolbarWidth / 2 > window.innerWidth / 2 ? 'right' : 'left';
}

function getToolbarStorageKey(isMobileOrTablet: boolean) {
  return isMobileOrTablet
    ? TOOLBAR_MOBILE_LEFT_STORAGE_KEY
    : TOOLBAR_LEFT_STORAGE_KEY;
}

function getDefaultToolbarLeft(isMobileOrTablet: boolean) {
  return isMobileOrTablet ? TOOLBAR_MOBILE_LEFT : TOOLBAR_DEFAULT_LEFT;
}

function readStoredToolbarLeft(isMobileOrTablet = false) {
  const defaultLeft = getDefaultToolbarLeft(isMobileOrTablet);
  if (typeof window === 'undefined') {
    return defaultLeft;
  }

  try {
    const raw = window.localStorage.getItem(
      getToolbarStorageKey(isMobileOrTablet)
    );
    if (!raw) {
      return defaultLeft;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return defaultLeft;
    }

    return clampToolbarLeft(parsed);
  } catch {
    return defaultLeft;
  }
}

function writeStoredToolbarLeft(left: number, isMobileOrTablet = false) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getToolbarStorageKey(isMobileOrTablet),
      String(left)
    );
  } catch {
    // localStorage 可能被禁用，拖动仍可在当前页面生效
  }
}

function syncToolbarPositionVars(left: number, toolbarEl: HTMLElement | null) {
  if (typeof document === 'undefined') {
    return;
  }

  const rect = toolbarEl?.getBoundingClientRect();
  const width = rect && rect.width > 0 ? rect.width : TOOLBAR_CONTENT_WIDTH;
  const viewportWidth =
    typeof window === 'undefined' ? left + width : window.innerWidth;
  const rightEdge = Math.round(left + width);
  const dockSide = getToolbarDockSide(left, width);
  const rightDockWidth =
    dockSide === 'right' ? Math.max(0, viewportWidth - left) : 0;
  const sidePanelMaxWidth =
    dockSide === 'right' ? left : Math.max(0, viewportWidth - rightEdge);
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--aitu-toolbar-left', `${left}px`);
  rootStyle.setProperty('--aitu-toolbar-right-edge', `${rightEdge}px`);
  rootStyle.setProperty(
    '--aitu-toolbar-right-dock-width',
    `${Math.round(rightDockWidth)}px`
  );
  rootStyle.setProperty(
    '--aitu-toolbar-right-avoidance',
    `${Math.round(rightDockWidth ? rightDockWidth + 12 : 0)}px`
  );
  rootStyle.setProperty(
    '--aitu-toolbar-side-panel-max-width',
    `${Math.max(0, Math.round(sidePanelMaxWidth))}px`
  );

  const root = document.documentElement;
  root.classList.toggle('aitu-toolbar-dock-right', dockSide === 'right');
  root.classList.toggle('aitu-toolbar-dock-left', dockSide === 'left');

  toolbarEl?.style.setProperty('--aitu-toolbar-left', `${left}px`);
}

/**
 * UnifiedToolbar - 统一左侧工具栏容器
 *
 * 将 AppToolbar 和 CreationToolbar 整合到一个固定在页面左侧的垂直容器中,
 * 工具栏分区之间使用1px水平分割线分隔。
 *
 * 支持响应式图标模式: 当浏览器窗口高度不足时,自动隐藏文本标签,仅显示图标。
 *
 * 仅在桌面端显示,移动端保持原有独立工具栏布局。
 */
export const UnifiedToolbar: React.FC<UnifiedToolbarProps> = React.memo(
  ({
    className,
    messageDrawerOpen = false,
    onMessageDrawerToggle,
    projectDrawerOpen = false,
    onProjectDrawerToggle,
    toolboxDrawerOpen = false,
    onToolboxDrawerToggle,
    taskPanelExpanded = false,
    onTaskPanelToggle,
    profilePanelExpanded = false,
    onProfilePanelToggle,
    onOpenBackupRestore,
    onOpenCloudSync,
    onOpenWorkflowMode,
    onOpenMediaLibrary,
    deferredFeaturesEnabled = false,
    minimizedToolsBarEnabled = false,
    onEnableToolWindows,
  }) => {
    // 检测设备类型
    const { isMobile: isSmallScreen, isTablet } = useDeviceType();
    const { unreadCount } = useMessageCenter();
    const isMobileOrTablet = isSmallScreen || isTablet;
    const [isIconMode, setIsIconMode] = useState(false);
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(true); // 移动端默认收起
    const [toolbarLeft, setToolbarLeft] = useState(() =>
      readStoredToolbarLeft(isMobileOrTablet)
    );
    const [profileViewModel, setProfileViewModel] = useState(
      loadOidcProfileViewModel
    );
    const avatarSeed =
      profileViewModel.status === 'signed-in'
        ? profileViewModel.avatarSeed
        : null;
    const avatarTooltip =
      profileViewModel.status === 'signed-in'
        ? `${profileViewModel.displayName}：已登录`
        : '未登录星图账户';
    const [isToolbarDragging, setIsToolbarDragging] = useState(false);
    const [isTaskPanelAnimationReady, setIsTaskPanelAnimationReady] =
      useState(false);
    const [isProfilePanelAnimationReady, setIsProfilePanelAnimationReady] =
      useState(false);
    const hasEverExpanded = useRef(false);
    const hasProfilePanelEverExpanded = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<HTMLDivElement>(null);
    const hasScrolledToAI = useRef(false);
    const toolbarLeftRef = useRef(toolbarLeft);
    const toolbarDragRef = useRef<{
      pointerId: number;
      startX: number;
      startLeft: number;
    } | null>(null);
    const avatarPointerHandledRef = useRef(false);
    const mobileTogglePointerHandledRef = useRef(false);

    const effectiveToolbarLeft = toolbarLeft;

    // fixed 定位保留 CSS 安全区偏移，hook 只补偿页面缩放
    useViewportScale(containerRef, {
      enablePositionTracking: false,
      enableScaleCompensation: true,
    });

    useEffect(() => {
      const nextLeft = readStoredToolbarLeft(isMobileOrTablet);
      toolbarLeftRef.current = nextLeft;
      setToolbarLeft(nextLeft);
    }, [isMobileOrTablet]);

    useEffect(() => {
      toolbarLeftRef.current = effectiveToolbarLeft;
      syncToolbarPositionVars(effectiveToolbarLeft, containerRef.current);
    }, [effectiveToolbarLeft]);

    useEffect(() => {
      return () => {
        document.documentElement.classList.remove(
          'aitu-toolbar-dock-left',
          'aitu-toolbar-dock-right'
        );
      };
    }, []);

    useEffect(() => {
      if (typeof document === 'undefined') {
        return;
      }

      const root = document.documentElement;
      root.classList.toggle('aitu-toolbar-dragging', isToolbarDragging);
      return () => {
        root.classList.remove('aitu-toolbar-dragging');
      };
    }, [isToolbarDragging]);

    useEffect(() => {
      const handleResize = () => {
        const toolbarWidth =
          containerRef.current?.getBoundingClientRect().width ||
          TOOLBAR_CONTENT_WIDTH;
        setToolbarLeft((currentLeft) =>
          clampToolbarLeft(currentLeft, toolbarWidth)
        );
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    useEffect(() => {
      if (!taskPanelExpanded) {
        setIsTaskPanelAnimationReady(false);
        return;
      }

      if (!hasEverExpanded.current) {
        return;
      }

      const frameId = requestAnimationFrame(() => {
        setIsTaskPanelAnimationReady(true);
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }, [taskPanelExpanded]);

    useEffect(() => {
      if (!profilePanelExpanded) {
        setIsProfilePanelAnimationReady(false);
        return;
      }

      hasProfilePanelEverExpanded.current = true;
      const frameId = requestAnimationFrame(() => {
        setIsProfilePanelAnimationReady(true);
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }, [profilePanelExpanded]);

    const handleToolbarDragStart = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        toolbarDragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startLeft: toolbarLeftRef.current,
        };
        document.documentElement.classList.add('aitu-toolbar-dragging');
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsToolbarDragging(true);
      },
      []
    );

    const handleToolbarDragMove = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        const dragState = toolbarDragRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
          return;
        }

        event.preventDefault();
        const toolbarWidth =
          containerRef.current?.getBoundingClientRect().width ||
          TOOLBAR_CONTENT_WIDTH;
        const nextLeft = clampToolbarLeft(
          dragState.startLeft + event.clientX - dragState.startX,
          toolbarWidth
        );
        toolbarLeftRef.current = nextLeft;
        syncToolbarPositionVars(nextLeft, containerRef.current);
      },
      []
    );

    const finishToolbarDrag = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        const dragState = toolbarDragRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
          return;
        }

        toolbarDragRef.current = null;
        document.documentElement.classList.remove('aitu-toolbar-dragging');
        setIsToolbarDragging(false);
        setToolbarLeft(toolbarLeftRef.current);
        writeStoredToolbarLeft(toolbarLeftRef.current, isMobileOrTablet);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      [isMobileOrTablet]
    );

    const handleToolbarPositionReset = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const defaultLeft = getDefaultToolbarLeft(isMobileOrTablet);
        toolbarLeftRef.current = defaultLeft;
        setToolbarLeft(defaultLeft);
        writeStoredToolbarLeft(defaultLeft, isMobileOrTablet);
      },
      [isMobileOrTablet]
    );

    // 使用 useCallback 稳定回调函数引用,配合 React.memo 优化性能
    const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
      if (entries[0]) {
        const height = entries[0].contentRect.height;
        // 当容器高度小于阈值时切换到图标模式
        setIsIconMode(height < TOOLBAR_MIN_HEIGHT);
      }
    }, []);

    // 监听容器高度变化,实现响应式图标模式切换
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(handleResize);
      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }, [handleResize]);

    // 初始化时检测 AI 按钮是否可见，如果不可见则滚动到可见位置
    useEffect(() => {
      // 只执行一次，避免重复滚动
      if (hasScrolledToAI.current) return;

      const scrollable = scrollableRef.current;
      if (!scrollable) return;

      // 使用 requestAnimationFrame 确保 DOM 已渲染完成
      const checkAndScroll = () => {
        // 标记为已执行，避免重复
        hasScrolledToAI.current = true;

        // 查找第一个 AI 按钮
        let targetButton: HTMLElement | null = null;
        for (const buttonId of AI_BUTTON_IDS) {
          const button = scrollable.querySelector<HTMLElement>(
            `[data-button-id="${buttonId}"]`
          );
          if (button) {
            targetButton = button;
            break;
          }
        }

        if (!targetButton) return;

        // 检查按钮是否在可滚动区域内可见
        const scrollableRect = scrollable.getBoundingClientRect();
        const buttonRect = targetButton.getBoundingClientRect();

        // 如果按钮底部超出可滚动区域底部，需要滚动
        const isButtonVisible =
          buttonRect.bottom <= scrollableRect.bottom &&
          buttonRect.top >= scrollableRect.top;

        if (!isButtonVisible && scrollableRect.height > 0) {
          // 计算需要滚动的距离，使按钮显示在可滚动区域内
          // 滚动到按钮顶部对齐可滚动区域顶部的位置
          const scrollOffset = buttonRect.top - scrollableRect.top;
          scrollable.scrollTop += scrollOffset;
        }
      };

      // 延迟执行，确保按钮已渲染
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(checkAndScroll);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, []);

    // 任务面板切换处理
    const handleTaskPanelToggle = useCallback(() => {
      if (!taskPanelExpanded && !hasEverExpanded.current) {
        hasEverExpanded.current = true;
      }
      if (!taskPanelExpanded) {
        setIsTaskPanelAnimationReady(false);
      }
      onTaskPanelToggle?.();
    }, [taskPanelExpanded, onTaskPanelToggle]);

    // 关闭任务面板（仅在打开时才关闭）
    const handleTaskPanelClose = useCallback(() => {
      if (taskPanelExpanded) {
        setIsTaskPanelAnimationReady(false);
        onTaskPanelToggle?.();
      }
    }, [taskPanelExpanded, onTaskPanelToggle]);

    // 移动端工具栏切换
    const handleMobileToggle = useCallback(() => {
      setIsMobileCollapsed((prev) => !prev);
    }, []);

    const handleMobileTogglePointerDown = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        mobileTogglePointerHandledRef.current = true;
        handleMobileToggle();
      },
      [handleMobileToggle]
    );

    const handleMobileToggleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        handleMobileToggle();
      },
      [handleMobileToggle]
    );

    const handleProfilePanelToggle = useCallback(() => {
      if (!profilePanelExpanded && !hasProfilePanelEverExpanded.current) {
        hasProfilePanelEverExpanded.current = true;
      }
      if (!profilePanelExpanded) {
        setIsProfilePanelAnimationReady(false);
      }
      onProfilePanelToggle?.();
    }, [onProfilePanelToggle, profilePanelExpanded]);

    const handleProfilePanelClose = useCallback(() => {
      if (profilePanelExpanded) {
        setIsProfilePanelAnimationReady(false);
        onProfilePanelToggle?.();
      }
    }, [onProfilePanelToggle, profilePanelExpanded]);

    const handleProfileChange = useCallback((profile: OidcProfileViewModel) => {
      setProfileViewModel(profile);
    }, []);

    const handleAvatarPointerDown = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        avatarPointerHandledRef.current = true;
        handleProfilePanelToggle();
      },
      [handleProfilePanelToggle]
    );

    const handleAvatarClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (avatarPointerHandledRef.current) {
          avatarPointerHandledRef.current = false;
          return;
        }
        handleProfilePanelToggle();
      },
      [handleProfilePanelToggle]
    );

    const handleAvatarKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        handleProfilePanelToggle();
      },
      [handleProfilePanelToggle]
    );

    const renderAvatarTrigger = () => (
      <HoverTip content={avatarTooltip} placement="right" showArrow={false}>
        <CanvasAvatarPlaceholder
          seed={avatarSeed}
          selected={profilePanelExpanded}
          aria-label={profilePanelExpanded ? '关闭个人资料' : '打开个人资料'}
          onPointerDown={handleAvatarPointerDown}
          onClick={handleAvatarClick}
          onKeyDown={handleAvatarKeyDown}
        />
      </HoverTip>
    );

    return (
      <>
        {/* 任务队列面板 - 只在首次展开后才渲染 */}
        {hasEverExpanded.current && (
          <Suspense fallback={null}>
            <TaskQueuePanel
              expanded={taskPanelExpanded && isTaskPanelAnimationReady}
              onClose={handleTaskPanelClose}
            />
          </Suspense>
        )}
        {(hasProfilePanelEverExpanded.current || profilePanelExpanded) && (
          <Suspense fallback={null}>
            <ProfilePanel
              expanded={profilePanelExpanded && isProfilePanelAnimationReady}
              onClose={handleProfilePanelClose}
              onProfileChange={handleProfileChange}
            />
          </Suspense>
        )}

        <Island
          ref={containerRef}
          className={classNames(
            'unified-toolbar',
            ATTACHED_ELEMENT_CLASS_NAME,
            {
              'unified-toolbar--icon-only': isIconMode || isMobileOrTablet,
              'unified-toolbar--mobile-collapsed':
                isMobileOrTablet && isMobileCollapsed,
              'unified-toolbar--dragging': isToolbarDragging,
            },
            className
          )}
          style={
            {
              '--aitu-toolbar-left': `${effectiveToolbarLeft}px`,
            } as React.CSSProperties
          }
          padding={0}
          data-testid="unified-toolbar"
        >
          <HoverTip content="拖动工具栏位置，双击复位" showArrow={false}>
            <button
              type="button"
              className="unified-toolbar__drag-handle"
              aria-label="拖动工具栏位置，双击复位"
              data-testid="toolbar-drag-handle"
              onPointerDown={handleToolbarDragStart}
              onPointerMove={handleToolbarDragMove}
              onPointerUp={finishToolbarDrag}
              onPointerCancel={finishToolbarDrag}
              onDoubleClick={handleToolbarPositionReset}
            />
          </HoverTip>

          {/* 移动端收起状态的快捷按钮区域 */}
          {isMobileOrTablet && isMobileCollapsed && (
            <div className="unified-toolbar__collapsed-shortcuts">
              <CanvasResourcesButton />
              {/* 展开按钮 */}
              <button
                type="button"
                className="unified-toolbar__collapsed-btn unified-toolbar__collapsed-btn--toggle"
                onPointerDown={handleMobileTogglePointerDown}
                onClick={(event) => {
                  event.stopPropagation();
                  if (mobileTogglePointerHandledRef.current) {
                    mobileTogglePointerHandledRef.current = false;
                    return;
                  }
                  handleMobileToggle();
                }}
                onKeyDown={handleMobileToggleKeyDown}
                aria-label="展开工具栏"
              >
                <ChevronUp size={18} />
              </button>
              {renderAvatarTrigger()}
              <button
                type="button"
                className={classNames('unified-toolbar__collapsed-btn', {
                  'unified-toolbar__collapsed-btn--selected': messageDrawerOpen,
                })}
                onClick={onMessageDrawerToggle}
                aria-label="消息中心"
              >
                <span className="message-button__icon">
                  <MessageHornIcon />
                  {unreadCount > 0 && <span className="message-button__dot" />}
                </span>
              </button>
              <button
                type="button"
                className={classNames('unified-toolbar__collapsed-btn', {
                  'unified-toolbar__collapsed-btn--selected': taskPanelExpanded,
                })}
                onClick={handleTaskPanelToggle}
                aria-label="任务队列"
              >
                <TaskIcon />
              </button>
            </div>
          )}

          {/* 移动端展开状态的收起按钮 */}
          {isMobileOrTablet && !isMobileCollapsed && (
            <button
              className="unified-toolbar__mobile-toggle unified-toolbar__mobile-toggle--expanded"
              onPointerDown={handleMobileTogglePointerDown}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onKeyDown={handleMobileToggleKeyDown}
              aria-label="收起工具栏"
            >
              <ChevronDown size={18} />
            </button>
          )}

          {/* 顶部固定区域 - 用户头像、应用菜单、撤销、重做 */}
          <div className="unified-toolbar__section unified-toolbar__section--fixed-top">
            {!(isMobileOrTablet && isMobileCollapsed) && renderAvatarTrigger()}
            <AppToolbar
              embedded={true}
              iconMode={isIconMode || isMobileOrTablet}
              onOpenBackupRestore={onOpenBackupRestore}
              onOpenCloudSync={onOpenCloudSync}
              onOpenWorkflowMode={onOpenWorkflowMode}
            />
          </div>

          {/* 可滚动的工具栏内容区 */}
          <div ref={scrollableRef} className="unified-toolbar__scrollable">
            {/* 创作工具分区 - 手型、选择、思维导图、文本、画笔、箭头、形状、图片、AI工具、缩放 */}
            <div className="unified-toolbar__section">
              <CreationToolbar
                embedded={true}
                iconMode={isIconMode || isMobileOrTablet}
                onOpenMediaLibrary={onOpenMediaLibrary}
                deferredFeaturesEnabled={deferredFeaturesEnabled}
                minimizedToolsBarEnabled={minimizedToolsBarEnabled}
                onEnableToolWindows={onEnableToolWindows}
              />
            </div>
          </div>

          {/* 底部操作区域 - 打开项目 + 工具箱 + 任务队列 - 固定在底部 */}
          <div className="unified-toolbar__section unified-toolbar__section--fixed-bottom">
            <BottomActionsSection
              messageDrawerOpen={messageDrawerOpen}
              onMessageDrawerToggle={onMessageDrawerToggle}
              projectDrawerOpen={projectDrawerOpen}
              onProjectDrawerToggle={onProjectDrawerToggle}
              toolboxDrawerOpen={toolboxDrawerOpen}
              onToolboxDrawerToggle={onToolboxDrawerToggle}
              taskPanelExpanded={taskPanelExpanded}
              onTaskPanelToggle={handleTaskPanelToggle}
              showLocalDataClear={!isMobileOrTablet}
              showResources={!isMobileOrTablet || !isMobileCollapsed}
            />
          </div>
        </Island>
      </>
    );
  }
);
