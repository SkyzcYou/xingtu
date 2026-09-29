import { describe, expect, it } from 'vitest';
import { AutoUpdatePolicy } from './auto-update-policy';
import { AUTO_UPDATE_MAX_DEFER_MS } from '../../../../packages/drawnix/src/utils/auto-update-protocol';

describe('automatic update policy', () => {
  it('waits for inactivity, counts down, and resets on user input', () => {
    const policy = new AutoUpdatePolicy(1000);
    policy.ready('next', 1000, 1000);
    policy.activity(1000);
    expect(policy.evaluate(60_999, null).eligible).toBe(false);
    expect(policy.evaluate(61_000, null).remainingSeconds).toBe(10);
    expect(policy.evaluate(70_000, null).remainingSeconds).toBe(1);
    policy.activity(70_001);
    expect(policy.evaluate(71_000, null).remainingSeconds).toBeUndefined();
    expect(policy.evaluate(130_001, null).remainingSeconds).toBe(10);
    expect(policy.evaluate(140_001, null).eligible).toBe(true);
  });

  it('a fresh untouched page can update after the startup countdown', () => {
    const policy = new AutoUpdatePolicy(1000);
    policy.ready('next', 1000, 1000);
    expect(policy.evaluate(1000, null).remainingSeconds).toBe(10);
    expect(policy.evaluate(11_000, null).eligible).toBe(true);
  });

  it('does not bypass work or persistence vetoes, even at the deadline', () => {
    const policy = new AutoUpdatePolicy(0);
    policy.ready('next', 0, 0);
    policy.requestNow();
    expect(policy.evaluate(AUTO_UPDATE_MAX_DEFER_MS, '正在生成')).toMatchObject(
      { eligible: false, reason: '正在生成', overdue: true }
    );
    expect(policy.evaluate(AUTO_UPDATE_MAX_DEFER_MS + 1, null).eligible).toBe(
      true
    );
  });

  it('bounds postponement and preserves the earliest age across superseding releases', () => {
    const policy = new AutoUpdatePolicy(0);
    policy.ready('v2', 0, 0);
    expect(policy.postpone(10)).toBe(true);
    expect(policy.evaluate(20, null).reason).toBe('已稍后更新');
    policy.ready(
      'v3',
      AUTO_UPDATE_MAX_DEFER_MS - 1000,
      AUTO_UPDATE_MAX_DEFER_MS - 1000
    );
    expect(policy.firstReadyAt).toBe(0);
    policy.postpone(AUTO_UPDATE_MAX_DEFER_MS - 500);
    expect(policy.postponedUntil).toBe(AUTO_UPDATE_MAX_DEFER_MS);
    expect(policy.postpone(AUTO_UPDATE_MAX_DEFER_MS)).toBe(false);
    policy.activity(AUTO_UPDATE_MAX_DEFER_MS);
    expect(
      policy.evaluate(AUTO_UPDATE_MAX_DEFER_MS, null).remainingSeconds
    ).toBe(10);
    expect(
      policy.evaluate(AUTO_UPDATE_MAX_DEFER_MS + 10_000, null).eligible
    ).toBe(true);
  });

  it('restarts the countdown after a task begins during it', () => {
    const policy = new AutoUpdatePolicy(0);
    policy.ready('next', 0, 0);
    policy.evaluate(0, null);
    expect(policy.evaluate(9000, '上传中').eligible).toBe(false);
    expect(policy.evaluate(11_000, null).remainingSeconds).toBe(10);
  });

  it('consumes the first-ready deadline when the target release has booted', () => {
    const policy = new AutoUpdatePolicy(0);
    policy.ready('v2', 0, 0);
    policy.clear();
    policy.ready('v3', AUTO_UPDATE_MAX_DEFER_MS, AUTO_UPDATE_MAX_DEFER_MS);
    expect(policy.isOverdue(AUTO_UPDATE_MAX_DEFER_MS)).toBe(false);
  });
});
