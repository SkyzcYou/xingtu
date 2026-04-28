import type { ToolPluginModule } from '../../types';
import { ToolCategory } from '../../../types/toolbox.types';

export const bananaPromptTool: ToolPluginModule = {
  manifest: {
    id: 'banana-prompt',
    name: '香蕉提示词',
    description: '查看和复制优质 AI 提示词',
    icon: '🍌',
    category: ToolCategory.CONTENT_TOOLS,
    url: 'https://www.aiwind.org',
    defaultWidth: 800,
    defaultHeight: 600,
    permissions: [
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-forms',
      'allow-top-navigation-by-user-activation',
    ],
  },
};
