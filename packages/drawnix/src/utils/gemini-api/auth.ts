/**
 * Gemini API 认证和配置管理
 */

import { GeminiConfig } from './types';
import { geminiSettings, type ModelRef } from '../settings-manager';
import { buildOidcLoginUrl } from '../../services/auth/oidc-session';

export type AuthMethodPromptAction =
  | 'login'
  | 'switch-model'
  | 'save-xingtu-api-key'
  | 'open-provider-settings';

export interface AuthMethodPromptOption {
  id: string;
  title: string;
  description: string;
  descriptionItems?: string[];
  statusLabel?: string;
  buttonLabel: string;
  action: AuthMethodPromptAction;
  modelRef?: ModelRef | null;
  requiresApiKeyInput?: boolean;
  allowEmptyApiKey?: boolean;
  apiKeyMaskedValue?: string;
  apiKeyPlaceholder?: string;
}

export interface AuthMethodPromptOptions {
  description?: string;
  options: AuthMethodPromptOption[];
}

export type AuthMethodPromptResult =
  | { action: 'login'; optionId: string }
  | { action: 'switch-model'; modelRef: ModelRef; optionId: string }
  | {
      action: 'save-xingtu-api-key';
      apiKey: string;
      modelRef: ModelRef;
      optionId: string;
    }
  | { action: 'open-provider-settings'; optionId: string }
  | null;

const OPEN_SETTINGS_EVENT = 'aitu:open-settings';
const SETTINGS_PROVIDER_NAV_EVENT = 'aitu:settings:provider-nav';

function openProviderSettings(): void {
  if (typeof window === 'undefined') return;
  const intent = { action: 'create' } as const;
  const targetWindow = window as typeof window & {
    __aituPendingProviderNavigationIntent?: typeof intent;
  };
  targetWindow.__aituPendingProviderNavigationIntent = intent;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
  window.setTimeout(() => {
    if (targetWindow.__aituPendingProviderNavigationIntent !== intent) return;
    targetWindow.__aituPendingProviderNavigationIntent = undefined;
    window.dispatchEvent(
      new CustomEvent(SETTINGS_PROVIDER_NAV_EVENT, { detail: intent })
    );
  }, 100);
}
import { isTuziEmbeddedMode } from '../../services/tuzi-embedded-config';

/**
 * 兼容旧调用点：统一打开新的认证方式选择弹窗。
 */
