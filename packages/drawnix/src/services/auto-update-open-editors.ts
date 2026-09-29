/** Conservative until each editor has its own proven persistence participant. */
export interface OpenEditorState {
  standaloneDialog?: boolean;
  backupRestore?: boolean;
  cloudSync?: boolean;
  mediaLibrary?: boolean;
  profilePanel?: boolean;
  inlineText?: boolean;
  mediaPreview?: boolean;
  linkEditor?: boolean;
}

export function getOpenEditorBlockReason(state: OpenEditorState): string | null {
  if (state.standaloneDialog) return '请先完成并关闭生成或绘图编辑窗口';
  if (state.inlineText || state.linkEditor) return '画布文字或链接尚在编辑中';
  if (state.mediaPreview) return '请先完成并关闭媒体编辑预览';
  if (state.backupRestore) return '备份恢复窗口仍在使用中';
  if (state.cloudSync) return '请先完成并关闭同步设置';
  if (state.mediaLibrary) return '请先完成并关闭素材管理';
  if (state.profilePanel) return '请先完成并关闭账户设置';
  return null;
}
