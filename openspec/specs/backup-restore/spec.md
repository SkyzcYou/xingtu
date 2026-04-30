# backup-restore Specification

## Purpose
TBD - created by archiving change add-complete-environment-backup-restore. Update Purpose after archive.
## Requirements
### Requirement: Complete Environment Backup
The system SHALL support a complete backup mode that captures all durable user-facing environment data needed to restore the app to the backed-up state.

#### Scenario: Complete backup includes durable domains
- **GIVEN** the user has projects, assets, tasks, workflows, prompts, knowledge base content, chats, playlists, skills, model preferences, and UI preferences
- **WHEN** the user creates a complete backup
- **THEN** the backup SHALL include every selected durable domain
- **AND** the manifest SHALL record v4 schema metadata, selected domains, per-domain stats, and backup mode

### Requirement: Replace Restore
The system SHALL support replace restore for complete backups by clearing selected local domains before importing backup data.

#### Scenario: Replace restore mirrors the backup
- **GIVEN** the current browser has existing local data
- **AND** the user selects replace restore for a complete backup
- **WHEN** restore completes
- **THEN** selected domains SHALL match the backup content instead of being merged with previous local content
- **AND** the workspace SHALL reload and restore the backed-up current board when available

### Requirement: Encrypted Secrets
The system SHALL export sensitive configuration only when the user explicitly includes secrets and provides a backup password.

#### Scenario: Secrets require password
- **GIVEN** settings contain API keys, provider profiles, or sync credentials
- **WHEN** the user creates a backup without enabling secrets
- **THEN** sensitive values SHALL NOT be written to normal backup JSON
- **WHEN** the user enables secrets and provides a password
- **THEN** sensitive values SHALL be written only to an encrypted secrets payload

### Requirement: Full Task and Prompt Fidelity
The system SHALL include full terminal and archived generation history required by prompt history, media library, PPT, audio, and task queue views.

#### Scenario: Task and prompt data survives restore
- **GIVEN** completed or archived image, video, audio, PPT, text, and agent tasks exist
- **WHEN** the user backs up and restores data
- **THEN** restored task records SHALL be persisted to IndexedDB
- **AND** prompt preset settings SHALL include all supported prompt types, deleted prompt contents, and prompt overrides

### Requirement: Backward Compatibility
The system SHALL continue importing existing v2 and v3 backups.

#### Scenario: Legacy backups import incrementally
- **GIVEN** a valid v2 or v3 backup without environment files
- **WHEN** the user imports it
- **THEN** existing prompt, project, asset, task, and knowledge base import behavior SHALL continue to work
- **AND** missing v4 environment data SHALL be reported as skipped, not as a fatal error

### Requirement: Shared Backup Restore Core
系统 SHALL 提供一套由主应用与 `sw-debug` 共用的备份恢复核心逻辑，用于统一备份格式、导出筛选、导入恢复顺序与去重规则。

#### Scenario: Main App and sw-debug export the same data semantics
- **GIVEN** 主应用与 `sw-debug` 访问的是同一份项目、素材、任务、提示词与知识库数据
- **WHEN** 用户分别从主应用与 `sw-debug` 执行备份
- **THEN** 两边都必须产出兼容的 manifest 与 ZIP 目录结构
- **AND** 音频、任务结果、知识库、项目目录和素材元数据的导出语义必须一致

#### Scenario: Shared core fixes apply to both environments
- **GIVEN** 共享备份恢复核心修复了素材命名冲突或音频任务筛选问题
- **WHEN** 主应用或 `sw-debug` 执行备份恢复
- **THEN** 两边都必须同时继承同一修复行为
- **AND** 不允许再出现仅一端生效、另一端仍保留旧逻辑的情况

### Requirement: Environment Adapter Boundary
系统 SHALL 将备份恢复中的环境相关能力限制在适配层，以隔离核心逻辑与平台依赖。

#### Scenario: Core stays independent from app-specific services
- **GIVEN** 共享备份恢复核心需要读取或写入数据
- **WHEN** 核心执行导出或导入
- **THEN** 核心只能通过适配接口访问项目、素材、任务、提示词、知识库与缓存能力
- **AND** 核心不得直接依赖主应用 UI、React 状态或 `sw-debug` DOM 节点

### Requirement: Knowledge Base Parity
系统 SHALL 保证主应用与 `sw-debug` 在共享内核接入后，对知识库备份与恢复采用同一数据结构与导入顺序。

#### Scenario: Knowledge base backup is available in both environments
- **GIVEN** 知识库中存在目录、笔记、标签和图片
- **WHEN** 用户从主应用或 `sw-debug` 执行备份恢复
- **THEN** 两边都必须使用同一份知识库序列化结构
- **AND** 导入后笔记数量、目录映射和标签关联必须保持一致