export async function promptForApiKey(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const result = await promptForAuthMethod();
  if (!result) return null;

  if (result.action === 'login') {
    window.location.assign(buildOidcLoginUrl());
    return null;
  }

  if (result.action === 'open-provider-settings') {
    openProviderSettings();
    return null;
  }

  if (result.action === 'save-xingtu-api-key') {
    if (result.apiKey) {
      await geminiSettings.update({ apiKey: result.apiKey });
      return result.apiKey;
    }
    const storedApiKey = geminiSettings.get().apiKey || null;
    return storedApiKey;
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDefaultAuthOptions(): AuthMethodPromptOption[] {
  const legacyModelRef: ModelRef = {
    profileId: 'legacy-default',
    modelId: null,
  };
  return [
    {
      id: 'login',
      title: '登录账号',
      description: '使用星图账号登录，无需手动保存 API Key。',
      descriptionItems: ['不想手动管理 API Key', '登录后直接使用账号权益'],
      statusLabel: '推荐',
      buttonLabel: '登录星图账号',
      action: 'login',
    },
    {
      id: 'xingtu-api-key-input',
      title: '使用星图 API Key',
      description: '已有星图 API Key，可直接粘贴使用。',
      descriptionItems: ['已经有可用的星图 API Key', '想优先使用本地密钥配置'],
      buttonLabel: '保存并继续',
      action: 'save-xingtu-api-key',
      modelRef: legacyModelRef,
      requiresApiKeyInput: true,
      apiKeyPlaceholder: '粘贴星图 API Key',
    },
    {
      id: 'provider-settings',
      title: '自定义 API Key',
      description: '接入 OpenAI 兼容、Gemini 兼容或其他供应商。',
      descriptionItems: ['想接入自己的模型供应商', '需要管理 OpenAI / Gemini 兼容渠道'],
      buttonLabel: '打开供应商设置',
      action: 'open-provider-settings',
    },
  ];
}

export function promptForAuthMethod(
  promptOptions?: AuthMethodPromptOptions
): Promise<AuthMethodPromptResult> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const options = promptOptions?.options?.length
      ? promptOptions.options
      : buildDefaultAuthOptions();
    const overlay = document.createElement('div');
    overlay.className = 'auth-method-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'auth-method-dialog';

    const optionCards = options
      .map((option, index) => {
        const status = option.statusLabel
          ? `<div class="auth-method-badge">${escapeHtml(option.statusLabel)}</div>`
          : '';
        const input = option.requiresApiKeyInput
          ? `<input id="authMethodInput-${index}" class="auth-method-input" type="text" value="${escapeHtml(
              option.apiKeyMaskedValue || ''
            )}" placeholder="${escapeHtml(
              option.apiKeyPlaceholder || '粘贴星图 API Key'
            )}" />`
          : '';
        const description = option.descriptionItems?.length
          ? `<ul class="auth-method-description-list">${option.descriptionItems
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join('')}</ul>`
          : `<p>${escapeHtml(option.description)}</p>`;
        return `<section class="auth-method-card${index === 0 ? ' auth-method-card--primary' : ''}">
          <div class="auth-method-card-header">
            <h4>${escapeHtml(option.title)}</h4>
            ${status}
          </div>
          ${description}
          ${input}
          <button
            class="auth-method-button ${option.action === 'login' ? 'auth-method-button--account' : option.action === 'open-provider-settings' ? 'auth-method-button--neutral' : 'auth-method-button--primary'}"
            type="button"
            data-option-index="${index}"
          >${escapeHtml(option.buttonLabel)}</button>
        </section>`;
      })
      .join('');

    dialog.innerHTML = `
      <style>
        .auth-method-overlay {
          position: fixed;
          inset: 0;
          z-index: var(--td-z-index-dialog, 10000);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--td-brand-color, #f39c12) 18%, transparent), transparent 32%),
            radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--td-warning-color, #f39c12) 16%, transparent), transparent 30%),
            rgba(15, 23, 42, 0.36);
          backdrop-filter: blur(18px) saturate(140%);
        }

        .auth-method-dialog {
          width: min(780px, 96vw);
          max-height: 92vh;
          overflow: auto;
          position: relative;
          padding: 28px;
          box-sizing: border-box;
          color: var(--td-text-color-primary, #111827);
          font-family: var(--td-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          background: color-mix(in srgb, var(--td-bg-color-container, #ffffff) 82%, transparent);
          border: 1px solid color-mix(in srgb, var(--td-component-border, #dcdcdc) 64%, transparent);
          border-radius: var(--td-radius-extraLarge, 20px);
          box-shadow: var(--td-shadow-3, 0 24px 80px rgba(15, 23, 42, 0.26));
          backdrop-filter: blur(24px) saturate(150%);
        }

        .auth-method-dialog::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto 1px;
          height: 88px;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.56), transparent);
        }

        .auth-method-header {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .auth-method-eyebrow {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          margin-bottom: 8px;
          border-radius: var(--td-radius-round, 999px);
          background: var(--td-brand-color-light, rgba(243, 156, 18, 0.12));
          color: var(--td-brand-color, #f39c12);
          font-size: 12px;
          font-weight: 700;
        }

        .auth-method-title {
          margin: 0;
          color: var(--td-text-color-primary, #111827);
          font-size: 22px;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }

        .auth-method-desc {
          max-width: 560px;
          margin: 10px 0 0;
          color: var(--td-text-color-secondary, #6b7280);
          font-size: 14px;
          line-height: 1.7;
        }

        .auth-method-close {
          width: 36px;
          height: 36px;
          border: 1px solid transparent;
          border-radius: var(--td-radius-circle, 50%);
          background: transparent;
          color: var(--td-text-color-secondary, #6b7280);
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        .auth-method-close:hover,
        .auth-method-close:focus-visible {
          background: var(--td-bg-color-container-hover, rgba(0, 0, 0, 0.04));
          border-color: var(--td-component-border, #dcdcdc);
          color: var(--td-text-color-primary, #111827);
          outline: none;
        }

        .auth-method-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 14px;
        }

        .auth-method-card {
          display: flex;
          flex-direction: column;
          min-height: 190px;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--td-component-border, #dcdcdc) 72%, transparent);
          border-radius: var(--td-radius-large, 14px);
          background: color-mix(in srgb, var(--td-bg-color-container, #ffffff) 74%, transparent);
          box-shadow: var(--td-shadow-1, 0 8px 24px rgba(15, 23, 42, 0.08));
          backdrop-filter: blur(16px);
        }

        .auth-method-card--primary {
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--td-brand-color-light, rgba(243, 156, 18, 0.12)) 72%, transparent), transparent),
            color-mix(in srgb, var(--td-bg-color-container, #ffffff) 76%, transparent);
          border-color: color-mix(in srgb, var(--td-brand-color, #f39c12) 24%, var(--td-component-border, #dcdcdc));
        }

        .auth-method-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .auth-method-badge {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          height: 22px;
          padding: 0 8px;
          border-radius: var(--td-radius-round, 999px);
          background: var(--td-bg-color-component, rgba(0, 0, 0, 0.04));
          color: var(--td-text-color-secondary, #6b7280);
          font-size: 12px;
          font-weight: 700;
        }

        .auth-method-card h4 {
          margin: 0;
          color: var(--td-text-color-primary, #111827);
          font-size: 16px;
        }

        .auth-method-card p,
        .auth-method-description-list {
          margin: 0 0 16px;
          color: var(--td-text-color-secondary, #6b7280);
          font-size: 13px;
          line-height: 1.6;
        }

        .auth-method-description-list {
          list-style: disc;
          padding-left: 16px;
        }

        .auth-method-description-list li + li {
          margin-top: 4px;
        }

        .auth-method-promo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          padding: 14px 16px;
          border: 1px solid color-mix(in srgb, var(--td-component-border, #dcdcdc) 72%, transparent);
          border-radius: var(--td-radius-large, 14px);
          background: color-mix(in srgb, var(--td-bg-color-container, #ffffff) 72%, transparent);
          box-shadow: var(--td-shadow-1, 0 8px 24px rgba(15, 23, 42, 0.08));
          backdrop-filter: blur(16px);
        }

        .auth-method-promo-title {
          margin: 0 0 4px;
          color: var(--td-text-color-primary, #111827);
          font-size: 14px;
          font-weight: 700;
        }

        .auth-method-promo-desc {
          margin: 0;
          color: var(--td-text-color-secondary, #6b7280);
          font-size: 12px;
          line-height: 1.6;
        }

        .auth-method-qrs {
          display: flex;
          flex-shrink: 0;
          gap: 10px;
          justify-content: center;
        }

        .auth-method-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--td-text-color-placeholder, #9ca3af);
          font-size: 11px;
        }

        .auth-method-qr img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: var(--td-radius-default, 10px);
          background: var(--td-bg-color-container, #ffffff);
          border: 1px solid var(--td-component-border, #dcdcdc);
        }

        .auth-method-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--td-component-border, #dcdcdc);
          border-radius: var(--td-radius-default, 10px);
          background: var(--td-bg-color-container, #ffffff);
          color: var(--td-text-color-primary, #111827);
          font-size: 14px;
          box-sizing: border-box;
          margin-bottom: 10px;
          outline: none;
        }

        .auth-method-input:focus {
          border-color: var(--td-border-level-2-color, #c5c5c5);
          background: color-mix(in srgb, var(--td-bg-color-container, #ffffff) 88%, transparent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--td-component-border, #dcdcdc) 34%, transparent);
        }

        .auth-method-button {
          width: 100%;
          min-height: 42px;
          margin-top: auto;
          padding: 10px 12px;
          border-radius: var(--td-radius-default, 10px);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-method-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--td-brand-color-focus, rgba(243, 156, 18, 0.18));
        }

        .auth-method-button--primary {
          border: 1px solid var(--td-component-border, #dcdcdc);
          background: transparent;
          color: var(--td-text-color-primary, #111827);
        }

        .auth-method-button--primary:hover {
          border-color: var(--td-border-level-2-color, #c5c5c5);
          background: color-mix(in srgb, var(--td-bg-color-container-hover, rgba(0, 0, 0, 0.04)) 60%, transparent);
        }

        .auth-method-button--account {
          border: 1px solid var(--td-text-color-primary, #111827);
          background: var(--td-text-color-primary, #111827);
          color: var(--td-text-color-anti, #ffffff);
        }

        .auth-method-button--account:hover {
          border-color: var(--td-text-color-secondary, #4b5563);
          background: var(--td-text-color-secondary, #4b5563);
        }

        .auth-method-button--neutral {
          border: 1px solid var(--td-component-border, #dcdcdc);
          background: var(--td-bg-color-container, #ffffff);
          color: var(--td-text-color-primary, #111827);
        }

        .auth-method-button--neutral:hover {
          background: var(--td-bg-color-container-hover, rgba(0, 0, 0, 0.04));
          border-color: var(--td-border-level-2-color, #c5c5c5);
        }

        @media (max-width: 560px) {
          .auth-method-overlay {
            padding: 12px;
          }

          .auth-method-dialog {
            padding: 22px;
          }

          .auth-method-promo {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      </style>

      <div class="auth-method-header">
        <div>
          <div class="auth-method-eyebrow">开始使用星图 AI</div>
          <h3 class="auth-method-title">选择一种认证方式</h3>
          <p class="auth-method-desc">${escapeHtml(
            promptOptions?.description ||
              '首次生成前需要完成认证。你可以登录账号、粘贴星图 API Key，或接入自己的供应商。'
          )}</p>
        </div>
        <button id="closeBtn" class="auth-method-close" type="button" aria-label="关闭">×</button>
      </div>

      <div class="auth-method-promo">
        <div>
          <div class="auth-method-promo-title">需要 API Key 或人工协助？</div>
          <p class="auth-method-promo-desc">扫码咨询微信或小红薯，获取 API Key 配置与渠道开通支持。</p>
        </div>
        <div class="auth-method-qrs">
          <div class="auth-method-qr">
            <img src="./logo/wechat-qr.jpg" alt="微信 API Key 支持二维码" />
            <div>交流反馈群</div>
          </div>
          <div class="auth-method-qr">
            <img src="./red-qr.png" alt="小红薯 API Key 支持二维码" />
            <div>小红薯</div>
          </div>
        </div>
      </div>

      <div class="auth-method-grid">
        ${optionCards}
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const closeBtn = dialog.querySelector('#closeBtn') as HTMLButtonElement;

    const stopKeyboardPropagation = (event: KeyboardEvent) => {
      event.stopPropagation();
    };
    overlay.addEventListener('keydown', stopKeyboardPropagation, true);
    overlay.addEventListener('keyup', stopKeyboardPropagation, true);
    overlay.addEventListener('keypress', stopKeyboardPropagation, true);

    let settled = false;
    const cleanup = () => {
      overlay.removeEventListener('keydown', stopKeyboardPropagation, true);
      overlay.removeEventListener('keyup', stopKeyboardPropagation, true);
      overlay.removeEventListener('keypress', stopKeyboardPropagation, true);
      document.body.removeChild(overlay);
    };
    const finish = (result: AuthMethodPromptResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const firstInput = dialog.querySelector('.auth-method-input') as
      | HTMLInputElement
      | null;
    const firstButton = dialog.querySelector('.auth-method-button') as
      | HTMLButtonElement
      | null;
    setTimeout(() => (firstInput || firstButton)?.focus(), 100);

    closeBtn.addEventListener('click', () => finish(null));
    dialog.querySelectorAll<HTMLButtonElement>('[data-option-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.optionIndex);
        const option = options[index];
        if (!option) return;

        if (option.action === 'login') {
          finish({ action: 'login', optionId: option.id });
          return;
        }

        if (option.action === 'open-provider-settings') {
          finish({ action: 'open-provider-settings', optionId: option.id });
          return;
        }

        if (option.action === 'switch-model') {
          if (!option.modelRef) return;
          finish({
            action: 'switch-model',
            modelRef: option.modelRef,
            optionId: option.id,
          });
          return;
        }

        if (option.action === 'save-xingtu-api-key') {
          const input = dialog.querySelector(
            `#authMethodInput-${index}`
          ) as HTMLInputElement | null;
          const inputValue = input?.value.trim() || '';
          const apiKey =
            inputValue === option.apiKeyMaskedValue ? '' : inputValue;
          if (!apiKey && !option.allowEmptyApiKey) {
            if (input) {
              input.style.borderColor = '#ef4444';
              input.focus();
            }
            return;
          }
          if (!option.modelRef) return;
          finish({
            action: 'save-xingtu-api-key',
            apiKey,
            modelRef: option.modelRef,
            optionId: option.id,
          });
        }
      });
    });

    dialog.querySelectorAll<HTMLInputElement>('.auth-method-input').forEach((input) => {
      input.addEventListener('keypress', (event) => {
        if (event.key !== 'Enter') return;
        const section = input.closest('.auth-method-card');
        const button = section?.querySelector<HTMLButtonElement>(
          '[data-option-index]'
        );
        button?.click();
      });
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        finish(null);
      }
    });
  });
}

