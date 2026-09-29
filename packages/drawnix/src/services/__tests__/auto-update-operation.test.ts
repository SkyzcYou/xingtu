import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoUpdateSafety } from '../auto-update-safety';
import { runWithUpdateProtection } from '../auto-update-operation';

beforeEach(() => {
  autoUpdateSafety.setAppReady(true);
  autoUpdateSafety.setDraining(false);
});
afterEach(() => {
  autoUpdateSafety.setDraining(false);
  autoUpdateSafety.release('during-upload');
});

describe('long operation automatic update protection', () => {
  it('vetoes an update until a long operation and its cleanup finish', async () => {
    let complete!: () => void;
    const running = runWithUpdateProtection(
      '正在上传附件',
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        })
    );
    expect(await autoUpdateSafety.prepare('during-upload')).toEqual({
      ready: false,
      reason: '正在上传附件',
    });
    complete();
    await running;
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
  });

  it('always releases the guard on error', async () => {
    await expect(
      runWithUpdateProtection('正在导入', async () => {
        throw new Error('导入失败');
      })
    ).rejects.toThrow('导入失败');
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
  });

  it('does not run newly submitted work during drain', async () => {
    autoUpdateSafety.setDraining(true);
    const start = vi.fn();
    await expect(runWithUpdateProtection('正在导出', start)).rejects.toThrow(
      '自动更新'
    );
    expect(start).not.toHaveBeenCalled();
    await expect(
      runWithUpdateProtection('正在完成已有任务的插入', async () => 'done', {
        allowDuringDrain: true,
      })
    ).resolves.toBe('done');
  });
});
