/**
 * PPT 模块统一导出
 */

// 类型导出
export type {
  PPTLayoutType,
  PPTPageSpec,
  PPTOutline,
  PPTStyleSpec,
  PPTPageCountOption,
  PPTGenerateOptions,
  PPTFrameMeta,
  PPTSlideImageHistoryItem,
  LayoutElement,
  FrameRect,
  PPTGenerationParams,
  // 思维导图转 PPT 相关类型
  MindmapNodeInfo,
  MindmapToPPTOptions,
  MindmapToPPTResult,
} from './ppt.types';

// 提示词模块
export {
  generateOutlineSystemPrompt,
  generateOutlineUserPrompt,
  generateSlideImagePrompt,
  createDefaultPPTStyleSpec,
  normalizePPTStyleSpec,
  formatPPTCommonPrompt,
  buildPPTImageGenerationPrompt,
  normalizePPTSlidePrompt,
  validateOutline,
  parseOutlineResponse,
} from './ppt-prompts';

export {
  PPT_EDITOR_OPEN_EVENT,
  PPT_EDITOR_VIEW_MODE_STORAGE_KEY,
  loadPPTEditorViewMode,
  savePPTEditorViewMode,
  requestOpenPPTEditor,
} from './ppt-ui-events';
export type { PPTEditorOpenEventDetail, PPTEditorViewMode } from './ppt-ui-events';

// 布局引擎
export {
  PPT_FRAME_WIDTH,
  PPT_FRAME_HEIGHT,
  PPT_FONT_STYLES,
  createStyledTextElement,
  layoutPageContent,
  convertToAbsoluteCoordinates,
  getImageRegion,
} from './ppt-layout-engine';
export type { FontStyleLevel } from './ppt-layout-engine';

export {
  DEFAULT_PPT_FRAME_LAYOUT_COLUMNS,
  MAX_PPT_FRAME_LAYOUT_COLUMNS,
  MIN_PPT_FRAME_LAYOUT_COLUMNS,
  PPT_FRAME_GRID_GAP,
  PPT_FRAME_LAYOUT_COLUMNS_STORAGE_KEY,
  calcPPTFrameInsertionStartPosition,
  getPPTFrameGridPosition,
  getPPTFrameGridPositions,
  loadPPTFrameLayoutColumns,
  sanitizePPTFrameLayoutColumns,
  savePPTFrameLayoutColumns,
} from './ppt-frame-layout';

// 思维导图转 PPT
export {
  extractTextFromMindData,
  extractMindmapStructure,
  flattenChildrenToBullets,
  convertMindmapToOutline,
  mindmapToOutline,
  generatePPTFromMindmap,
  isPlaitMind,
  findMindRootFromSelection,
} from './mindmap-to-ppt';