/**
 * 验证并确保配置有效，如果缺少 API Key 则弹窗获取
 */
export async function validateAndEnsureConfig(
  config: GeminiConfig
): Promise<GeminiConfig> {
  // 检查 baseUrl
  if (!config.baseUrl) {
    throw new Error('Base URL 是必需的');
  }

  // 检查 apiKey，优先从全局设置获取
  if (!config.apiKey) {
    // 首先尝试从全局设置获取
    const globalSettings = geminiSettings.get();
    if (globalSettings.apiKey) {
      // 更新原始config对象
      config.apiKey = globalSettings.apiKey;
      return config;
    }

    // 如果全局设置中也没有，则弹窗获取
    const newApiKey = await promptForApiKey();
    if (!newApiKey) {
      throw new Error('API Key 是必需的，操作已取消');
    }

    // 更新原始config对象
    config.apiKey = newApiKey;
    return config;
  }

  return config;
}

/**
 * 检查字符串是否是占位符格式
 * 如 {key}、${key}、{{key}}、{apiKey} 等
 */
function isPlaceholder(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  // 匹配 {xxx}、${xxx}、{{xxx}} 等占位符格式
  return (
    /^[{$]*\{?\w+\}?\}*$/.test(value) ||
    value.includes('{key}') ||
    value.includes('${')
  );
}

