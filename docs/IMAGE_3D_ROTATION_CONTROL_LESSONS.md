# 图片 3D 旋转控件经验总结

更新日期：2026-05-01

## 背景

图片 3D 旋转最初按“画布选中态旁边增加拖拽 icon”实现：横向拖动控制 `rotateY`，纵向拖动控制 `rotateX`。

实际验证中暴露了几个问题：

1. 拖拽越过接近侧面的角度后，图片容易消失或表现不稳定。
2. CSS 3D 作用在 `foreignObject` 内部时，浏览器裁剪、背面显示和 Plait SVG 结构会互相影响。
3. 高频拖拽会让 AI 输入框预览刷新时机不可控。
4. 用户需要可控地调整两个轴和透视距离，而不是只靠拖拽手感猜角度。

最终方案改为：在 popup-toolbar 上放 3D 按钮，点击打开调节面板，面板内控制 `rotateX`、`rotateY` 和 `perspective`，确认后关闭并同步 AI 输入框上下文。

## 设计原则

1. 不改变图片几何模型。
   - `points`、resize、命中区域和二维 `angle` 保持原样。
   - 3D 旋转只保存在图片元素的可选 `transform3d` 字段里。

2. 只支持普通图片。
   - 视频、音频封面、PPT 占位图等 image-like 元素不要显示 3D 控件。
   - 用统一的 `isOrdinary3DTransformImage` 收口判断，避免各处复制条件。

3. 面板交互比拖拽更适合首版。
   - `rotateX`、`rotateY`、`perspective` 都能精确调整。
   - 中间预览用 `PlaitHistoryBoard.withoutSaving`。
   - 点击确定时回到打开前状态，再用 `withNewBatch` 提交一次历史。
   - 取消或 dismiss 时恢复打开前状态。

4. 角度允许穿过侧面。
   - 数据角度允许 `-180..180`。
   - 渲染层处理背面翻转，不能把交互 clamp 到 `-75..75`，否则无法转到另一侧。

## 渲染经验

不要优先用 `foreignObject + CSS transform: perspective(...) rotateX(...) rotateY(...)`。

风险：

- `foreignObject` 自身容易裁剪透视后的内容。
- 接近或穿过 `90deg` 时，背面和纹理翻转表现不稳定。
- 原图片 DOM 如果被隐藏或加载失败，导出/截图 fallback 容易得到白屏。

更稳的做法：

- 保留原图片元素作为数据和加载兜底。
- 3D 视觉层用 SVG overlay 渲染。
- 根据图片矩形和 `transform3d` 计算四个投影点。
- 用 `clipPath polygon` 限定投影视觉区域。
- 当角度超过 `90deg` 时，对 overlay image 做 `scaleX(-1)` 或 `scaleY(-1)`，模拟翻面后的纹理方向。

注意清理：

- overlay 必须在 React effect cleanup 中 remove。
- 临时改过的 `foreignObject` overflow、visibility、pointer-events 要引用计数恢复。
- 调试日志必须有开关，避免普通用户控制台被刷屏。

## AI 上下文经验

AI 参考图应该保持源图 URL/源图数据，不要把画布旋转或 3D 透视烘焙进参考图像素。

原因是生成模型通常把参考图当作内容、风格、主体依据；如果先把透视效果烘焙到参考图，模型会把已经变形的像素当成真实主体，后续生成容易继续变形。

更稳的链路：

1. 选区中发现普通图片带 `transform3d`。
2. AI 输入框预览图和发送给 AI 的参考图都保持原图。
3. 不要把 `rotateX`、`rotateY`、`perspective` 原样写给模型，要翻译成自然语言的机位、站位和重心迁移。
4. 即使带旋转参数的普通图片与图形重叠，也不要把它并入图形合成图；图片走原图引用，图形仍可单独合成。
5. 面板点击确定后主动发出选区内容刷新事件，让 AI 输入框上下文立即同步。

不要把二维 `angle` 写进 AI 生成提示词。二维旋转只表示画布上的摆放状态，不等于真实场景里的相机机位。实践中，“构图主轴顺时针/逆时针”这类描述会强烈诱导模型把参考图当成一张纸片、海报或照片框来倾斜摆放，生成结果会变成白底上的斜矩形图，而不是主体重绘。

