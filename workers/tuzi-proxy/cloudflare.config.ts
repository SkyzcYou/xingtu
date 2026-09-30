import { defineConfig, triggers } from 'cf/config';
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' };

export default defineConfig({
  worker: {
    name: 'xingtu-tuzi-proxy',
    compatibilityDate: '2026-09-29',
    compatibilityFlags: ['enable_request_signal'],
    entrypoint,
    triggers: [
      triggers.fetch({
        pattern: 'xingtu.live/__tuzi_proxy__/*',
        zone: 'xingtu.live',
      }),
      triggers.fetch({
        pattern: 'www.xingtu.live/__tuzi_proxy__/*',
        zone: 'xingtu.live',
      }),
    ],
  },
});
