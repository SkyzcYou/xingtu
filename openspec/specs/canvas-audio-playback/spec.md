# canvas-audio-playback Specification

## Purpose
TBD - created by archiving change add-audio-playback-modes. Update Purpose after archive.
## Requirements
### Requirement: Shared playback modes for audio players
The system SHALL provide shared playback controls for the global floating audio player and the music player tool.

#### Scenario: Switch playback speed from the floating player
- **GIVEN** an audio or reading queue is active
- **WHEN** the user changes playback speed from the floating player dropdown
- **THEN** the system SHALL update the shared playback speed state
- **AND** the music player tool SHALL reflect the same selected speed

#### Scenario: Switch playback speed from the music player tool
- **GIVEN** an audio or reading queue is active
- **WHEN** the user changes playback speed from the music player tool dropdown
- **THEN** the system SHALL update the shared playback speed state
- **AND** the floating player SHALL reflect the same selected speed

#### Scenario: Sync reading speed with TTS settings
- **GIVEN** the active queue is a reading queue
- **WHEN** the user changes playback speed from either player entry
- **THEN** the system SHALL update the current reading playback speed
- **AND** SHALL sync the same value to `tts.rate`

#### Scenario: Reflect external TTS speed changes during reading
- **GIVEN** a reading queue is active
- **WHEN** `tts.rate` changes from the settings panel
- **THEN** the shared reading playback speed SHALL update
- **AND** both player entries SHALL reflect the latest reading speed

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

### Requirement: Persistent audio playlists
The system SHALL provide persistent audio playlists for audio assets, including a default favorites playlist.

#### Scenario: Initialize default favorites playlist
- **WHEN** the audio playlist feature is initialized
- **THEN** the system SHALL ensure a system playlist named `收藏` exists
- **AND** the playlist SHALL be available without requiring user creation

#### Scenario: Create a custom playlist
- **WHEN** the user creates a new playlist with a valid name
- **THEN** the system SHALL persist the playlist
- **AND** the playlist SHALL appear in the music player and media library playlist selectors

### Requirement: Manage playlist membership from audio asset cards
The system SHALL allow users to manage playlist membership from audio asset cards.

#### Scenario: Toggle favorites from an audio card
- **GIVEN** an audio asset card is visible in the media library
- **WHEN** the user activates the favorite heart control
- **THEN** the system SHALL add or remove the asset from the favorites playlist
- **AND** the card SHALL reflect the updated favorite state

#### Scenario: Add audio to a selected playlist from context menu
- **GIVEN** an audio asset card is visible in the media library
- **WHEN** the user opens the context menu and selects a target playlist
- **THEN** the system SHALL add the audio asset to that playlist without duplicating the same asset within the playlist

### Requirement: Preserve separate canvas and playlist playback queues
The system SHALL preserve canvas playback behavior while supporting playlist-based playback.

#### Scenario: Keep canvas playback queue unchanged
- **GIVEN** the user starts playback from a canvas audio node
- **WHEN** the global player is used to navigate previous or next tracks
- **THEN** the player SHALL continue using the current canvas audio queue

#### Scenario: Use playlist queue for music player playback
- **GIVEN** the user starts playback from a music playlist
- **WHEN** the global player is used to navigate previous or next tracks
- **THEN** the player SHALL use the active playlist queue
- **AND** the player SHALL expose the active playlist name in its UI

### Requirement: Play Canvas Audio Assets In Place

The system SHALL allow audio assets inserted onto the canvas to be played and paused directly within the workspace.

#### Scenario: Play an inserted audio node on the canvas

- **GIVEN** an audio task has completed and its result has been inserted onto the canvas
- **WHEN** the user activates the audio node
- **THEN** the system SHALL begin playback for that node inside the workspace
- **AND** SHALL not require opening the audio URL in a separate browser tab

#### Scenario: Pause the currently playing audio node

