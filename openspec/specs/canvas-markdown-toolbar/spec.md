# canvas-markdown-toolbar Specification

## Purpose
TBD - created by archiving change add-canvas-markdown-kb-actions. Update Purpose after archive.
## Requirements
### Requirement: Canvas Markdown 卡片知识库保存入口
The system SHALL expose a save-to-knowledge-base action in the canvas popup toolbar when the current selection is a single Markdown card that has not been linked to a knowledge-base note.

#### Scenario: Save an unlinked card to the knowledge base
- **GIVEN** the user selects a single Markdown card on the canvas
- **AND** the card does not have a `noteId`
- **WHEN** the popup toolbar is shown
- **THEN** the toolbar SHALL display a save-to-knowledge-base action
- **AND** activating the action SHALL create a knowledge-base note from the card content
- **AND** the created note id SHALL be written back to the card

### Requirement: Markdown 卡片 duplicate 必须克隆元素
The system SHALL duplicate a selected Markdown card as a new canvas card element instead of copying its text content to the clipboard.

#### Scenario: Duplicate a linked Markdown card
- **GIVEN** the user selects a single Markdown card on the canvas
- **AND** the card may already be linked to a knowledge-base note
- **WHEN** the user activates the duplicate action in the popup toolbar
- **THEN** the system SHALL create a new Markdown card element with the same visible content
- **AND** the new card SHALL not reuse the original card's knowledge-base note id

### Requirement: Markdown 卡片与文本元素内容合并
The system SHALL expose a merge-content action in the canvas popup toolbar when the current multi-selection contains only Markdown cards and plain text elements.

#### Scenario: Merge selected Markdown cards and text elements
- **GIVEN** the user selects multiple canvas elements
- **AND** every selected element is either a Markdown card or a plain text element
- **WHEN** the popup toolbar is shown
- **THEN** the toolbar SHALL display a merge-content action
- **AND** activating the action SHALL merge all selected content into a single Markdown card
- **AND** the merge order SHALL follow the canvas position rule of right into left and bottom into top
- **AND** all merged-away elements SHALL be removed from the canvas

### Requirement: 合并时收敛知识库关联
The system SHALL preserve at most one knowledge-base note binding after a content merge and delete any extra linked notes.

#### Scenario: Merge selection with multiple linked notes
- **GIVEN** the user merges multiple selected Markdown cards or text elements
- **AND** more than one selected card is linked to a different knowledge-base note
- **WHEN** the merge completes
- **THEN** the merged Markdown card SHALL keep exactly one knowledge-base note id
- **AND** the preserved knowledge-base note SHALL be updated with the merged content
- **AND** every other linked knowledge-base note from the merged selection SHALL be deleted

