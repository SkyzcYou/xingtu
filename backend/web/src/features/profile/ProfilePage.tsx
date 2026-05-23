import { SectionCard } from '../../components/SectionCard';
import { ProfileTable } from './profile.table';
import type { ProfileFieldRow } from './profile.types';

const adminApiRows: ProfileFieldRow[] = [
  { label: '账户列表', value: 'GET /api/admin/accounts', tone: 'warning' },
  { label: 'Profile 列表', value: 'GET /api/admin/api-profiles', tone: 'warning' },
  { label: '绑定 API Key', value: 'POST /api/admin/api-profiles', tone: 'warning' },
  { label: '更新配置', value: 'PUT /api/admin/api-profiles/:id', tone: 'warning' },
  { label: '启停配置', value: 'PATCH /api/admin/api-profiles/:id/enabled', tone: 'warning' },
  { label: '设置默认', value: 'PATCH /api/admin/accounts/:id/default-profile', tone: 'warning' },
];

export function ProfilePage() {
  return (
    <div className="page-stack">
      <SectionCard
        title="API Key 关联管理"
        description="管理员在这里维护星图账号与 API Profile 的绑定关系。当前后端尚未提供管理员 CRUD 接口，因此先展示管理入口和接口缺口。"
      >
        <div className="profile-summary">
          <div>
            <span>管理对象</span>
            <strong>星图账号</strong>
          </div>
          <div>
            <span>配置对象</span>
            <strong>API Profile / API Key</strong>
          </div>
          <div>
            <span>当前状态</span>
            <strong>等待管理员 API</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="后端接口缺口"
        description="这些接口补齐后，当前页面可以扩展为真实的账户/Profile 管理表格。"
      >
        <ProfileTable rows={adminApiRows} />
      </SectionCard>

      <SectionCard title="管理原则" description="面板是后台管理工具，用户侧使用范围仍限制在星图主应用内。">
        <ul className="capability-list">
          <li>管理员可以查看和维护账号绑定的 API Profile。</li>
          <li>API Key 默认应脱敏展示，编辑时只在必要操作中显式处理。</li>
          <li>普通用户不通过此面板操作，用户侧只在星图产品内使用和同步自己的配置。</li>
        </ul>
      </SectionCard>
    </div>
  );
}
