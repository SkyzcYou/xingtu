import type { ToolPluginModule } from '../../types';
import { ToolCategory } from '../../../types/toolbox.types';

export const poseLibraryTool: ToolPluginModule = {
  manifest: {
    id: 'pose-library',
    name: '动作场景库',
    description: '专业人体姿态参考素材库，提供多角度动作姿势',
    icon: '🧘',
    category: ToolCategory.CONTENT_TOOLS,
    url: 'https://www.posemaniacs.com/zh-Hans/poses',
    defaultWidth: 900,
    defaultHeight: 700,
    permissions: [
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-forms',
      'allow-top-navigation-by-user-activation',
    ],
  },
};
