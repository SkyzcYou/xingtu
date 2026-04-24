const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '../dist/apps/web');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const IDLE_MANIFEST = path.join(DIST_DIR, 'idle-prefetch-manifest.json');
const DISALLOWED_PREFIXES = [
  'tool-windows-',
  'external-skills-',
];
const STATIC_IMPORT_RE =
  /(?:import|export)\s*(?:[^"'`]*?\sfrom\s*)?["']\.\/([^"']+)["']/g;

function fail(message) {
  console.error(`[startup-validate] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(INDEX_HTML)) {
  fail('dist/apps/web/index.html 不存在，请先构建 web 应用');
}

const html = fs.readFileSync(INDEX_HTML, 'utf8');
const scriptMatches = Array.from(
  html.matchAll(/<script[^>]+src="\.\/([^"]+)"[^>]*><\/script>/g)
).map((match) => match[1]);
const styleMatches = Array.from(
  html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"]+)"[^>]*>/g)
).map((match) => match[1]);

const directAssets = [...scriptMatches, ...styleMatches].filter((asset) =>
  asset.startsWith('assets/')
);

if (directAssets.length === 0) {
  fail('入口 HTML 没有直接引用任何 assets 资源');
}

const directScriptAssets = scriptMatches.filter((asset) =>
  asset.startsWith('assets/')
);

// 运行时分组样式允许直接注入 HTML，避免首次展示时额外请求 CSS。
// 这里仅阻止分组 JS 重新回流到首屏入口链。
const invalidDirectAssets = directScriptAssets.filter((asset) =>
  DISALLOWED_PREFIXES.some((prefix) => path.basename(asset).startsWith(prefix))
);

if (invalidDirectAssets.length > 0) {
  fail(`重模块重新回流到入口 HTML：${invalidDirectAssets.join(', ')}`);
}

let idleManifest = { groups: {} };
if (fs.existsSync(IDLE_MANIFEST)) {
  idleManifest = JSON.parse(fs.readFileSync(IDLE_MANIFEST, 'utf8'));
}

function collectStaticImports(entryAsset, visited = new Set()) {
  if (visited.has(entryAsset)) {
    return visited;
  }
  visited.add(entryAsset);

  const fullPath = path.join(DIST_DIR, entryAsset);
  if (!fs.existsSync(fullPath) || !entryAsset.endsWith('.js')) {
    return visited;
  }

  const source = fs.readFileSync(fullPath, 'utf8');
  STATIC_IMPORT_RE.lastIndex = 0;
  let match;

  while ((match = STATIC_IMPORT_RE.exec(source))) {
    const imported = path.posix.normalize(
      path.posix.join(path.posix.dirname(entryAsset), match[1])
    );
    if (!visited.has(imported)) {
      collectStaticImports(imported, visited);
    }
  }

  return visited;
}

const entryScripts = scriptMatches.filter(
  (asset) => asset.startsWith('assets/') && asset.endsWith('.js')
);

const entryDependencyGraph = new Set();
entryScripts.forEach((asset) => {
  collectStaticImports(asset, entryDependencyGraph);
});

const invalidStaticDeps = Array.from(entryDependencyGraph).filter(
  (asset) =>
    asset !== undefined &&
    DISALLOWED_PREFIXES.some((prefix) => path.basename(asset).startsWith(prefix))
);

if (invalidStaticDeps.length > 0) {
  fail(`重模块重新回流到入口依赖链：${invalidStaticDeps.join(', ')}`);
}

const sizeReport = directAssets.map((asset) => {
  const fullPath = path.join(DIST_DIR, asset);
  const size = fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0;
  return {
    asset,
    size,
  };
});

console.log(
  JSON.stringify(
    {
      directAssets: sizeReport,
      entryDependencyGraph: Array.from(entryDependencyGraph).sort(),
      idlePrefetchGroups: Object.keys(idleManifest.groups || {}),
    },
    null,
    2
  )
);
