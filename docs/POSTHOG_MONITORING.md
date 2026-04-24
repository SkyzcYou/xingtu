# PostHog 监控与 AI 生成埋点复盘

本文档说明了如何在 Opentu 项目中使用 PostHog 上报 Web Vitals、Page Report，以及 AI 生成功能的业务分析数据。

## 功能概述

### 1. Web Vitals 监控 (`web-vitals-service.ts`)

自动监控并上报 Core Web Vitals 指标：

- **LCP (Largest Contentful Paint)**: 最大内容绘制 - 衡量加载性能
  - Good: < 2.5s
  - Needs Improvement: < 4s
  - Poor: ≥ 4s

- **FCP (First Contentful Paint)**: 首次内容绘制
  - Good: < 1.8s
  - Needs Improvement: < 3s
  - Poor: ≥ 3s

- **CLS (Cumulative Layout Shift)**: 累积布局偏移 - 衡量视觉稳定性
  - Good: < 0.1
  - Needs Improvement: < 0.25
  - Poor: ≥ 0.25

- **TTFB (Time to First Byte)**: 首字节时间 - 衡量服务器响应速度
  - Good: < 800ms
  - Needs Improvement: < 1800ms
  - Poor: ≥ 1800ms

- **INP (Interaction to Next Paint)**: 交互到下一次绘制 - 衡量响应性能
  - Good: < 200ms
  - Needs Improvement: < 500ms
  - Poor: ≥ 500ms

### 2. Page Report 监控 (`page-report-service.ts`)

自动监控并上报页面浏览和性能数据：

#### 页面浏览事件 (`page_view`)
- 页面 URL 和路径
- 页面标题
- 来源 (referrer)
- 视口尺寸 (viewport width/height)
- 屏幕尺寸 (screen width/height)
- 设备类型 (mobile/tablet/desktop)
- 浏览器 User Agent
- 浏览器语言

#### 页面性能事件 (`page_performance`)
使用 Navigation Timing API Level 2 收集：
- DNS 查询时间 (`dns_time`)
- TCP 连接时间 (`tcp_time`)
- 请求时间 (`request_time`)
- 响应时间 (`response_time`)
- DOM 处理时间 (`dom_processing_time`)
- DOM Interactive 时间 (`dom_interactive_time`)
- DOM Complete 时间 (`dom_complete_time`)
- 完整加载时间 (`load_time`)
- 资源数量 (`total_resources`)
- 资源总大小 (`total_size`)

#### 其他事件
- `page_unload`: 页面卸载，包含页面停留时间
- `page_hidden`: 页面隐藏（用户切换标签）
- `page_visible`: 页面可见（用户返回标签）

### 3. SPA 导航支持

Page Report 服务自动监听 SPA 单页应用的导航：
- `history.pushState()` 调用
- `history.replaceState()` 调用
- `popstate` 事件（浏览器前进/后退）

## 实现细节

### 初始化流程

在 `apps/web/src/main.tsx` 中：

```typescript
// 等待 PostHog 加载完成后初始化监控
const initMonitoring = () => {
  if (window.posthog) {
    console.log('[Monitoring] PostHog loaded, initializing Web Vitals and Page Report');
    initWebVitals();
    initPageReport();
  } else {
    console.log('[Monitoring] Waiting for PostHog to load...');
    setTimeout(initMonitoring, 500);
  }
};

// 延迟初始化，确保 PostHog 已加载
setTimeout(initMonitoring, 1000);
```

### PostHog 事件格式

所有事件都包含以下标准字段：
- `category`: 事件类别 (`web_vitals` 或 `page_report`)
- `timestamp`: 事件发生时间戳
- `page_url`: 完整页面 URL
- `page_path`: 页面路径

#### Web Vitals 事件示例

```javascript
{
  eventName: 'web_vitals',
  category: 'web_vitals',
  metric_name: 'LCP',
  metric_value: 2345.67,
  metric_rating: 'good',
  metric_id: 'v3-1234567890',
  metric_delta: 123.45,
  navigation_type: 'navigate',
  page_url: 'https://opentu.ai/',
  page_path: '/',
  referrer: 'https://google.com',
  user_agent: 'Mozilla/5.0...',
  timestamp: 1702345678901
}
```

#### Page View 事件示例

```javascript
{
  eventName: 'page_view',
  category: 'page_report',
  page_url: 'https://opentu.ai/',
  page_path: '/',
  page_title: 'Opentu - AI应用平台',
  referrer: 'https://google.com',
  viewport_width: 1920,
  viewport_height: 1080,
  screen_width: 1920,
  screen_height: 1080,
  device_type: 'desktop',
  user_agent: 'Mozilla/5.0...',
  language: 'zh-CN',
  timestamp: 1702345678901
}
```

#### Page Performance 事件示例

