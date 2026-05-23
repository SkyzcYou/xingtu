import type { User } from 'oidc-client-ts';
import { panelConfig } from '../env/config';

interface RoleAccess {
  roles?: unknown;
}

interface ProfileWithRoles {
  realm_access?: RoleAccess;
  resource_access?: Record<string, RoleAccess>;
}

export function getDisplayName(user: User | null): string {
  if (!user) return '未登录';
  const profile = user.profile;
  return (
    getStringClaim(profile.preferred_username) ||
    getStringClaim(profile.name) ||
    getStringClaim(profile.email) ||
    getStringClaim(profile.sub) ||
    '管理员'
  );
}

export function getEmail(user: User | null): string {
  return getStringClaim(user?.profile.email) || '未提供';
}

export function getUserRoles(user: User | null): string[] {
  if (!user) return [];
  const profile = user.profile as ProfileWithRoles;
  const roles = new Set<string>();
  collectRoles(profile.realm_access?.roles, roles);
  collectRoles(profile.resource_access?.[panelConfig.ferriskeyClientId]?.roles, roles);
  return Array.from(roles).sort();
}

export function hasRequiredAdminRole(user: User | null): boolean {
  if (!panelConfig.adminRequiredRole) return true;
  return getUserRoles(user).includes(panelConfig.adminRequiredRole);
}

export function formatTokenExpiry(user: User | null): string {
  if (!user?.expires_at) return '未知';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.expires_at * 1000));
}

function collectRoles(value: unknown, roles: Set<string>): void {
  if (!Array.isArray(value)) return;
  value.forEach((role) => {
    if (typeof role === 'string' && role.trim()) {
      roles.add(role.trim());
    }
  });
}

function getStringClaim(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
