import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autoUpdateSafety } from '../auto-update-safety';
import {
  assertGenerationAdmission,
  setWorkflowAdmissionResolver,
} from '../generation-admission';

beforeEach(() => {
  autoUpdateSafety.setAppReady(true);
  autoUpdateSafety.setDraining(false);
  setWorkflowAdmissionResolver(() => false);
});
afterEach(() => {
  autoUpdateSafety.release('test-update');
  autoUpdateSafety.setDraining(false);
  setWorkflowAdmissionResolver(() => false);
});

describe('generation admission during automatic update', () => {
  it('blocks new tasks while letting only existing running workflows drain', () => {
    setWorkflowAdmissionResolver((id) => id === 'running-workflow');
    autoUpdateSafety.setDraining(true);
    expect(() => assertGenerationAdmission()).toThrow('自动更新');
    expect(() => assertGenerationAdmission('completed-workflow')).toThrow(
      '自动更新'
    );
    expect(() => assertGenerationAdmission('unknown-workflow')).toThrow(
      '自动更新'
    );
    expect(() => assertGenerationAdmission('running-workflow')).not.toThrow();
  });

  it('the preparation fence rejects even a previously admitted workflow', async () => {
    setWorkflowAdmissionResolver(() => true);
    expect(await autoUpdateSafety.prepare('test-update')).toEqual({
      ready: true,
    });
    expect(() => assertGenerationAdmission('running-workflow')).toThrow(
      '自动更新'
    );
    autoUpdateSafety.release('test-update');
    expect(() => assertGenerationAdmission('running-workflow')).not.toThrow();
  });
});
