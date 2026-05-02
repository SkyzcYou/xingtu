# Change: Add image 3D rotation control

## Why
画布当前只提供二维旋转控件，用户无法给图片做可控的透视倾斜效果。新增图片级 3D 旋转可以满足常见海报、拼贴和排版场景，同时不改变现有几何模型。

## What Changes
- 为普通画布图片增加可持久化的 `transform3d` 视觉变换字段。
- 在单选普通图片时，在 popup-toolbar 上显示 3D 调节按钮。
- 点击 3D 按钮打开调节面板，通过 `rotateX`、`rotateY` 和 `perspective` 控件实时预览，确认后作为一次可撤销历史提交，取消时回滚。
- 选中带旋转/3D 变换的图片用于 AI 生成时，参考图保持原图，旋转参数作为文本上下文随提示词传递。
- PPT 等导出路径继续按原始矩形图片降级，不在本次实现透视导出。

## Impact
- Affected specs: `canvas-image-transform`
- Affected code: image rendering component, popup-toolbar image 3D panel, AI selection context extraction, targeted tests.
