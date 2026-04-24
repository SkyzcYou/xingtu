import {
  buildPromptOptimizationRequest,
  normalizeOptimizedPromptResult,
} from './ai-generation-utils';

describe('buildPromptOptimizationRequest', () => {
  it('builds zh image optimization instructions with original prompt and requirements', () => {
    const content = buildPromptOptimizationRequest({
      originalPrompt: '一只猫坐在窗台上',
      optimizationRequirements: '增加电影感和逆光氛围',
      language: 'zh',
      type: 'image',
    });

    expect(content).toContain('你是一名专业的图片生成提示词优化助手');
    expect(content).toContain('【原始提示词】\n一只猫坐在窗台上');
    expect(content).toContain('【优化要求】\n增加电影感和逆光氛围');
    expect(content).toContain('主体、构图、风格、光线');
  });

  it('falls back to light polishing when requirements are empty', () => {
    const content = buildPromptOptimizationRequest({
      originalPrompt: 'A castle at dusk',
      optimizationRequirements: '   ',
      language: 'en',
      type: 'video',
    });

    expect(content).toContain('professional video generation prompt optimizer');
    expect(content).toContain('[Original Prompt]\nA castle at dusk');
    expect(content).toContain(
      '[Refinement Requirements]\nNone. Apply light polishing for clarity and execution quality.'
    );
    expect(content).toContain('camera movement');
  });

  it('builds zh structured optimization instructions for complex scenes', () => {
    const content = buildPromptOptimizationRequest({
      originalPrompt: '做一个人类演化时间轴信息图，包含石阶、里程碑和左右标签',
      optimizationRequirements: '输出 JSON，保留区域和数量',
      language: 'zh',
      type: 'image',
      mode: 'structured',
    });

    expect(content).toContain('结构化提示词设计师');
    expect(content).toContain('只输出一个合法 JSON 对象');
    expect(content).toContain('顶层优先包含这些键：type、instruction、style、layout');
    expect(content).toContain('【补充要求】\n输出 JSON，保留区域和数量');
  });

  it('builds en structured optimization instructions with semantic json fields', () => {
    const content = buildPromptOptimizationRequest({
      originalPrompt: 'Create an evolution timeline infographic with stone steps and milestone legends',
      language: 'en',
      type: 'image',
      mode: 'structured',
    });

    expect(content).toContain('prompt architect for structured prompts');
    expect(content).toContain('Output exactly one valid JSON object');
    expect(content).toContain('Prefer these top-level keys: type, instruction, style, layout');
    expect(content).toContain('centerpiece, focal_point, sections, annotations, timeline, or legends');
  });
});

describe('normalizeOptimizedPromptResult', () => {
  it('unwraps fenced code blocks', () => {
    expect(
      normalizeOptimizedPromptResult('```text\n优化后的提示词\n```')
    ).toBe('优化后的提示词');
  });

  it('returns trimmed plain text', () => {
    expect(normalizeOptimizedPromptResult('  refined prompt  ')).toBe(
      'refined prompt'
    );
  });
});