```javascript
{
  eventName: 'page_performance',
  category: 'page_report',
  page_url: 'https://opentu.ai/',
  page_path: '/',
  dns_time: 45.2,
  tcp_time: 102.3,
  request_time: 234.5,
  response_time: 156.7,
  dom_processing_time: 456.8,
  dom_interactive_time: 987.6,
  dom_complete_time: 1234.5,
  load_time: 2345.6,
  total_resources: 42,
  total_size: 1234567,
  timestamp: 1702345678901
}
```

## PostHog 查询示例

### 查询 Web Vitals 数据

```javascript
// 查询所有 LCP 数据
event = 'web_vitals' AND properties.metric_name = 'LCP'

// 查询性能较差的 LCP
event = 'web_vitals' AND properties.metric_name = 'LCP' AND properties.metric_rating = 'poor'

// 按页面分组统计平均 LCP
event = 'web_vitals' AND properties.metric_name = 'LCP'
GROUP BY properties.page_path
AGGREGATE AVG(properties.metric_value)
```

### 查询 Page Report 数据

```javascript
// 查询所有页面浏览
event = 'page_view'

// 按设备类型分组统计页面浏览
event = 'page_view'
GROUP BY properties.device_type

// 查询页面加载性能
event = 'page_performance'
AGGREGATE AVG(properties.load_time), P95(properties.load_time)

// 查询特定页面的性能
event = 'page_performance' AND properties.page_path = '/'
```

### 用户漏斗分析

```javascript
// 页面浏览 -> 页面加载完成 -> 用户交互
1. event = 'page_view'
2. event = 'page_performance'
3. event = 'web_vitals' AND properties.metric_name = 'INP'
```

## 性能影响

### Web Vitals 监控
- 使用动态导入 (`import('web-vitals')`)，不影响初始包大小
- 仅在用户与页面交互时收集数据
- 异步上报，不阻塞主线程

### Page Report 监控
- 使用原生浏览器 API，性能开销极小
- 批量上报，减少网络请求
- 延迟初始化（1秒后），不影响页面加载

## 浏览器兼容性

### Web Vitals
- LCP, CLS, FCP: 所有现代浏览器
- INP: Chrome 96+, Edge 96+
- TTFB: 所有现代浏览器

### Page Report
- Navigation Timing API Level 2: Chrome 57+, Firefox 58+, Safari 15+
- Performance Observer: 所有现代浏览器
- 降级方案：在不支持的浏览器中安静失败

## 故障排查

### 问题：PostHog 未加载

**症状**：控制台显示 `[Monitoring] Waiting for PostHog to load...`

**解决方案**：
1. 检查 `apps/web/index.html` 中的 PostHog 初始化脚本
2. 确认 PostHog API key 正确
3. 检查浏览器控制台是否有网络错误
4. 确认 PostHog 服务正常运行

### 问题：Web Vitals 数据未上报

**症状**：PostHog 中没有 `web_vitals` 事件

**解决方案**：
1. 打开浏览器控制台，查看是否有 `[Web Vitals]` 日志
2. 检查 `web-vitals` 包是否正确安装：`npm list web-vitals`
3. 确认页面有足够的用户交互（某些指标需要交互才触发）
4. 检查浏览器是否支持相关 API

### 问题：Page Report 数据不完整

**症状**：某些性能指标缺失

**解决方案**：
1. 某些指标依赖 Navigation Timing API Level 2，检查浏览器兼容性
2. 在本地开发环境，某些指标可能不准确
3. 确认在页面完全加载后才收集数据

## AI 生成埋点改造复盘

### 本轮目标

这次改造优先解决“数据口径不准”，而不是继续堆零散事件。

执行顺序如下：

1. 修复声明式埋点参数丢失
2. 补齐 PostHog LLM starter 依赖的标准事件
3. 补足结果类与恢复类事件
4. 建业务看板验证链路是否闭环

### 关键实现

#### 1. 修复 `data-track-params` 解析缺失

此前组件上已经大量写了 `data-track-params`，但底层只读取旧字段 `track-params`，导致声明式点击事件缺少上下文参数。

- 相关文件：
  - `packages/drawnix/src/services/tracking/tracking-utils.ts`
  - `packages/drawnix/src/services/tracking/tracking-service.ts`
  - `packages/drawnix/src/types/tracking.types.ts`
- 改造结果：
  - 优先解析 `data-track-params`
  - 继续兼容旧字段 `track-params`

#### 2. 在中央层补齐 `$ai_generation`

项目里原本有 `image_generation_success`、`chat_generation_failed` 这类业务事件，但 PostHog LLM starter 主要依赖 `$ai_generation`、`$ai_model`、`$ai_latency`、`$ai_is_error`。这就是 starter 面板过去几乎没法用的核心原因。

- 相关文件：
  - `packages/drawnix/src/utils/posthog-analytics.ts`