/**
 * 从URL参数中获取apiKey
 */
function getApiKeyFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  if (isTuziEmbeddedMode()) return null;

  const urlParams = new URLSearchParams(window.location.search);
  const apiKey = urlParams.get('apiKey');

  // 验证 apiKey 不是占位符格式
  if (isPlaceholder(apiKey)) {
    console.warn(
      '[Auth] Detected placeholder in URL apiKey, ignoring:',
      apiKey
    );
    return null;
  }

  return apiKey;
}

/**
 * 从URL参数中获取settings配置
 */
function getSettingsFromUrl(): { apiKey?: string; baseUrl?: string } | null {
  if (typeof window === 'undefined') return null;
  if (isTuziEmbeddedMode()) return null;

  const urlParams = new URLSearchParams(window.location.search);
  const settingsParam = urlParams.get('settings');

  if (!settingsParam) return null;

  try {
    const decoded = decodeURIComponent(settingsParam);
    const settings = JSON.parse(decoded);

    // 验证 apiKey 不是占位符格式
    const apiKey = isPlaceholder(settings.key) ? undefined : settings.key;
    if (settings.key && isPlaceholder(settings.key)) {
      console.warn(
        '[Auth] Detected placeholder in settings.key, ignoring:',
        settings.key
      );
    }

    return {
      apiKey,
      baseUrl: settings.url,
    };
  } catch (error) {
    console.warn('Failed to parse settings parameter:', error);
    return null;
  }
}

