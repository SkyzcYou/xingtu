#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = process.cwd();
const includeTypes = process.argv.includes('--include-types');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '__snapshots__',
  '.nx',
  '.vite',
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getScanRoots() {
  const roots = [path.join(root, 'apps/web/src')];
  const packagesDir = path.join(root, 'packages');
  if (fs.existsSync(packagesDir)) {
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const srcDir = path.join(packagesDir, entry.name, 'src');
      if (fs.existsSync(srcDir)) {
        roots.push(srcDir);
      }
    }
  }
  return roots;
}

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
      continue;
    }
    if (
      SOURCE_EXTENSIONS.includes(path.extname(entry.name)) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(path.normalize(filePath));
    }
  }
}

function createPathAliases() {
  const tsconfigPath = path.join(root, 'tsconfig.base.json');
  if (!fs.existsSync(tsconfigPath)) return [];
  const paths = readJson(tsconfigPath).compilerOptions?.paths || {};

  return Object.entries(paths).flatMap(([alias, targets]) => {
    return targets.map((target) => {
      const wildcardIndex = alias.indexOf('*');
      return {
        alias,
        target,
        hasWildcard: wildcardIndex >= 0,
        prefix: wildcardIndex >= 0 ? alias.slice(0, wildcardIndex) : alias,
        suffix: wildcardIndex >= 0 ? alias.slice(wildcardIndex + 1) : '',
        targetPrefix:
          target.indexOf('*') >= 0 ? target.slice(0, target.indexOf('*')) : target,
        targetSuffix:
          target.indexOf('*') >= 0 ? target.slice(target.indexOf('*') + 1) : '',
      };
    });
  });
}

function createResolver(fileSet) {
  const aliases = createPathAliases();

  function tryFile(basePath) {
    const candidates = [];
    if (path.extname(basePath)) candidates.push(basePath);
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(basePath + extension);
    }
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(path.join(basePath, `index${extension}`));
    }

    for (const candidate of candidates) {
      const normalized = path.normalize(candidate);
      if (fileSet.has(normalized)) return normalized;
    }
    return null;
  }

  function resolveAlias(specifier) {
    for (const alias of aliases) {
      if (!alias.hasWildcard && specifier === alias.alias) {
        const resolved = tryFile(path.join(root, alias.target));
        if (resolved) return resolved;
      }

      if (
        alias.hasWildcard &&
        specifier.startsWith(alias.prefix) &&
        specifier.endsWith(alias.suffix)
      ) {
        const matched = specifier.slice(
          alias.prefix.length,
          specifier.length - alias.suffix.length
        );
        const resolved = tryFile(
          path.join(root, `${alias.targetPrefix}${matched}${alias.targetSuffix}`)
        );
        if (resolved) return resolved;
      }
    }

    return null;
  }

  return function resolveSpecifier(specifier, importer) {
    if (specifier.startsWith('.')) {
      return tryFile(path.resolve(path.dirname(importer), specifier));
    }
    return resolveAlias(specifier);
  };
}

function isNamedBindingsTypeOnly(namedBindings) {
  if (!namedBindings || !ts.isNamedImports(namedBindings)) {
    return false;
  }
  return namedBindings.elements.every((item) => item.isTypeOnly);
}

function isImportTypeOnly(node) {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name || !clause.namedBindings) return false;
  return isNamedBindingsTypeOnly(clause.namedBindings);
}

function isExportTypeOnly(node) {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  if (!clause || !ts.isNamedExports(clause)) return false;
  return clause.elements.length > 0 && clause.elements.every((item) => item.isTypeOnly);
}

function collectStaticImports(filePath, resolveSpecifier) {
  const source = fs.readFileSync(filePath, 'utf8');
  const extension = path.extname(filePath);
  const scriptKind =
    extension === '.tsx'
      ? ts.ScriptKind.TSX
      : extension === '.jsx'
      ? ts.ScriptKind.JSX
      : extension === '.js' || extension === '.mjs' || extension === '.cjs'
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const imports = [];

  function add(specifier, kind) {
    const resolved = resolveSpecifier(specifier, filePath);
    if (resolved) imports.push({ specifier, file: resolved, kind });
  }

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const isTypeOnly = isImportTypeOnly(node);
      if (includeTypes || !isTypeOnly) {
        add(
          node.moduleSpecifier.text,
          isTypeOnly ? 'type-static' : 'runtime-static'
        );
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const isTypeOnly = isExportTypeOnly(node);
      if (includeTypes || !isTypeOnly) {
        add(
          node.moduleSpecifier.text,
          isTypeOnly ? 'type-static' : 'runtime-static'
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function findStronglyConnectedComponents(graph) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indexes = new Map();
  const lowlinks = new Map();
  const components = [];

  function visit(node) {
    indexes.set(node, index);
    lowlinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) || []) {
      if (!graph.has(next)) continue;
      if (!indexes.has(next)) {
        visit(next);
        lowlinks.set(node, Math.min(lowlinks.get(node), lowlinks.get(next)));
      } else if (onStack.has(next)) {
        lowlinks.set(node, Math.min(lowlinks.get(node), indexes.get(next)));
      }
    }

    if (lowlinks.get(node) === indexes.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);

      if (component.length > 1) {
        components.push(component);
      }
    }
  }

  for (const node of graph.keys()) {
    if (!indexes.has(node)) visit(node);
  }

  return components.sort((a, b) => b.length - a.length);
}

function formatFile(filePath) {
  return toPosix(path.relative(root, filePath));
}

function main() {
  const files = [];
  getScanRoots().forEach((scanRoot) => walk(scanRoot, files));
  const fileSet = new Set(files);
  const resolveSpecifier = createResolver(fileSet);
  const graph = new Map();
  const edgeDetails = new Map();

  for (const file of files) {
    const imports = collectStaticImports(file, resolveSpecifier);
    graph.set(
      file,
      imports.map((item) => item.file)
    );
    edgeDetails.set(file, imports);
  }

  const cycles = findStronglyConnectedComponents(graph);
  const modeLabel = includeTypes ? 'static import' : 'static runtime import';
  if (cycles.length === 0) {
    console.log(`[check-cycles] No ${modeLabel} cycles found.`);
    return;
  }

  console.error(
    `[check-cycles] Found ${cycles.length} ${modeLabel} cycle(s).`
  );
  cycles.forEach((component, index) => {
    const members = new Set(component);
    console.error(`\n#${index + 1} ${component.length} files`);
    for (const file of [...component].sort((a, b) =>
      formatFile(a).localeCompare(formatFile(b))
    )) {
      for (const edge of edgeDetails.get(file) || []) {
        if (members.has(edge.file)) {
          console.error(
            `- ${formatFile(file)} --[${edge.kind}:${edge.specifier}]--> ${formatFile(edge.file)}`
          );
        }
      }
    }
  });

  process.exitCode = 1;
}

main();