- 本轮统一补充：
  - 公共属性：`route_name`、`hostname`、`deployment_env`
  - 标准事件：`$ai_generation`
  - 标准字段：`$ai_model`、`$ai_latency`、`$ai_is_error`
  - 兼容业务字段：`task_id`、`task_type`、`status`、`model`、`duration_ms`、`error`

#### 3. 结果事件收敛到任务服务层

结果动作不应只依赖按钮点击，而应在任务状态真正落地时上报。

- 相关文件：
  - `packages/drawnix/src/services/task-queue-service.ts`
  - `packages/drawnix/src/hooks/useAutoInsertToCanvas.ts`
  - `packages/drawnix/src/components/task-queue/TaskQueuePanel.tsx`
- 本轮新增事件：
  - `generation_result_insert_canvas`
  - `generation_result_download`
  - `generation_retry_after_failure`
  - `task_recovered_after_reload`
- 额外区分：
  - `markAsInserted(taskId, 'manual' | 'auto_insert')`

#### 4. 关键入口补足上下文参数

为后续按模型、生成类型、素材来源拆分分析补齐上下文。

- `ai_input_click_send`
  - `generationType`
  - `model`
  - `profileId`
  - `attachedCount`
  - `promptLengthBucket`
- `task_click_download` / `task_click_insert` / `task_click_retry`
  - `taskId`
  - `taskType`
  - `taskStatus`
- `inspector_use_asset` / `inspector_download` / `inspector_delete`
  - `assetId`
  - `assetType`
  - `assetSource`

### 当前看板

已新增业务看板：

- `AI 生成业务转化看板`
- 地址：`https://us.posthog.com/project/263621/dashboard/1492218`

看板包含两类内容：

1. 复用现有 LLM starter insight
   - `Generation calls`
   - `AI Errors`
   - `Generation latency by model (median)`
2. 新增业务 insight
   - `AI 输入发送量（14d）`
   - `任务关键动作点击（14d）`
   - `生成结果完成动作（14d）`
   - `失败恢复信号（14d）`

### 当前数据结论

以 2026-04-21 创建看板时的 14 天窗口为准：

- `ai_input_click_send` 共 5161 次
- `task_click_retry` 明显高于 `task_click_insert`
- `task_click_download` 很低，下载不是主消费路径
- `$ai_generation` 仍为 0
- `generation_result_insert_canvas` / `generation_result_download` 仍为 0

可得出两个阶段性判断：

1. 当前不是没人用，而是用户更常进入“失败后重试”
2. 新补的标准事件和结果事件还需要正式发版后的真实流量验证

### 经验总结

#### 1. 先修口径，再补数量

参数解析都不对时，继续补更多事件只会放大脏数据。`data-track-params` 解析 bug 的优先级高于继续加按钮埋点。

#### 2. 标准事件应在中央层统一补

`$ai_generation` 这种标准事件应该收敛在 `posthog-analytics.ts` 统一发出，而不是散落在多个业务组件中，否则字段口径很难长期一致。

#### 3. 结果事件应贴近真实业务状态

“插入画布”“下载”“重试”“恢复”更适合在任务服务层上报，而不是只统计点击。这样更接近真实转化，也更利于后续做成功率分析。

#### 4. 没有稳定关联键时，不要强做严格漏斗

当前还缺稳定的 `workflow_id` / `task_chain_id` 一类关联键。此时硬做 funnel 容易失真，先用趋势看板更稳。

#### 5. 命名统一比补新事件更重要

当前存在命名分裂，例如：

- `toolbar_click_ai_image`
- `toolbar_click_ai-image`

这会直接造成口径分叉，后续应优先统一。

### 推荐下一步

1. 发布当前代码，观察看板 24 小时
2. 验证 `$ai_generation` 是否开始进入 LLM starter insight
3. 统一事件命名，优先清理横杠/下划线混用
4. 补稳定关联键，再升级为真实任务漏斗
5. 规范失败原因字段，避免 `error` 文本不可聚合

## 测试

运行单元测试：

```bash
# 测试 Web Vitals 服务
nx test drawnix --testFile=web-vitals-service.test.ts

# 测试 Page Report 服务
nx test drawnix --testFile=page-report-service.test.ts

# 运行所有测试
npm test
```

## 相关文件

- `packages/drawnix/src/services/web-vitals-service.ts` - Web Vitals 监控服务
- `packages/drawnix/src/services/page-report-service.ts` - Page Report 监控服务
- `packages/drawnix/src/utils/posthog-analytics.ts` - PostHog Analytics 工具类
- `apps/web/src/main.tsx` - 应用入口，初始化监控
- `apps/web/index.html` - PostHog 初始化脚本

## 参考资料

- [Web Vitals 官方文档](https://web.dev/vitals/)
- [web-vitals 库](https://github.com/GoogleChrome/web-vitals)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [PostHog 文档](https://posthog.com/docs)
