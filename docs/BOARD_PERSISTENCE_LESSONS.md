# 画布持久化经验

## 问题现象

用户连续编辑 2 天后关闭页面，再次打开发现：

- 素材库数据还在
- 当前画布内容丢失
- 说明问题不在素材缓存，而在画布 `board` 持久化链路

## 根因

之前的实现主要依赖异步 IndexedDB 保存：

- 画布变更时调用 `workspaceService.saveCurrentBoard()`
- 页面关闭前只尝试再次触发一次异步保存
- `beforeunload` / `visibilitychange` 阶段，浏览器可能直接回收页面，IndexedDB Promise 不一定有机会完成

这会导致一种典型故障：

- React 内存里的最新画布是对的
- IndexedDB 里落盘的是旧版本
- 重新打开时只从 IndexedDB 恢复，于是看起来像“画布丢了”

## 修复策略

采用“双写兜底”：

- 正常编辑过程仍走 IndexedDB，保持主存储不变
- 页面 `beforeunload` / `pagehide` / `visibilitychange(hidden)` 时，同步把当前画布快照写入 `localStorage`
- 启动时比较 `localStorage` 快照和 IndexedDB 中当前画布的 `updatedAt`
- 如果关闭前快照更新，优先恢复快照，并异步回灌到 IndexedDB

## 设计原则

- 不新增独立存储服务，优先在现有 `App` 启动/保存主链路补洞
- 关闭场景必须有同步级兜底，不能只靠异步 Promise
- 恢复必须带时间戳比较，避免旧快照反向覆盖新数据
- 快照只兜底当前画布，避免扩大 `localStorage` 占用

## 后续建议

- 若后面要进一步增强抗崩溃能力，可增加“低频节流快照”，而不是每次变更都同步写 `localStorage`
- 若画布体积继续变大，需要评估快照大小上限和压缩方案
- 所有“关闭前保存”逻辑都应优先读取最新内存态，而不是重新从缓存对象拼装旧数据
