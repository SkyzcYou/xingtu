export interface CriticalBundleOutput {
  type: 'chunk' | 'asset';
  fileName: string;
  isEntry?: boolean;
  facadeModuleId?: string | null;
  modules?: Record<string, unknown>;
  imports?: string[];
  dynamicImports?: string[];
  referencedFiles?: string[];
  viteMetadata?: { importedCss?: Set<string> };
}

/** Include boot's dynamic boundaries, then only their static dependency closure. */
export function collectCriticalPrecacheUrls(
  bundle: Record<string, CriticalBundleOutput>
): Set<string> {
  const files = new Map(
    Object.values(bundle).map((file) => [file.fileName, file])
  );
  const roots = [...files.values()].filter(
    (file) =>
      file.type === 'chunk' &&
      (file.isEntry ||
        /(?:^|\/)(?:startup-app|bootstrap)-[^/]+\.js$/.test(file.fileName) ||
        [file.facadeModuleId, ...Object.keys(file.modules || {})].some(
          (id) =>
            typeof id === 'string' &&
            /\/apps\/web\/src\/(?:main|app\/bootstrap)\.tsx$/.test(
              id.replace(/\\/g, '/')
            )
        ))
  );
  const pending = roots.map((file) => file.fileName);
  const visited = new Set<string>();
  while (pending.length) {
    const name = pending.pop()!;
    if (visited.has(name)) continue;
    const file = files.get(name);
    // External imports are not application assets and must not become precache URLs.
    if (!file) continue;
    visited.add(name);
    if (file.type === 'chunk') {
      pending.push(
        ...(file.imports || []),
        ...(file.referencedFiles || []),
        ...(file.viteMetadata?.importedCss || [])
      );
    }
  }
  return new Set(
    [...visited].sort().map((name) => `/${name.replace(/^\/+/, '')}`)
  );
}
