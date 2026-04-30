## ADDED Requirements

### Requirement: Workflow Containers SHALL Share Internal Step Navigation

The system SHALL render workflow step navigation through a shared internal component so that active, past, disabled, and click behavior remains consistent across workflow pages.

#### Scenario: Workflow step navigation preserves page gates

- **WHEN** a workflow page renders its steps
- **THEN** each step SHALL use the workflow's configured id and label
- **AND** steps whose requirements are not met SHALL be disabled
- **AND** disabled steps SHALL NOT trigger navigation

### Requirement: Workflow Containers SHALL Share Completed Task Synchronization

The system SHALL synchronize completed workflow tasks through a shared internal lifecycle helper that scans existing completed tasks, subscribes to future task updates, avoids duplicate in-flight synchronization, and cleans up subscriptions on unmount.

#### Scenario: Completed task updates are synchronized once

- **WHEN** an existing completed task or future completed task matches a workflow sync handler
- **THEN** the workflow SHALL run the matching synchronization once per in-flight task id
- **AND** apply returned record updates only while the workflow container is still mounted

#### Scenario: Task synchronization is cleaned up

- **WHEN** the workflow container unmounts
- **THEN** the task update subscription SHALL be unsubscribed
- **AND** late synchronization results SHALL NOT update React state

### Requirement: Workflow Containers SHALL Share Basic Record State

The system SHALL keep workflow record list, current record, and starred-history state in a shared internal hook while preserving existing storage keys, record schemas, and page-specific navigation behavior.

#### Scenario: Workflow records load and update without schema changes

- **WHEN** a workflow container mounts or receives a record update
- **THEN** it SHALL use the existing workflow storage functions
- **AND** SHALL NOT change stored record shape or storage key

### Requirement: Workflow Containers SHALL Share History Navigation Shell

The system SHALL render workflow history and starred navigation through a shared internal component while preserving each workflow's page-specific back target and step configuration.

#### Scenario: Workflow history navigation preserves behavior

- **WHEN** a workflow is on a normal step page
- **THEN** the navigation SHALL show history and starred entry buttons with existing count badges
- **AND** opening either entry SHALL preserve the workflow's existing history page behavior

#### Scenario: Workflow history header preserves behavior

- **WHEN** a workflow is on its history page
- **THEN** the navigation SHALL show the existing back button, title, and starred filter toggle
- **AND** the back button SHALL return to that workflow's configured entry page

### Requirement: Workflow Containers SHALL Share Navigation Actions

The system SHALL keep workflow page state and history/starred entry actions in a shared internal hook while preserving workflow-specific default pages and explicit page transitions.

#### Scenario: Workflow opens history and starred views

- **WHEN** a workflow container opens all-history or starred-history
- **THEN** the shared navigation hook SHALL move to the configured history page
- **AND** SHALL set the starred filter to the matching existing value

#### Scenario: Workflow returns to default page

- **WHEN** a workflow container requests a restart or history back action
- **THEN** the shared navigation hook SHALL return to that workflow's configured default page
