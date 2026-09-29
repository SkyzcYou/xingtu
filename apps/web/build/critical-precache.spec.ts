import { describe, expect, it } from 'vitest';
import {
  collectCriticalPrecacheUrls,
  type CriticalBundleOutput,
} from './critical-precache';

const chunk = (
  fileName: string,
  imports: string[] = [],
  extra: Partial<CriticalBundleOutput> = {}
): CriticalBundleOutput => ({ type: 'chunk', fileName, imports, ...extra });
const asset = (fileName: string): CriticalBundleOutput => ({
  type: 'asset',
  fileName,
});
const bundle = (...files: CriticalBundleOutput[]) =>
  Object.fromEntries(files.map((file) => [file.fileName, file]));

describe('critical boot dependency closure', () => {
  it('includes deferred startup/bootstrap and transitive static JS/CSS without optional chunks', () => {
    const result = collectCriticalPrecacheUrls(
      bundle(
        chunk('assets/index-a.js', ['assets/runtime-a.js'], {
          isEntry: true,
          dynamicImports: ['assets/startup-app-a.js'],
        }),
        chunk('assets/startup-app-a.js', ['assets/runtime-a.js'], {
          dynamicImports: ['assets/bootstrap-a.js'],
        }),
        chunk(
          'assets/bootstrap-a.js',
          ['assets/react-a.js', 'assets/canvas-a.js'],
          { viteMetadata: { importedCss: new Set(['assets/boot-a.css']) } }
        ),
        chunk('assets/canvas-a.js', ['assets/render-a.js'], {
          referencedFiles: ['assets/logo-a.svg'],
        }),
        chunk('assets/render-a.js'),
        chunk('assets/react-a.js'),
        chunk('assets/runtime-a.js'),
        chunk('assets/settings-dialog-a.js'),
        chunk('assets/office-data-a.js'),
        asset('assets/boot-a.css'),
        asset('assets/logo-a.svg'),
        asset('assets/unrelated.css')
      )
    );
    expect([...result]).toEqual([
      '/assets/boot-a.css',
      '/assets/bootstrap-a.js',
      '/assets/canvas-a.js',
      '/assets/index-a.js',
      '/assets/logo-a.svg',
      '/assets/react-a.js',
      '/assets/render-a.js',
      '/assets/runtime-a.js',
      '/assets/startup-app-a.js',
    ]);
  });

  it('finds bootstrap by module identity when chunk names change and handles cycles/externals', () => {
    const result = collectCriticalPrecacheUrls(
      bundle(
        chunk('assets/entry-a.js', ['assets/a.js'], {
          modules: { '/repo/apps/web/src/app/bootstrap.tsx': {} },
        }),
        chunk('assets/a.js', ['assets/entry-a.js', 'external-package']),
        chunk('assets/optional.js')
      )
    );
    expect([...result]).toEqual(['/assets/a.js', '/assets/entry-a.js']);
  });
});
