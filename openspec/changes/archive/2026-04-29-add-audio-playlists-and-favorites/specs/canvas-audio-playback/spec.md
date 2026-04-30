## ADDED Requirements

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
