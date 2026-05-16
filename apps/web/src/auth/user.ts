import type { User } from 'oidc-client-ts';
import { ferriskeyUserManager, isActiveUser } from './ferriskey-oidc';
import { escapeHtml, getElement, getErrorMessage } from './auth-ui';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function addRolesFromValue(roles: Set<string>, prefix: string, value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.roles)) {
    return;
  }

  for (const role of value.roles) {
    if (typeof role === 'string' && role.trim()) {
      roles.add(prefix ? `${prefix}:${role.trim()}` : role.trim());
    }
  }
}

function collectRoles(profile: UnknownRecord): string[] {
  const roles = new Set<string>();
  addRolesFromValue(roles, '', profile.realm_access);

  if (isRecord(profile.resource_access)) {
    for (const [client, access] of Object.entries(profile.resource_access)) {
      addRolesFromValue(roles, client, access);
    }
  }

  return Array.from(roles).sort();
}

function formatExpiresAt(user: User): string {
  if (!user.expires_at) {
    return '未知';
  }
  return new Date(user.expires_at * 1000).toLocaleString();
}

function renderRow(label: string, valueHtml: string): string {
  return `
    <div class="row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${valueHtml}</div>
    </div>
  `;
}

function renderRoles(roles: string[]): string {
  if (roles.length === 0) {
    return escapeHtml('未发现角色信息');
  }

  return `
    <div class="roles">
      ${roles
        .slice(0, 40)
        .map((role) => `<span class="role">${escapeHtml(role)}</span>`)
        .join('')}
    </div>
  `;
}

function renderSignedOut(message: string): void {
  getElement<HTMLElement>('auth-content').innerHTML = `
    <h2>尚未登录</h2>
    <p class="muted">${escapeHtml(message)}</p>
    <div class="actions">
      <a class="button" href="/auth-login.html">登录 Trust</a>
      <a class="button secondary" href="/home.html">返回首页</a>
    </div>
  `;
}

function renderError(error: unknown): void {
  getElement<HTMLElement>('auth-content').innerHTML = `
    <h2>读取用户信息失败</h2>
    <p class="muted">${escapeHtml(getErrorMessage(error))}</p>
    <div class="actions">
      <a class="button" href="/auth-login.html">重新登录</a>
      <a class="button secondary" href="/home.html">返回首页</a>
    </div>
  `;
}

function renderUser(user: User): void {
  const profile = user.profile as UnknownRecord;
  const displayName = firstText(
    profile.preferred_username,
    profile.name,
    profile.email,
    profile.sub
  );
  const rows = [
    renderRow('用户', escapeHtml(displayName || '未知用户')),
    renderRow('邮箱', escapeHtml(firstText(profile.email) || '未提供')),
    renderRow('Subject', escapeHtml(firstText(profile.sub) || '未提供')),
    renderRow('Token 类型', escapeHtml(user.token_type || '未知')),
    renderRow('Access Token', escapeHtml(user.access_token ? '已获取，出于安全原因不展示内容' : '未获取')),
    renderRow('过期时间', escapeHtml(formatExpiresAt(user))),
    renderRow('角色', renderRoles(collectRoles(profile))),
  ].join('');

  getElement<HTMLElement>('auth-content').innerHTML = `
    <h2>${escapeHtml(displayName || '已登录用户')}</h2>
    <p class="muted">已通过 Ferriskey Trust 登录。此页面仅展示脱敏后的 MVP 登录信息。</p>
    <div class="grid">${rows}</div>
    <div class="actions">
      <a class="button" href="/">进入工作台</a>
      <a class="button secondary" href="/home.html">返回首页</a>
      <button id="logout-button" class="button danger" type="button">退出登录</button>
    </div>
  `;

  document.getElementById('logout-button')?.addEventListener('click', () => {
    void ferriskeyUserManager.removeUser().finally(() => {
      window.location.href = '/home.html';
    });
  });
}

async function render(): Promise<void> {
  try {
    const user = await ferriskeyUserManager.getUser();
    const isExpiredUser = Boolean(user?.expired);
    if (!isActiveUser(user)) {
      renderSignedOut(isExpiredUser ? '登录已过期，请重新登录。' : '当前浏览器会话中没有 Trust 登录信息。');
      return;
    }

    renderUser(user);
  } catch (error) {
    renderError(error);
  }
}

void render();
