import { Button, Tag } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { useAuth } from '../../lib/auth/auth-context';
import { formatTokenExpiry, getDisplayName, getEmail, getUserRoles } from '../../lib/auth/auth-roles';

export function AuthProfilePage() {
  const { user, logout } = useAuth();
  const roles = getUserRoles(user);

  return (
    <div className="page-stack">
      <SectionCard
        title="个人资料"
        description="这里展示当前 IAM 登录会话的基础信息，访问令牌不会直接展示。"
        action={<Button variant="outline" onClick={() => void logout()}>退出登录</Button>}
      >
        <div className="profile-summary">
          <div>
            <span>用户名</span>
            <strong>{getDisplayName(user)}</strong>
          </div>
          <div>
            <span>邮箱</span>
            <strong>{getEmail(user)}</strong>
          </div>
          <div>
            <span>Token 过期时间</span>
            <strong>{formatTokenExpiry(user)}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="身份标识" description="管理员接口最终仍应以后端权限校验为准。">
        <div className="identity-grid">
          <div>
            <span>Subject</span>
            <code>{user?.profile.sub || '未知'}</code>
          </div>
          <div>
            <span>Token 类型</span>
            <code>{user?.token_type || 'Bearer'}</code>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="角色" description="来自 realm_access 和 xingtu-console client roles。">
        {roles.length ? (
          <div className="role-list">
            {roles.map((role) => <Tag key={role}>{role}</Tag>)}
          </div>
        ) : (
          <p className="muted-text">当前用户没有可展示的角色。</p>
        )}
      </SectionCard>
    </div>
  );
}