/**
 * 从URL中移除apiKey参数
 */
function removeApiKeyFromUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  let hasChanges = false;

  if (url.searchParams.has('apiKey')) {
    url.searchParams.delete('apiKey');
    hasChanges = true;
  }

  if (url.searchParams.has('settings')) {
    url.searchParams.delete('settings');
    hasChanges = true;
  }

  if (hasChanges) {
    window.history.replaceState({}, document.title, url.toString());
  }
}

/**
 * 初始化设置：从URL获取settings参数并处理
 */
export function initializeSettings(): void {
  if (isTuziEmbeddedMode()) {
    removeApiKeyFromUrl();
    return;
  }
  // 处理settings参数
  const settings = getSettingsFromUrl();
  // 处理单独的apiKey参数
  const apiKey = getApiKeyFromUrl();

  if (settings?.apiKey || settings?.baseUrl || apiKey) {
    geminiSettings.update({
      ...(settings?.apiKey && { apiKey: settings.apiKey }),
      ...(settings?.baseUrl && { baseUrl: settings.baseUrl }),
      ...(apiKey && { apiKey: apiKey }),
    });

    // Remove parameters from URL after processing
    const url = new URL(window.location.href);
    if (settings?.apiKey || settings?.baseUrl) {
      url.searchParams.delete('settings');
    }
    if (apiKey) {
      url.searchParams.delete('apiKey');
    }
    window.history.replaceState({}, '', url.toString());
  }
}

// Initialize settings from URL if present
if (typeof window !== 'undefined') {
  if (isTuziEmbeddedMode()) {
    removeApiKeyFromUrl();
  } else {
    // 处理settings参数
    const settings = getSettingsFromUrl();
    // 处理单独的apiKey参数
    const apiKey = getApiKeyFromUrl();

    if (settings?.apiKey || settings?.baseUrl || apiKey) {
      geminiSettings.update({
        ...(settings?.apiKey && { apiKey: settings.apiKey }),
        ...(settings?.baseUrl && { baseUrl: settings.baseUrl }),
        ...(apiKey && { apiKey: apiKey }),
      });
      removeApiKeyFromUrl();
    }
  }
}
