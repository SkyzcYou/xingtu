# Change: Add English SEO homepage

## Why
The current SEO homepage is Chinese-only, so it cannot directly rank for English search intent such as open-source AI canvas, AI image generation workspace, and AI whiteboard.

## What Changes
- Add an English static SEO homepage at `/en/home.html`.
- Add bidirectional `hreflang` metadata between the Chinese and English homepages.
- Keep each localized homepage self-canonical to avoid consolidating the English page into the Chinese URL.
- Add the English homepage to the XML sitemap.

## Impact
- Affected specs: `seo-homepage`
- Affected code: `apps/web/public/home.html`, `apps/web/public/en/home.html`, `apps/web/public/sitemap.xml`