- **GIVEN** a canvas audio node is currently playing
- **WHEN** the user activates the same node again
- **THEN** the system SHALL pause playback
- **AND** SHALL update the node's active playback state accordingly

### Requirement: Render Audio As A First-Class Canvas Component

The system SHALL render newly inserted audio assets as dedicated audio components instead of static SVG image cards.

#### Scenario: Insert a generated audio result as a component node

- **GIVEN** an audio generation result includes a playable URL and metadata
- **WHEN** the result is inserted onto the canvas
- **THEN** the canvas SHALL create an audio-specific element
- **AND** the element SHALL render structured UI such as title, cover, waveform, or play state feedback

#### Scenario: Show playback feedback inside the audio node

- **GIVEN** a canvas audio node is active or currently playing
- **WHEN** the node re-renders
- **THEN** the node SHALL visually reflect the current playback state
- **AND** SHALL not appear as a plain static image thumbnail

#### Scenario: Drive waveform rhythm from the active audio signal when available

- **GIVEN** a canvas audio node is currently playing
- **WHEN** browser audio analysis is available for the active media source
- **THEN** the node waveform and rhythm feedback SHALL respond to the live audio signal instead of only using static decorative animation
- **AND** inactive nodes SHALL not require the same high-frequency visual updates

#### Scenario: Gracefully fall back when audio analysis is unavailable

- **GIVEN** a canvas audio node is currently playing
- **WHEN** browser capabilities or media origin rules prevent live audio analysis
- **THEN** playback SHALL continue
- **AND** the node SHALL fall back to a non-reactive waveform presentation without crashing the workspace

#### Scenario: Keep audio node composition stable while resizing

- **GIVEN** a canvas audio node is selected
- **WHEN** the user resizes the node
- **THEN** the node SHALL preserve its intended component proportions
- **AND** SHALL avoid arbitrary stretching that distorts the cover, waveform, and timing layout

#### Scenario: Hide technical provider details from the main node surface

- **GIVEN** a canvas audio node retains provider metadata for follow-up actions
- **WHEN** the node is rendered in the workspace
- **THEN** the visible node UI SHALL prioritize title, playback state, and user-facing semantic information
- **AND** SHALL not expose technical model or provider identifiers as a primary badge

### Requirement: Provide A Global Canvas Audio Player Overlay

The system SHALL expose a lightweight global playback overlay while canvas audio is active.

#### Scenario: Show the top player while audio is playing

- **GIVEN** a canvas audio asset is currently playing
- **WHEN** playback is active
- **THEN** the workspace SHALL display a compact playback overlay near the top center of the canvas
- **AND** SHALL show at least the current title, play state, and progress

#### Scenario: Control playback queue and volume from the overlay

- **GIVEN** the global playback overlay is visible for a canvas audio asset
- **WHEN** the user uses the overlay controls
- **THEN** the overlay SHALL support previous and next track navigation within the current canvas audio queue
- **AND** SHALL support adjusting playback volume without leaving the workspace

#### Scenario: Close the overlay and stop playback

- **GIVEN** the global playback overlay is visible
- **WHEN** the user closes the overlay
- **THEN** the system SHALL stop the active playback
- **AND** SHALL clear the current active audio state

### Requirement: Preserve Audio Provider Metadata For Follow-Up Actions

The system SHALL preserve provider-level audio identifiers from generation results through task storage and canvas insertion.

#### Scenario: Keep clip identifiers on inserted audio nodes

- **GIVEN** an audio generation result includes provider task and clip identifiers
- **WHEN** that result is inserted onto the canvas
- **THEN** the inserted audio element SHALL retain the corresponding provider task identifier and clip identifier metadata

#### Scenario: Reuse stored provider metadata after task restoration

- **GIVEN** an audio task has been persisted and later restored from storage or sync
- **WHEN** the restored result is inserted or inspected
- **THEN** the restored task result SHALL still expose the provider task identifier and clip identifiers needed for follow-up actions

