// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolDefinition } from '../../types/toolbox.types';

const DEFAULT_AUTO_PIN_TOOL: ToolDefinition = {
  id: 'video-analyzer',
  name: '爆款视频生成',
  category: 'ai-tools',
  component: 'video-analyzer',
  supportsMultipleWindows: true,
  defaultWindowBehavior: {
    autoPinOnOpen: true,
  },
};

const SECOND_AUTO_PIN_TOOL: ToolDefinition = {
  id: 'mv-creator',
  name: 'MV 创作',
  category: 'ai-tools',
  component: 'mv-creator',
  supportsMultipleWindows: true,
  defaultWindowBehavior: {
    autoPinOnOpen: true,
  },
};

describe('tool-window-service default window behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubGlobal('crypto', {
      randomUUID: () => 'tool-window-test',
    });
  });

  it('为声明默认自动常驻的工具在打开后创建常驻 launcher', async () => {
    const { toolWindowService } = await import('../tool-window-service');

    const instanceId = toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL);
    expect(instanceId).toBeTruthy();
    expect(toolWindowService.isPinned(DEFAULT_AUTO_PIN_TOOL.id)).toBe(true);

    toolWindowService.closeTool(instanceId!);

    const launcherState = toolWindowService.getToolState(DEFAULT_AUTO_PIN_TOOL.id);
    expect(launcherState?.isLauncher).toBe(true);
    expect(launcherState?.toolId).toBe(DEFAULT_AUTO_PIN_TOOL.id);
  });

  it('允许调用方显式 autoPin false 覆盖工具默认自动常驻', async () => {
    const { toolWindowService } = await import('../tool-window-service');

    toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL, { autoPin: false });

    expect(toolWindowService.isPinned(DEFAULT_AUTO_PIN_TOOL.id)).toBe(false);
    expect(toolWindowService.getToolState(DEFAULT_AUTO_PIN_TOOL.id)?.isLauncher).not.toBe(true);
  });

  it('在用户手动取消常驻后保留该覆盖选择', async () => {
    const { toolWindowService } = await import('../tool-window-service');

    const instanceId = toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL);
    expect(toolWindowService.isPinned(DEFAULT_AUTO_PIN_TOOL.id)).toBe(true);

    toolWindowService.setPinned(DEFAULT_AUTO_PIN_TOOL.id, false);
    toolWindowService.closeTool(instanceId!);

    expect(toolWindowService.isPinned(DEFAULT_AUTO_PIN_TOOL.id)).toBe(false);

    toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL);
    expect(toolWindowService.isPinned(DEFAULT_AUTO_PIN_TOOL.id)).toBe(false);
  });

  it('已常驻工具在打开后仍保持工具栏中的原有顺序', async () => {
    const { toolWindowService } = await import('../tool-window-service');

    const firstInstanceId = toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL);
    toolWindowService.closeTool(firstInstanceId!);

    const secondInstanceId = toolWindowService.openTool(SECOND_AUTO_PIN_TOOL);
    toolWindowService.closeTool(secondInstanceId!);

    expect(toolWindowService.getToolbarTools().map((state) => state.toolId)).toEqual([
      DEFAULT_AUTO_PIN_TOOL.id,
      SECOND_AUTO_PIN_TOOL.id,
    ]);

    toolWindowService.openTool(SECOND_AUTO_PIN_TOOL);

    expect(
      toolWindowService.getToolbarTools().map((state) => ({
        toolId: state.toolId,
        isLauncher: state.isLauncher,
      }))
    ).toEqual([
      {
        toolId: DEFAULT_AUTO_PIN_TOOL.id,
        isLauncher: true,
      },
      {
        toolId: SECOND_AUTO_PIN_TOOL.id,
        isLauncher: false,
      },
    ]);
  });
});

describe('tool window automatic update safety', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubGlobal('crypto', { randomUUID: () => 'update-tool-window-test' });
  });

  it('vetoes minimized instances but permits pinned launchers after the editor is closed', async () => {
    const [{ toolWindowService }, { autoUpdateSafety }] = await Promise.all([
      import('../tool-window-service'), import('../auto-update-safety'),
    ]);
    autoUpdateSafety.setAppReady(true);
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
    const id = toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL)!;
    expect(await autoUpdateSafety.getBlockReason()).toContain('爆款视频生成');
    toolWindowService.minimizeTool(id);
    expect(await autoUpdateSafety.getBlockReason()).toContain('最小化');
    toolWindowService.closeTool(id);
    expect(toolWindowService.getToolbarTools().some((state) => state.isLauncher)).toBe(true);
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
  });

  it('blocks every new or restored window entry point while update preparation is locked', async () => {
    const [{ toolWindowService }, { autoUpdateSafety }] = await Promise.all([
      import('../tool-window-service'), import('../auto-update-safety'),
    ]);
    autoUpdateSafety.setAppReady(true);
    expect(await autoUpdateSafety.prepare('tool-window-lock')).toEqual({ ready: true });
    expect(() => toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL)).toThrow('新版本');
    expect(() => toolWindowService.openNewToolInstance(DEFAULT_AUTO_PIN_TOOL)).toThrow('新版本');
    expect(() => toolWindowService.restoreTool('unknown')).toThrow('新版本');
    expect(toolWindowService.getToolStates()).toEqual([]);
    autoUpdateSafety.release('tool-window-lock');
    expect(toolWindowService.openTool(DEFAULT_AUTO_PIN_TOOL)).toBeTruthy();
  });
});
