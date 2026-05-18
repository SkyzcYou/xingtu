import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import { CanvasAvatarPlaceholder } from '../canvas-avatar-placeholder';
import {
  OIDC_LOGIN_CHANNEL_NAME,
  isOidcLoginCompleteMessage,
} from '../../services/auth/oidc-login-message';
import {
  clearOidcSession,
  loadOidcProfileViewModel,
  storeOidcSessionStorageValue,
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
  if (status === 'signed-in') {
    return '账户已登录';
  }
  if (status === 'expired') {
    return '登录状态已过期';
  }
  return '暂未登录';
}

function getLoginPopupFeatures(): string {
  if (typeof window === 'undefined') {
    return 'popup,width=520,height=720';
  }

  const width = 520;
  const height = 720;
  const left = Math.max(
    0,
    Math.round(window.screenX + (window.outerWidth - width) / 2)
  );
  const top = Math.max(
    0,
    Math.round(window.screenY + (window.outerHeight - height) / 2)
  );
  return `popup,width=${width},height=${height},left=${left},top=${top}`;
}

export const ProfileContent = ({
  active,
  compact = false,
  className,
  onProfileChange,
}: ProfileContentProps) => {
  const loginPopupRef = useRef<Window | null>(null);
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

  const handleLoginMessage = useCallback(
    (data: unknown) => {
      if (!isOidcLoginCompleteMessage(data)) {
        return;
      }

      if (!data.ok) {
        setLoginPending(false);
        setLoginFeedback(null);
        setLoginError(data.error);
        return;
      }

      if (!storeOidcSessionStorageValue(data.storageValue)) {
        setLoginPending(false);
        setLoginFeedback(null);
        setLoginError('登录结果无效，请重新登录。');
        return;
      }

      loginPopupRef.current?.close();
      loginPopupRef.current = null;
      refreshProfile();
      setLoginPending(false);
      setLoginError(null);
      setLoginFeedback('登录成功，账户信息已更新。');
    },
    [refreshProfile]
  );

  const handleLogin = useCallback(() => {
    setLoginPending(true);
    setLoginError(null);
    setLoginFeedback('已打开登录窗口，请在新窗口中完成登录。');

    const popup = window.open(
      '/auth-login.html?mode=popup',
      'xingtu-trust-login',
      getLoginPopupFeatures()
    );

    if (!popup) {
      setLoginPending(false);
      setLoginFeedback(null);
      setLoginError('浏览器阻止了登录窗口，请允许弹出窗口后重试。');
      return;
    }

    loginPopupRef.current = popup;
    popup.focus();
  }, []);

  useEffect(() => {
    if (!active && !loginPending) {
      return;
    }

    const handleWindowMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      handleLoginMessage(event.data);
    };

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(OIDC_LOGIN_CHANNEL_NAME);
      channel.onmessage = (event) => handleLoginMessage(event.data);
    }

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      channel?.close();
    };
  }, [active, handleLoginMessage, loginPending]);

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
          <div className="profile-dialog__status">{getStatusText(profile.status)}</div>
          <h2>{isSignedIn ? profile.displayName : getStatusText(profile.status)}</h2>
          <p>
            {isSignedIn
              ? '以下为当前账户的基本信息。'
              : isExpired
              ? '登录状态已过期，请重新登录以继续使用账户服务。'
              : '登录后可查看账户信息并使用账户相关服务。'}
          </p>
        </div>
      </section>

      {isSignedIn ? (
        <section className="profile-dialog__panel" aria-label="账户信息">
          <ProfileRow label="用户名">{profile.displayName}</ProfileRow>
          <ProfileRow label="邮箱">{profile.email}</ProfileRow>
          <ProfileRow label="账户 ID">{profile.subject}</ProfileRow>
          <ProfileRow label="登录状态">
            {profile.hasAccessToken ? '已验证' : '未验证'}
          </ProfileRow>
          <ProfileRow label="有效期至">{profile.expiresAtText}</ProfileRow>
          <ProfileRow label="权限">
            {profile.roles.length > 0 ? (
              <div className="profile-dialog__roles">
                {profile.roles.slice(0, 40).map((role) => (
                  <span key={role} className="profile-dialog__role">
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              '暂无特殊权限'
            )}
          </ProfileRow>
        </section>
      ) : (
        <section className="profile-dialog__empty" aria-label="登录提示">
          <p>{isExpired ? '登录状态已过期。' : '当前尚未登录账户。'}</p>
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
          刷新状态
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
