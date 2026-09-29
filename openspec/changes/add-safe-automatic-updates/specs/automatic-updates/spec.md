## ADDED Requirements
### Requirement: Prepared updates switch automatically at a safe boundary
The application SHALL automatically request a prepared release after 60 seconds of inactivity and a 10-second visible countdown, and SHALL retain manual update and bounded postponement.

#### Scenario: Idle online client
- **WHEN** a different release is verified ready and the client is idle
- **THEN** the client counts down and requests coordinated activation without requiring a click
- **AND** user activity before commitment restarts the idle wait

#### Scenario: Offline or incomplete release
- **WHEN** readiness cannot be verified or critical assets fail preparation
- **THEN** the current verified release remains usable and no automatic activation occurs

### Requirement: All clients and persistence participate in update commitment
The application SHALL require every in-scope client to acknowledge a safe, locked and persisted state before committing an automatic upgrade.

#### Scenario: Busy or legacy tab
- **WHEN** any client is busy, unknown, unresponsive, or reports a failed save
- **THEN** the transaction aborts and releases temporary locks without activation

#### Scenario: Successful upgrade
- **WHEN** all clients persist their board and recoverable drafts and the client set remains unchanged
- **THEN** the waiting worker activates and each prepared tab reloads once to restore its state
- **AND** no generation request is resubmitted by the update mechanism

### Requirement: Old versions have a bounded admission window
The application SHALL preserve the earliest unconsumed readiness timestamp across reloads and superseding pending releases and SHALL stop admitting new long operations after 24 hours while allowing existing work to complete.

#### Scenario: Update is repeatedly postponed
- **WHEN** the first-ready time is at least 24 hours old
- **THEN** another postponement cannot move the deadline
- **AND** new long operations are rejected with an update explanation while current work drains

### Requirement: Old resources remain available to old clients
The worker SHALL retain old application assets while any old or unknown client can still use them and SHALL never clear user media or documents as part of automatic upgrading.

#### Scenario: Other tab remains on the old release
- **WHEN** an old or unknown tab remains connected after an activation
- **THEN** its versioned static cache is retained instead of being deleted after a fixed delay
