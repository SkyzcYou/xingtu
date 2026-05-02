## MODIFIED Requirements

### Requirement: Batch video generation runs shot pipelines in parallel

爆款 MV 与爆款视频生成工具在用户执行“全部→生成视频”时，系统 SHALL 为每个待生成镜头启动独立的生成流水线，并允许多个镜头同时推进，而不是按镜头顺序等待前一镜头完成。

#### Scenario: Parallel shot pipelines

- **WHEN** 用户在生成页点击“全部→生成视频”
- **THEN** 系统为多个待生成镜头启动独立流水线
- **AND** 某一镜头的视频生成不需要等待前一镜头的视频生成完成

#### Scenario: Skip completed shot independently

- **WHEN** 某一镜头已经存在已生成视频
- **THEN** 系统跳过该镜头的新视频任务创建
- **AND** 其他未完成镜头仍可并行生成

### Requirement: Each batch shot generates video from its own first frame

系统 SHALL 在每个批量镜头流水线内部先生成或复用该镜头首帧，再用该首帧作为本镜头视频生成输入。

#### Scenario: Generate first frame before shot video

- **GIVEN** 某一镜头没有已生成首帧
- **WHEN** 批量生成处理该镜头
- **THEN** 系统先结合镜头上下文、角色参考图和全局参考图生成该镜头首帧
- **AND** 首帧生成成功后才提交该镜头的视频生成任务

#### Scenario: Reuse existing first frame for shot video

- **GIVEN** 某一镜头已经存在首帧
- **WHEN** 批量生成处理该镜头
- **THEN** 系统直接使用该首帧作为该镜头视频生成输入

### Requirement: Batch generation does not chain previous tail frames

系统 SHALL NOT 在批量生成中自动提取上一段视频尾帧并写入下一段首帧输入。

#### Scenario: Later shot is independent from previous tail frame

- **GIVEN** 第 N 段视频生成完成且存在第 N+1 段
- **WHEN** 批量生成继续处理第 N+1 段
- **THEN** 系统不从第 N 段视频提取尾帧作为第 N+1 段首帧
- **AND** 第 N+1 段使用自己的首帧生成流水线

### Requirement: Batch parallel generation failure and stop are shot-scoped

系统 SHALL 将批量生成失败、重试和停止语义限定在独立镜头流水线内，单个镜头失败不应阻塞其他镜头完成。

#### Scenario: One shot fails while others continue

- **WHEN** 批量生成中的某个镜头流水线失败
- **THEN** 系统可按该镜头的重试策略重试该镜头
- **AND** 其他镜头流水线继续运行或完成

#### Scenario: User stops parallel batch generation

- **WHEN** 用户在批量并行生成过程中执行停止
- **THEN** 系统停止尚未进入下一阶段的流水线继续提交新任务
- **AND** 不再因为镜头顺序创建后续依赖任务
