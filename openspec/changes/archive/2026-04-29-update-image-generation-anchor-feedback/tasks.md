## 1. Product Rules
- [x] 1.1 定义生图锚点的用户态状态机与文案规范
- [x] 1.2 定义 `Frame-first / Size-first / Ghost-anchor` 三档几何策略
- [x] 1.3 明确生图锚点与任务详情层的职责边界

## 2. State Model
- [x] 2.1 新增 `image-generation-anchor.types.ts`，定义 anchor 元素、用户态与几何上下文
- [x] 2.2 新增 anchor view model / controller，统一映射任务状态、进度与后处理阶段
- [x] 2.3 收敛生图反馈所需的提交期几何信号（插入点、Frame、size）
- [x] 2.4 为失败重试与刷新恢复定义统一的锚点状态转换
- [x] 2.5 定义 submission context 与 anchor view model 的字段契约，避免多模块各自拼装
- [x] 2.6 明确 controller 为 image anchor 的单一状态源，禁止其他模块直接双写 UI 状态

## 3. UI Implementation
- [x] 3.1 新增 `with-image-generation-anchor.ts`，注册 `generation-anchor` 元素与 transforms
- [x] 3.2 新增 `ImageGenerationAnchorContent.tsx` 与样式文件，替代生图默认大卡片
- [x] 3.3 实现 `Frame Anchor` 与 `Ratio Anchor` 的首版渲染
- [x] 3.4 实现 `Ghost-anchor` 兜底渲染
- [x] 3.5 实现锚点到真实图片的完成态过渡
- [x] 3.6 实现失败态节点与重试入口

## 4. Workflow Integration
- [x] 4.1 在 `AIInputBar` 中为 `image` 类型接入“已提交”即时反馈，并创建首个 anchor
- [x] 4.2 在 `useAutoInsertToCanvas` 中基于 `taskId` 查找 anchor，驱动 `developing / inserting / completed / failed`
- [x] 4.3 在 `Drawnix` 中挂载 image anchor 的同步 / 恢复 hook
- [x] 4.4 为生图路径分流现有 `WorkZone`，避免默认展示大卡片
- [x] 4.5 保留非生图任务对现有 `WorkZone` 的兼容
- [x] 4.6 调整 `useWorkflowSubmission`，避免 image 路径继续走默认 WorkZone 同步
- [x] 4.7 调整 `useTaskWorkflowSync`，避免 image 任务 fallback 到 WorkZone
- [x] 4.8 清理 image 路径中的重复 `setTimeout` 删除与 `ai-generation-complete` 双写依赖

## 5. Validation
- [x] 5.1 验证选中 Frame 生图时的锚点几何一致性
- [x] 5.2 验证指定 `size` 生图时的比例一致性
- [x] 5.3 验证无 Frame / 无稳定比例时的 `Ghost-anchor` 降级体验
- [x] 5.4 验证生图路径不再默认创建大 `WorkZone` 卡片
- [x] 5.5 验证失败、重试、刷新恢复与自动插入完成后的收口行为
- [x] 5.6 Code review 审计 image 路径是否仍残留 `WorkZoneTransforms` 双写
- [x] 5.7 验证非图片任务仍保持旧 WorkZone 路径不受影响
- [x] 5.8 手工审计 `AIInputBar`、`Drawnix`、`useAutoInsertToCanvas`、`useWorkflowSubmission`、`useTaskWorkflowSync` 的 image 路径 ownership
