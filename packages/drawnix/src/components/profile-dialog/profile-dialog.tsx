import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, LogIn, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { WinBoxWindow } from '../winbox';
import { CanvasAvatarPlaceholder } from '../canvas-avatar-placeholder';
import { useDrawnix } from '../../hooks/use-drawnix';
import { useDeviceType } from '../../hooks/useDeviceType';
import {
  clearOidcSession,
  loadOidcProfileViewModel,
  type OidcProfileViewModel,
} from '../../services/auth/oidc-session';
import './profile-dialog.scss';

export interface ProfileDialogProps {
  container?: HTMLElement | null;
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="profile-dialog__row">
      <div className="profile-dialog__row-label">{label}</div>
      <div className="profile-dialog__row-value">{children}</div>
    </div>
  );
}

function getStatusText(status: OidcProfileViewModel['status']): string {
  if (status === 'signed-in') {
    return '已通过 Ferriskey Trust 登录';
  }
  if (status === 'expired') {
    return '登录已过期';
  }
  return '尚未登录';
}

export const ProfileDialog = ({ container }: ProfileDialogProps) => {
  const { appState, setAppState } = useDrawnix();
  const { isMobile, isTablet } = useDeviceType();
  const isCompactLayout = isMobile || isTablet;
  const [profile, setProfile] = useState<OidcProfileViewModel>(() =>
    loadOidcProfileViewModel()
  );

  const handleWindowClose = useCallback(() => {
    setAppState((prev) => ({ ...prev, openProfile: false }));
  }, [setAppState]);

  const handleRefresh = useCallback(() => {
    setProfile(loadOidcProfileViewModel());
  }, []);

  const handleLogout = useCallback(() => {
    clearOidcSession();
    setProfile(loadOidcProfileViewModel());
  }, []);

  useEffect(() => {
    if (appState.openProfile) {
      setProfile(loadOidcProfileViewModel());
    }
  }, [appState.openProfile]);

  const isSignedIn = profile.status === 'signed-in';
  const isExpired = profile.status === 'expired';

  return (
    <WinBoxWindow
      id="profile-dialog"
      visible={Boolean(appState.openProfile)}
      title="个人资料"
      icon={<UserRound size={16} />}
      onClose={handleWindowClose}
      width={isCompactLayout ? '100%' : 560}
      height={isCompactLayout ? '100%' : 640}
      minWidth={isCompactLayout ? 0 : 420}
      minHeight={isCompactLayout ? 0 : 480}
      x="center"
      y="center"
      maximizable={true}
      minimizable={false}
      resizable={!isCompactLayout}
      movable={!isCompactLayout}
      modal={false}
      className={`winbox-ai-generation winbox-glass-window winbox-tool-window winbox-settings-window winbox-profile-window ${
        isCompactLayout ? 'winbox-profile-window--compact' : ''
      }`}
      container={container}
      background="transparent"
    >
      <div
        className={`profile-dialog ${
          isCompactLayout ? 'profile-dialog--compact' : ''
        }`}
        data-testid="profile-dialog"
      >
        <section className="profile-dialog__hero">
          <CanvasAvatarPlaceholder
            className="profile-dialog__avatar"
            seed={profile.avatarSeed}
            aria-label="用户头像"
            disabled
          />
          <div className="profile-dialog__identity">
            <div className="profile-dialog__status">{getStatusText(profile.status)}</div>
            <h2>{isSignedIn ? profile.displayName : getStatusText(profile.status)}</h2>
            <p>
              {isSignedIn
                ? '此窗口展示与 auth-user.html 一致的脱敏账号信息。'
                : isExpired
                ? '请重新登录 Trust 以刷新当前浏览器会话。'
                : '当前浏览器会话中没有 Trust 登录信息。'}
            </p>
          </div>
        </section>

        {isSignedIn ? (
          <section className="profile-dialog__panel" aria-label="账号信息">
            <ProfileRow label="用户">{profile.displayName}</ProfileRow>
            <ProfileRow label="邮箱">{profile.email}</ProfileRow>
            <ProfileRow label="Subject">{profile.subject}</ProfileRow>
            <ProfileRow label="Token 类型">{profile.tokenType}</ProfileRow>
            <ProfileRow label="Access Token">
              {profile.hasAccessToken ? '已获取，出于安全原因不展示内容' : '未获取'}
            </ProfileRow>
            <ProfileRow label="过期时间">{profile.expiresAtText}</ProfileRow>
            <ProfileRow label="角色">
              {profile.roles.length > 0 ? (
                <div className="profile-dialog__roles">
                  {profile.roles.slice(0, 40).map((role) => (
                    <span key={role} className="profile-dialog__role">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                '未发现角色信息'
              )}
            </ProfileRow>
          </section>
        ) : (
          <section className="profile-dialog__empty" aria-label="登录提示">
            <p>{isExpired ? '登录信息已过期。' : '尚未检测到登录信息。'}</p>
            <a className="profile-dialog__primary-action" href="/auth-login.html">
              <LogIn size={16} />
              {isExpired ? '重新登录 Trust' : '登录 Trust'}
            </a>
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
          <a className="profile-dialog__button" href="/auth-user.html">
            <ExternalLink size={15} />
            打开完整资料页
          </a>
        </footer>
      </div>
    </WinBoxWindow>
  );
};

export default ProfileDialog;
