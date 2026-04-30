## 1. Shared Workflow Shell

- [x] 1.1 Add `WorkflowStepBar` with configuration-driven steps and disabled rules
- [x] 1.2 Add `useWorkflowTaskSync` for completed task scanning, subscription, de-duping, and cleanup
- [x] 1.3 Add `useWorkflowRecords` for record list, current record, starred filter, and basic selection/update actions
- [x] 1.4 Add `WorkflowNavBar` for shared step/history/starred navigation shell
- [x] 1.5 Add `useWorkflowNavigation` for page and history/starred navigation actions

## 2. Container Migration

- [x] 2.1 Migrate video analyzer to shared workflow shell primitives
- [x] 2.2 Migrate MV creator to shared workflow shell primitives while preserving `hasShots` navigation gates
- [x] 2.3 Migrate music analyzer to shared workflow shell primitives
- [x] 2.4 Remove superseded local StepBar implementations and unused imports
- [x] 2.5 Migrate duplicated history/starred navigation JSX to `WorkflowNavBar`
- [x] 2.6 Migrate duplicated navigation action handlers to `useWorkflowNavigation`

## 3. Validation

- [x] 3.1 Add focused unit tests for step bar rendering and disabled behavior
- [x] 3.2 Add focused unit tests for task sync lifecycle and cleanup
- [x] 3.3 Add focused unit tests for record state helpers
- [x] 3.4 Run OpenSpec validation and targeted workflow tests
- [x] 3.5 Run broader project checks as far as the current worktree allows
- [x] 3.6 Add focused unit tests for shared workflow navigation shell
- [x] 3.7 Add focused unit tests for shared workflow navigation hook
