import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const sourceRoots = [
  path.resolve(projectRoot, 'src/components'),
  path.resolve(projectRoot, 'src/tools'),
].filter((dir) => fs.existsSync(dir));

const allowedNativeTitleFiles = new Set([
  path.join('src', 'components', 'MarkdownReadonly', 'index.tsx'),
]);

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, files);
      continue;
    }

    if (/\.(ts|tsx|scss|css)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function getJsxOpeningTags(code) {
  const tags = [];

  for (let index = 0; index < code.length; index += 1) {
    if (code[index] !== '<' || !/[A-Za-z]/.test(code[index + 1] || '')) {
      continue;
    }

    let cursor = index + 1;
    while (/[\w.$-]/.test(code[cursor] || '')) {
      cursor += 1;
    }

    const tagName = code.slice(index + 1, cursor);
    let depth = 0;
    let quote = null;
    let end = cursor;

    for (; end < code.length; end += 1) {
      const char = code[end];
      const prev = code[end - 1];

      if (quote) {
        if (char === quote && prev !== '\\') {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char === '}') {
        depth = Math.max(0, depth - 1);
        continue;
      }

      if (char === '>' && depth === 0) {
        break;
      }
    }

    if (end < code.length) {
      tags.push({
        name: tagName,
        text: code.slice(index, end + 1),
      });
      index = end;
    }
  }

  return tags;
}

function hasJsxAttribute(tagText, attrName) {
  return new RegExp(`(?:^|[\\s{])${attrName}\\s*=`, 'm').test(tagText);
}

const violations = [];

for (const rootDir of sourceRoots) {
  for (const filePath of collectFiles(rootDir)) {
    if (/\.(test|spec)\.tsx?$/.test(filePath)) {
      continue;
    }

    if (filePath.endsWith(path.join('shared', 'hover', 'HoverTip.tsx'))) {
      continue;
    }

    const relativePath = path.relative(projectRoot, filePath);
    const code = fs.readFileSync(filePath, 'utf8');
    const isStyleFile = /\.(scss|css)$/.test(filePath);

    if (isStyleFile) {
      const usesDataTooltip =
        /\[data-tooltip\]/.test(code) ||
        /attr\(\s*data-tooltip\s*\)/.test(code);
      const usesLocalHoverTip =
        /:hover\s+[^,{]*\.(?:[\w-]*tooltip[\w-]*|[\w-]*tip[\w-]*)\b/.test(
          code
        );

      if (usesDataTooltip || usesLocalHoverTip) {
        violations.push(
          `${relativePath}: CSS 不应实现局部 hover tips，请改用共享 HoverTip 或 HoverCard。`
        );
      }

      continue;
    }

    const importsTooltip =
      /from\s+['"]tdesign-react['"]/.test(code) &&
      /import\s*{[^}]*\bTooltip\b[^}]*}\s*from\s*['"]tdesign-react['"]/.test(
        code
      );

    if (importsTooltip) {
      violations.push(
        `${relativePath}: 请改用共享 HoverTip，而不是直接从 tdesign-react 引入 Tooltip。`
      );
    }

    const allowsNativeTitle = allowedNativeTitleFiles.has(relativePath);
    const jsxOpeningTags = getJsxOpeningTags(code);
    const nativeTitleMatches = allowsNativeTitle
      ? []
      : jsxOpeningTags.filter(
          (tag) =>
            /^(button|div|span|a|img|input|textarea|svg|path|circle|rect|p|label|li|td|th|section|article|h[1-6])$/.test(
              tag.name
            ) && hasJsxAttribute(tag.text, 'title')
        );
    if (nativeTitleMatches.length) {
      violations.push(
        `${relativePath}: 应用 UI 不应直接使用原生 title hover，请改用共享 HoverTip 包裹；Markdown/用户内容语义 title 需加入明确例外。`
      );
    }

    const nativeTooltipMatches = jsxOpeningTags.filter(
      (tag) =>
        /^(button|div|span|a)$/.test(tag.name) &&
        (hasJsxAttribute(tag.text, 'data-tooltip') ||
          hasJsxAttribute(tag.text, 'tooltip'))
    );
    if (nativeTooltipMatches.length) {
      violations.push(
        `${relativePath}: 原生 DOM 节点不应直接使用 tooltip 属性，请改为使用共享 HoverTip 包裹。`
      );
    }

    const toolButtonTitleMatches = jsxOpeningTags.filter(
      (tag) => tag.name === 'ToolButton' && hasJsxAttribute(tag.text, 'title')
    );
    if (toolButtonTitleMatches.length) {
      violations.push(
        `${relativePath}: ToolButton 的 hover 文案请改用 tooltip 属性，避免继续扩散原生 title 语义。`
      );
    }
  }
}

if (violations.length > 0) {
  console.error('检测到不允许的 hover 用法:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}
