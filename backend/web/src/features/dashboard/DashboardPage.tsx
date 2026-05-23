import { useQuery } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { getHealth } from '../profile/profile.api';

export function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: getHealth,
  });

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <p>星图管理员控制面板</p>
        <h1>账号与 API Key 关联管理</h1>
        <span>面向管理员管理星图账号、API Profile 绑定、启停和后续同步审计。</span>
      </section>

      <div className="status-grid">
        <StatusCard
          title="后端服务"
          status={healthQuery.data?.status === 'ok' ? '正常' : '待确认'}
          tone={healthQuery.data?.status === 'ok' ? 'success' : 'warning'}
          description={
            healthQuery.error
              ? healthQuery.error.message
              : '通过 /health 检查 Axum API 服务状态。'
          }
          onRefresh={() => healthQuery.refetch()}
        />
        <StatusCard
          title="管理员接口"
          status="待接入"
          tone="warning"
          description="当前后端还没有账户列表、API Key 绑定、启停和审计等管理员 API。"
        />
      </div>

      <SectionCard title="管理员能力边界" description="控制面板只面向管理员，不作为普通用户的星图内设置页。">
        <ul className="capability-list">
          <li>普通用户仍只在星图主应用内使用自己的 API Key。</li>
          <li>管理员面板用于管理账号与 API Profile 的关联关系。</li>
          <li>当前前端已搭好管理入口，真实管理操作等待后端管理员 API 补齐。</li>
        </ul>
      </SectionCard>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  status: string;
  tone: 'success' | 'warning';
  description: string;
  onRefresh?: () => void;
}

function StatusCard({ title, status, tone, description, onRefresh }: StatusCardProps) {
  return (
    <section className="status-card">
      <header>
        <span>{title}</span>
        <Tag theme={tone}>{status}</Tag>
      </header>
      <p>{description}</p>
      {onRefresh && (
        <Button size="small" variant="outline" onClick={onRefresh}>
          刷新
        </Button>
      )}
    </section>
  );
}
