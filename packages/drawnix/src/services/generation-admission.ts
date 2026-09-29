import { autoUpdateSafety } from './auto-update-safety';

// Kept separate from executors to avoid a task-queue/workflow import cycle.
let isRunningWorkflow: (workflowId: string) => boolean = () => false;

export function setWorkflowAdmissionResolver(
  resolver: (workflowId: string) => boolean
): void {
  isRunningWorkflow = resolver;
}

export function canContinueWorkflowDuringUpdate(workflowId: unknown): boolean {
  return typeof workflowId === 'string' && isRunningWorkflow(workflowId);
}

export function assertGenerationAdmission(workflowId?: unknown): void {
  autoUpdateSafety.assertCanStartWork({
    allowDuringDrain: canContinueWorkflowDuringUpdate(workflowId),
  });
}
