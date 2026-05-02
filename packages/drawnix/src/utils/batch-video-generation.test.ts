import { describe, expect, it } from 'vitest';
import type { Task } from '../types/task.types';
import { getNonRetryableBatchVideoFailureReason } from './batch-video-generation';

function buildFailedTask(
  message: string,
  code = 'VIDEO_GENERATION_ERROR'
): Pick<Task, 'error'> {
  return {
    error: {
      code,
      message,
    },
  };
}

describe('batch-video-generation retry classification', () => {
  it('treats parameter HTTP failures as non-retryable', () => {
    const reason = getNonRetryableBatchVideoFailureReason(
      buildFailedTask(
        'Video submission failed: 400 - Invalid parameters: duration must be 5 or 10'
      )
    );

    expect(reason).toBe(
      'Video submission failed: 400 - Invalid parameters: duration must be 5 or 10'
    );
  });

  it('treats provider validation messages as non-retryable', () => {
    const reason = getNonRetryableBatchVideoFailureReason(
      buildFailedTask(
        'Kling image2video requires a reference image',
        'INVALID_ARGUMENT'
      )
    );

    expect(reason).toBe('Kling image2video requires a reference image');
  });

  it('treats Chinese parameter errors as non-retryable', () => {
    const reason = getNonRetryableBatchVideoFailureReason(
      buildFailedTask('参数错误：视频时长必须是 3~15 的整数')
    );

    expect(reason).toBe('参数错误：视频时长必须是 3~15 的整数');
  });

  it('keeps transient failures retryable', () => {
    const reason = getNonRetryableBatchVideoFailureReason(
      buildFailedTask('Video generation timeout'),
      'Polling timeout'
    );

    expect(reason).toBeNull();
  });
});