也不要额外生成“构图控制图”或“3D 投影参考图”发给模型。模型很容易把这类参考图当作最终构图目标，继续生成画框、白边、投影四边形或贴图效果。这个问题不是参考图清晰度问题，而是语义入口错了。

更有效的提示结构：

1. 先声明这是“3D 场景重建 + 新机位重绘”，不是图片平面变形。
2. 明确输出必须是满幅矩形自然成片，画面边缘就是场景边缘。
3. 将 `rotateY` 翻译成左右机位和左右站位迁移。
4. 将 `rotateX` 翻译成高低机位和上下站位迁移。
5. 将 `perspective` 翻译成强/中/弱透视，不暴露技术参数。
6. 明确失败条件：白底上摆一张倾斜矩形图片、四边形投影图、海报/屏幕/卡片式结果都无效。

参数到语义的映射经验：

- `rotateY < 0`：相机从主体右侧观察；视觉重心从参考图偏左迁移到画面右侧或右前方。
- `rotateY > 0`：相机从主体左侧观察；视觉重心从参考图偏右迁移到画面左侧或左前方。
- `abs(rotateY) > 90`：进入侧后方语义，要强调脸部可见范围、背侧轮廓和前后遮挡重排。
- `rotateX > 0`：低机位仰视；视觉重心从参考图偏上迁移到画面下侧或下前方。
- `rotateX < 0`：高机位俯视；视觉重心从参考图偏下迁移到画面上侧或上前方。
- 两个轴同时存在时，合成一句总趋势，例如“视觉重心从左上向右下迁移”。这类大方向比单独说相机方位更容易被生成模型执行。

性能边界：

- 不在 slider 拖动过程中改写 AI 参考图。
- 只在确认后刷新 AI 上下文，避免高频文本和选区状态更新。
- 不为 AI 参考图额外生成 canvas/base64，避免白屏 fallback 和大内存开销。

## 数据与撤销经验

`transform3d` 结构保持很小：

```ts
type Image3DTransform = {
  rotateX: number;
  rotateY: number;
  perspective: number;
};
```

规则：

- `rotateX`、`rotateY` 归零时移除字段。
- 输入值统一 sanitize，避免 NaN、Infinity 和越界值落入画布数据。
- 面板中间预览不进入历史。
- 确认只产生一次 undo 记录。
- 取消和切换选区要恢复打开面板前的 transform。

## 验证清单

- 单选普通图片显示 popup-toolbar 3D 按钮。
- 多选、视频、音频封面、PPT 占位图不显示。
- 调整左右倾斜、上下倾斜、透视距离时画布实时变化。
- 角度穿过 `90deg` 后图片仍可见，纹理方向正确。
- 取消或点击外部关闭时恢复原状态。
- 确定后 Undo 一次回到打开面板前状态。
- AI 输入框预览图保持原图。
- AI 文本上下文不包含二维 `angle`，不包含裸露的 `rotateX/rotateY/perspective` 参数。
- AI 文本上下文包含 3D 机位、左右/上下构图迁移方向和失败条件。
- 带旋转参数的普通图片与图形重叠时，参考图仍保持原图，图形合成图不重复烘焙该图片。
- 发送给 AI 的参考图保持原图，不传 3D 烘焙图或白图。

## 建议验证命令

```bash
pnpm exec vitest run packages/drawnix/src/utils/__tests__/image-3d-transform.test.ts
pnpm nx typecheck drawnix
openspec validate add-image-3d-rotation-control --strict
```

## 提交备注模板

```text
问题描述:
- 图片只有二维旋转，拖拽式 3D 控件在穿过侧面角度时存在消失风险；把旋转效果烘焙进 AI 参考图会导致生成继续变形。

修复思路:
- 将 3D 控件迁移到 popup-toolbar 面板，提供 rotateX/rotateY/perspective 精确调节。
- 使用 SVG overlay 和共享投影几何渲染 3D 图片。
- AI 参考图保持原图，二维旋转和 3D 参数作为文本上下文传给模型。
- 确认后主动刷新 AI 输入框上下文。

更新代码架构:
- 新增图片 3D transform 工具、popup-toolbar 面板和 AI 选区刷新事件。
- 图片渲染组件负责 3D overlay 生命周期。
- OpenSpec change 记录能力边界、交互、AI 上下文和导出降级策略。
```
