## ADDED Requirements

### Requirement: Shared playback modes for audio players
The system SHALL provide shared playback modes for the global floating audio player and the music player tool.

#### Scenario: Switch playback mode from the floating player
- **GIVEN** an audio or reading queue is active
- **WHEN** the user changes playback mode from the floating player dropdown
- **THEN** the system SHALL update the shared playback mode state
- **AND** the music player tool SHALL reflect the same selected mode

#### Scenario: Switch playback mode from the music player tool
- **GIVEN** an audio or reading queue is active
- **WHEN** the user changes playback mode from the music player tool dropdown
- **THEN** the system SHALL update the shared playback mode state
- **AND** the floating player SHALL reflect the same selected mode

### Requirement: Continue playback according to the selected mode
The system SHALL determine queue continuation behavior according to the selected playback mode.

#### Scenario: Stop at the end in sequential mode
- **GIVEN** the current playback mode is `顺序播放`
- **WHEN** the last item in the active queue finishes
- **THEN** the system SHALL stop playback on the current item

#### Scenario: Restart queue in list-loop mode
- **GIVEN** the current playback mode is `列表循环`
- **WHEN** the last item in the active queue finishes
- **THEN** the system SHALL continue playback from the first item in the same queue

#### Scenario: Replay current item in single-loop mode
- **GIVEN** the current playback mode is `单曲循环`
- **WHEN** the active queue item finishes
- **THEN** the system SHALL restart the same queue item from the beginning

#### Scenario: Pick another item in shuffle mode
- **GIVEN** the current playback mode is `随机播放`
- **WHEN** the active queue item finishes and the queue contains multiple items
- **THEN** the system SHALL continue playback with a different queue item when possible
