# PPT 媒体导出经验总结

更新日期：2026-04-27

## 背景

PPT 导出不能只把画布里的图片、文本和形状转成静态元素。画布里的视频通常是“图片元素 + `#video` / `isVideo` 元数据”，音频可能是 `type: 'audio'` 节点，也可能是旧版音频图片卡。如果导出器只按普通图片分支处理，这些媒体要么被跳过，要么只剩一个不可播放的卡片。

这类问题的原则是：小媒体尽量嵌入，大媒体可见降级，失败不能静默消失。

## 经验原则

1. 媒体识别要在普通图片分支之前。
   - 视频元素经常仍是 `type: 'image'`。
   - 识别信号包括 `isVideo`、`videoType`、`#video`、`#merged-video` 和视频扩展名。
   - 音频要同时兼容新音频节点和 legacy 音频图片卡。

2. 嵌入前必须做大小保护。
   - 默认单媒体上限保持 50MB。
   - 先看 `content-length`，再流式读取并累计大小。
   - 超限只降级当前元素，不中断整套 PPT 导出。

3. `addMedia` 需要可看的封面。
   - PowerPoint 默认媒体封面容易变成灰色播放块。
   - 视频优先使用 `poster` / `previewImageUrl` / `thumbnail`。
   - 没有封面时，视频尝试用 `<video> + canvas` 截 0.1s 首帧。
   - 音频优先用封面图，没有封面时生成静态音频卡 PNG。

4. 封面要转为稳定的 PNG。
   - `pptxgenjs` 的媒体 cover 关系按 PNG 写入。
   - SVG、JPEG 或远程图片应尽量转成 PNG DataURL。
   - 浏览器不支持 canvas 或跨域污染画布时，要回退默认封面或可见占位。

5. 降级也要保留用户上下文。
   - 超限、拉取失败、空文件都要有可见提示。
   - 如果有原始 http(s) 链接，应给占位文本加 hyperlink。
   - 有封面时先铺封面，再叠提示，避免导出页出现空白块。

## 代码层面固化的规则

### 1. 导出选项保持默认安全

`ExportPPTOptions` 中媒体相关选项应保持可选：

```ts
embedMedia?: boolean;
mediaSizeLimitBytes?: number;
```

默认策略：

- `embedMedia !== false` 时尝试嵌入。
- `mediaSizeLimitBytes` 默认 `50 * 1024 * 1024`。
- UI 不额外暴露开关时，也能走默认安全策略。

### 2. 媒体拉取不能带站点凭据

导出媒体和封面时，`fetch` 应使用：

```ts
{
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
}
```

这样能减少跨域资源请求时泄漏 cookie/referrer 的风险。

### 3. DataURL 是最终格式，不是读取策略

`pptxgenjs.addMedia` 需要 base64 DataURL，但读取阶段仍要控制内存：

- 远程媒体用 stream 逐块读。
- 达到上限立即取消 reader。
- 确认大小后再转 DataURL。

一句话：**先限流，再编码。**

### 4. 封面生成不应阻塞导出成功

媒体本体和封面可以并行解析，但封面失败不应让媒体嵌入失败。

推荐策略：

1. 先试已有封面候选。
2. 再试视频首帧或音频静态卡。
3. 全部失败时让 `pptxgenjs` 使用默认 cover。

### 5. 单元素失败局部降级

导出循环里每个元素都应独立 try/catch。媒体失败时：

- 添加可见占位。
- 尽量附原始链接。
- 继续导出后续元素和后续页面。

## 检查清单

- 视频 URL 带 `#video` 时，导出后 PPT 中是可播放视频。
- 合并视频 `#merged-video` 能清理 hash 后获取真实媒体。
- 新音频节点 `type: 'audio' + audioUrl` 能导出为音频媒体。
- legacy 音频图片卡优先导出音频，而不是普通图片。
- 大于 50MB 的媒体不嵌入，但页面有封面/提示/链接。
- 封面优先使用现有 poster 或音频封面，避免灰色播放块。
- 无封面视频尽量截首帧，无封面音频生成静态音频卡。
- 单个媒体失败不影响其他页面导出。

## 验证建议

```bash
pnpm --filter @aitu/drawnix exec vitest run src/services/ppt/__tests__/ppt-export-service.test.ts
pnpm --filter @aitu/drawnix exec vitest run src/services/ppt/__tests__/ppt-frame-layout.test.ts src/services/ppt/__tests__/ppt-prompts.test.ts src/services/ppt/__tests__/ppt-export-service.test.ts
pnpm nx run drawnix:typecheck
git diff --check
```

## 提交备注模板

```text
问题描述:
- PPT 下载导出时，画布视频和音频没有映射到 pptxgenjs.addMedia，下载后的 PPT 缺少可播放媒体。
- 媒体默认 cover 视觉效果差，容易出现灰色播放块。

修复思路:
- 在普通图片分支前识别视频和音频元素，小于上限时嵌入 PPT。
- 媒体拉取使用安全 fetch，并通过流式读取限制单媒体大小。
- 优先使用 poster/previewImageUrl/音频封面，没有封面时生成视频首帧或音频静态封面。
- 超限或失败时导出可见占位，并尽量保留原始链接。

更新代码架构:
- ExportPPTOptions 增加 embedMedia 和 mediaSizeLimitBytes。
- PPT 导出服务新增媒体解析、大小保护、封面解析和局部降级链路。
- 新增 ppt-export-service 单测覆盖视频、音频、legacy 音频卡和超限兜底。
```
