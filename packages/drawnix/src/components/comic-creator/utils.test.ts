import { describe, expect, it } from 'vitest';
import {
  appendComicPageImageVariants,
  buildComicPageImageVariantsFromResult,
  buildComicImagePrompt,
  buildComicScriptPrompt,
  createComicPages,
  formatComicPromptPreview,
  formatComicMarkdown,
  getComicGenerationConcurrency,
  getComicGeneratedImageCount,
  getComicGeneratedPageCount,
  getComicPageImageVariants,
  getComicPagesForGeneration,
  normalizeComicPageTitle,
  normalizeStructuredComicPrompt,
  parseComicScriptResponse,
  parseStructuredComicPrompt,
  sanitizeComicPageCount,
  selectComicPageImageVariant,
  stripLargeImageDataFromComicPage,
} from './utils';
import {
  COMIC_SCENARIO_PRESETS,
  getComicScenarioPrompt,
  getComicScenarioPromptContext,
  isComicScenarioTemplatePrompt,
} from './scenario-presets';

describe('comic-creator utils', () => {
  it('sanitizes page count to 1-60 with default 6', () => {
    expect(sanitizeComicPageCount(undefined)).toBe(6);
    expect(sanitizeComicPageCount('abc')).toBe(6);
    expect(sanitizeComicPageCount(0)).toBe(1);
    expect(sanitizeComicPageCount(61)).toBe(60);
    expect(sanitizeComicPageCount('12.8')).toBe(12);
  });

  it('builds JSON-only comic script prompts with sanitized page count', () => {
    const prompt = buildComicScriptPrompt({
      userPrompt: '小朋友学习节水',
      pageCount: 99,
      stylePrompt: '暖色铅笔画',
    });

    expect(prompt).toContain('60 页');
    expect(prompt).toContain('多页图文内容策划');
    expect(prompt).not.toContain('连环画脚本策划');
    expect(prompt).toContain('只返回合法 JSON');
    expect(prompt).toContain('commonPrompt');
    expect(prompt).toContain('暖色铅笔画');
    expect(prompt).toContain('如果用户用中文提出需求');
    expect(prompt).toContain('不要把图片提示词改写成英文');
    expect(prompt).toContain('pages[].prompt 是生成页唯一主要编辑入口');
    expect(prompt).toContain('不要以「整套连环画统一设定」');
    expect(prompt).toContain('本页独立的画面主体');
  });

  it('provides complete scenario presets with valid JSON templates', () => {
    expect(COMIC_SCENARIO_PRESETS.length).toBeGreaterThanOrEqual(50);
    for (const preset of COMIC_SCENARIO_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.textPrompt).toContain(preset.label);
      expect(normalizeStructuredComicPrompt(preset.jsonPrompt)).toContain(
        '"pages"'
      );
    }
  });

  it('detects scenario templates and injects scenario context into script prompts', () => {
    const textPrompt = getComicScenarioPrompt('travel-brochure', 'text');
    const jsonPrompt = getComicScenarioPrompt('travel-brochure', 'json');
    const scenarioContext = getComicScenarioPromptContext('travel-brochure');
    const prompt = buildComicScriptPrompt({
      userPrompt: textPrompt,
      pageCount: 6,
      scenarioContext,
    });

    expect(isComicScenarioTemplatePrompt(textPrompt)).toBe(true);
    expect(isComicScenarioTemplatePrompt(jsonPrompt)).toBe(true);
    expect(isComicScenarioTemplatePrompt(`${textPrompt} 自定义`)).toBe(false);
    expect(prompt).toContain('创作场景：商业宣传 / 城市文旅宣传');
    expect(prompt).toContain('目标读者：旅行者与高定游客户');
    expect(prompt).toContain('页面引导：第 1 页：目的地印象');
    expect(prompt).toContain('每页必须有独立的场景引导');
    expect(prompt).toContain('pages 必须严格为 6 页');
  });

  it('builds script prompts with structured JSON output instructions', () => {
    const prompt = buildComicScriptPrompt({
      userPrompt: '潮汕旅行，参考上传 PDF 的品牌资料',
      pageCount: 6,
      inputMode: 'json',
      pdfAttachmentName: '品牌资料.pdf',
    });

    expect(prompt).toContain('用户创作需求');
    expect(prompt).toContain('潮汕旅行');
    expect(prompt).toContain('参考 PDF：本次请求附带 PDF「品牌资料.pdf」');
    expect(prompt).toContain('PDF 是主要素材来源');
    expect(prompt).toContain('提示词类型：结构化 JSON 提示词');
    expect(prompt).toContain('layout.header');
    expect(prompt).toContain('content_blocks');
    expect(prompt).toContain('style.background');
    expect(prompt).toContain('style.colors');
    expect(prompt).toContain('style.fonts');
    expect(prompt).toContain('pages[].prompt');
    expect(prompt).toContain('字符串取值必须遵守语言要求');
  });

  it('validates and normalizes structured JSON prompt input', () => {
    expect(
      normalizeStructuredComicPrompt('{"title":"潮汕旅行","pages":[]}')
    ).toContain('\n  "title": "潮汕旅行"');
    expect(() => parseStructuredComicPrompt('[]')).toThrow('须为对象');
    expect(() => parseStructuredComicPrompt('{bad')).toThrow();
  });

  it('parses fenced JSON and pads pages to expected count', () => {
    const payload = parseComicScriptResponse(
      `说明
\`\`\`json
{
  "title": "水滴旅行",
  "commonPrompt": "统一角色",
  "pages": [
    {"title": "出发", "script": "水滴醒来", "prompt": "清晨水滴"},
    {"title": "云上", "script": "飞到云里", "prompt": "云层"}
  ]
}
\`\`\``,
      3
    );

    expect(payload.title).toBe('水滴旅行');
    expect(payload.commonPrompt).toBe('统一角色');
    expect(payload.pages).toHaveLength(3);
    expect(payload.pages[2].title).toBe('第 3 页（待补全）');
  });

  it('parses comic script JSON after model thinking text', () => {
    const payload = parseComicScriptResponse(
      `<think>{"pages":"draft"}</think>
最终：
{
  "title": "原创科普漫画",
  "commonPrompt": "明亮配色",
  "pages": [
    {"title": "第1页：开场", "script": "介绍主题", "prompt": "主角出现"}
  ]
}`,
      1
    );

    expect(payload.title).toBe('原创科普漫画');
    expect(payload.pages[0].title).toBe('开场');
  });

  it('keeps structured prompt objects returned by the model', () => {
    const payload = parseComicScriptResponse(
      JSON.stringify({
        title: '水滴鱼简介',
        commonPrompt: {
          style: '高端品牌画册',
          colors: ['orange', 'white'],
        },
        pages: [
          {
            title: '核心价值',
            script: '介绍品牌价值',
            prompt: {
              subject: '品牌核心价值页',
              composition: '大标题与产品场景',
            },
          },
        ],
      }),
      1
    );

    expect(payload.commonPrompt).toContain('"style": "高端品牌画册"');
    expect(payload.pages[0].prompt).toContain('"subject": "品牌核心价值页"');
  });

  it('formats JSON prompt previews without changing plain text', () => {
    expect(formatComicPromptPreview('{"layout":{"title":"企业定位"}}')).toEqual(
      {
        text: '{\n  "layout": {\n    "title": "企业定位"\n  }\n}',
        isJson: true,
      }
    );
    expect(formatComicPromptPreview('企业定位：大模型 API 平台')).toEqual({
      text: '企业定位：大模型 API 平台',
      isJson: false,
    });
  });

  it('pads short model responses and normalizes duplicate page title prefixes', () => {
    const payload = parseComicScriptResponse(
      JSON.stringify({
        title: '潮起岭南',
        commonPrompt: '统一旅行画风',
        pages: [
          { title: '第1页：第1页：汕头启程', script: 'a', prompt: 'a' },
          { title: '第 2 页：老城慢行', script: 'b', prompt: 'b' },
          { title: '第3页-潮州灯火', script: 'c', prompt: 'c' },
          { title: '第4页：南澳跨海', script: 'd', prompt: 'd' },
        ],
      }),
      6
    );

    expect(payload.pages).toHaveLength(6);
    expect(payload.pages[0].title).toBe('汕头启程');
    expect(payload.pages[1].title).toBe('老城慢行');
    expect(payload.pages[2].title).toBe('潮州灯火');
    expect(payload.pages[4].title).toBe('第 5 页（待补全）');
    expect(normalizeComicPageTitle('第6页：第6页：收束', 6)).toBe('收束');
  });

  it('creates stable page ids and markdown script', () => {
    const pages = createComicPages({
      title: '水滴旅行',
      commonPrompt: '统一角色',
      pages: [{ title: '出发', script: '水滴醒来', prompt: '清晨水滴' }],
    });
    const markdown = formatComicMarkdown({
      title: '水滴旅行',
      commonPrompt: '统一角色',
      pages,
    });

    expect(pages[0].id).toBe('page-01');
    expect(markdown).toContain('# 水滴旅行');
    expect(markdown).toContain('### 第 1 页：出发');
    expect(markdown).toContain('#### 图像提示词');
  });

  it('uses scenario baseline without the old global comic setting label', () => {
    const prompt = buildComicImagePrompt({
      commonPrompt: '统一水滴角色，暖色铅笔画',
      pagePrompt: '清晨，水滴站在窗边',
      script: '旁白：节水旅行开始了',
      title: '出发',
      pageNumber: 1,
      pageCount: 6,
      size: '16x9',
    });

    expect(prompt).not.toContain('【整套连环画统一设定】');
    expect(prompt).toContain('【创作场景基准】');
    expect(prompt).toContain('统一水滴角色');
    expect(prompt).toContain('【当前页场景】第 1/6 页：出发');
    expect(prompt).toContain('清晨，水滴站在窗边');
    expect(prompt).toContain('画幅 16x9');
  });

  it('plans serial and parallel generation with bounded concurrency', () => {
    const pages = createComicPages({
      title: '水滴旅行',
      commonPrompt: '',
      pages: [
        { title: '3', script: '', prompt: '' },
        { title: '1', script: '', prompt: '' },
        { title: '2', script: '', prompt: '' },
      ],
    });
    const selected = new Set(['page-03', 'page-01']);

    expect(
      getComicPagesForGeneration({ pages, selectedPageIds: selected }).map(
        (page) => page.pageNumber
      )
    ).toEqual([1, 3]);
    expect(
      getComicPagesForGeneration({ pages, singlePageId: 'page-02' })
    ).toHaveLength(1);
    expect(getComicGenerationConcurrency('serial', 12)).toBe(1);
    expect(getComicGenerationConcurrency('parallel', 12)).toBe(12);
    expect(getComicGenerationConcurrency('parallel', 0)).toBe(0);
  });

  it('strips data urls from record pages', () => {
    const page = {
      id: 'page-01',
      pageNumber: 1,
      title: '图',
      script: '',
      prompt: '',
      imageUrl: 'data:image/png;base64,abc',
      imageVariants: [
        {
          id: 'data',
          url: 'data:image/png;base64,abc',
        },
        {
          id: 'cdn',
          url: 'https://cdn.example.com/page.png',
        },
      ],
    };

    expect(stripLargeImageDataFromComicPage(page).imageUrl).toBeUndefined();
    expect(stripLargeImageDataFromComicPage(page).imageVariants).toEqual([
      {
        id: 'cdn',
        url: 'https://cdn.example.com/page.png',
      },
    ]);
  });

  it('appends and selects comic page image variants', () => {
    const page = {
      id: 'page-01',
      pageNumber: 1,
      title: '图',
      script: '',
      prompt: '',
      imageUrl: 'https://cdn.example.com/old.png',
      imageMimeType: 'image/png',
      imageGeneratedAt: 1,
    };
    const variants = buildComicPageImageVariantsFromResult({
      taskId: 'task-2',
      urls: [
        'https://cdn.example.com/new-1.png',
        'https://cdn.example.com/new-2.png',
      ],
      format: 'png',
      generatedAt: 2,
    });
    const updated = appendComicPageImageVariants(page, variants);

    expect(getComicPageImageVariants(updated).map((item) => item.url)).toEqual([
      'https://cdn.example.com/old.png',
      'https://cdn.example.com/new-1.png',
      'https://cdn.example.com/new-2.png',
    ]);
    expect(updated.imageUrl).toBe('https://cdn.example.com/new-2.png');
    expect(updated.imageMimeType).toBe('image/png');

    const selected = selectComicPageImageVariant(updated, 'task-2');
    expect(selected.imageUrl).toBe('https://cdn.example.com/new-1.png');
  });

  it('counts generated pages separately from generated images', () => {
    const pages = createComicPages({
      title: '水滴旅行',
      commonPrompt: '',
      pages: [
        { title: '1', script: '', prompt: '' },
        { title: '2', script: '', prompt: '' },
        { title: '3', script: '', prompt: '' },
      ],
    });
    const record = {
      pages: [
        appendComicPageImageVariants(pages[0]!, [
          { url: 'https://cdn.example.com/page-1-a.png' },
          { url: 'https://cdn.example.com/page-1-b.png' },
        ]),
        appendComicPageImageVariants(pages[1]!, [
          { url: 'https://cdn.example.com/page-2-a.png' },
        ]),
        pages[2]!,
      ],
    };

    expect(getComicGeneratedPageCount(record)).toBe(2);
    expect(getComicGeneratedImageCount(record)).toBe(3);
  });
});
