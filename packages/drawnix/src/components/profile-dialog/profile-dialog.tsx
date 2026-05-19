import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import { CanvasAvatarPlaceholder } from '../canvas-avatar-placeholder';
import {
  clearOidcSession,
  loadOidcProfileViewModel,
  type OidcProfileViewModel,
} from '../../services/auth/oidc-session';
import './profile-dialog.scss';

export interface ProfileContentProps {
  active: boolean;
  compact?: boolean;
  className?: string;
  onProfileChange?: (profile: OidcProfileViewModel) => void;
}

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="profile-dialog__row">
      <div className="profile-dialog__row-label">{label}</div>
      <div className="profile-dialog__row-value">{children}</div>
    </div>
  );
}

function getStatusText(status: OidcProfileViewModel['status']): string {
  return status === 'expired' ? '需要登录' : '未登录';
}

function getSignedOutTitle(status: OidcProfileViewModel['status']): string {
  return status === 'expired' ? '请重新登录' : '登录账户';
}

function getSignedOutDescription(status: OidcProfileViewModel['status']): string {
  return status === 'expired'
    ? '为保护账户安全，请重新登录后继续使用。'
    : '登录后可使用账户相关服务。';
}

const AUTH_LOGIN_PATH = '/auth-login.html';
const AUTH_RETURN_URL_PARAM = 'returnUrl';
const PROFILE_PANEL_RETURN_PARAM = 'profilePanel';
const PROFILE_PANEL_RETURN_VALUE = '1';

function buildAuthLoginUrl(): string {
  const returnUrl = new URL(window.location.href);
  returnUrl.searchParams.set(PROFILE_PANEL_RETURN_PARAM, PROFILE_PANEL_RETURN_VALUE);
  const returnPath = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  const loginUrl = new URL(AUTH_LOGIN_PATH, window.location.origin);
  loginUrl.searchParams.set(AUTH_RETURN_URL_PARAM, returnPath);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

export const ProfileContent = ({
  active,
  compact = false,
  className,
  onProfileChange,
}: ProfileContentProps) => {
  const [profile, setProfile] = useState<OidcProfileViewModel>(() =>
    loadOidcProfileViewModel()
  );
  const [loginPending, setLoginPending] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refreshProfile = useCallback(() => {
    const nextProfile = loadOidcProfileViewModel();
    setProfile(nextProfile);
    onProfileChange?.(nextProfile);
  }, [onProfileChange]);

  const handleRefresh = useCallback(() => {
    refreshProfile();
    setLoginFeedback(null);
    setLoginError(null);
  }, [refreshProfile]);

  const handleLogout = useCallback(() => {
    clearOidcSession();
    refreshProfile();
    setLoginPending(false);
    setLoginFeedback(null);
    setLoginError(null);
  }, [refreshProfile]);

  const handleLogin = useCallback(() => {
    setLoginPending(true);
    setLoginError(null);
    setLoginFeedback('正在前往安全登录页面...');
    window.location.assign(buildAuthLoginUrl());
  }, []);

  useEffect(() => {
    if (active) {
      refreshProfile();
    }
  }, [active, refreshProfile]);

  const isSignedIn = profile.status === 'signed-in';
  const isExpired = profile.status === 'expired';
  const rootClassName = [
    'profile-dialog',
    'profile-dialog--drawer',
    compact ? 'profile-dialog--compact' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} data-testid="profile-dialog">
      <section className="profile-dialog__hero">
        <CanvasAvatarPlaceholder
          className="profile-dialog__avatar"
          seed={isSignedIn ? profile.avatarSeed : null}
          aria-label="用户头像"
          disabled
        />
        <div className="profile-dialog__identity">
          {!isSignedIn && (
            <div className="profile-dialog__status">{getStatusText(profile.status)}</div>
          )}
          <h2>{isSignedIn ? profile.displayName : getSignedOutTitle(profile.status)}</h2>
          {!isSignedIn && <p>{getSignedOutDescription(profile.status)}</p>}
        </div>
      </section>

      {isSignedIn ? (
        <section className="profile-dialog__panel" aria-label="账户信息">
          <ProfileRow label="用户名">{profile.displayName}</ProfileRow>
          <ProfileRow label="邮箱">{profile.email}</ProfileRow>
        </section>
      ) : (
        <section className="profile-dialog__empty" aria-label="登录提示">
          <button
            type="button"
            className="profile-dialog__primary-action"
            onClick={handleLogin}
            disabled={loginPending}
          >
            <LogIn size={16} />
            {loginPending ? '登录中' : isExpired ? '重新登录' : '登录账户'}
          </button>
          {loginFeedback && (
            <p className="profile-dialog__notice" role="status">
              {loginFeedback}
            </p>
          )}
          {loginError && (
            <p className="profile-dialog__notice profile-dialog__notice--error" role="alert">
              {loginError}
            </p>
          )}
        </section>
      )}

      <footer className="profile-dialog__footer">
        <button type="button" className="profile-dialog__button" onClick={handleRefresh}>
          <RefreshCw size={15} />
          刷新
        </button>
        {isSignedIn && (
          <button
            type="button"
            className="profile-dialog__button profile-dialog__button--danger"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            退出登录
          </button>
        )}
      </footer>
    </div>
  );
};

export default ProfileContent;
