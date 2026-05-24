import { useQuery } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { getHealth, getLlmConfig } from '../profile/profile.api';

export function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: getHealth,
  });
  const llmConfigQuery = useQuery({
    queryKey: ['llm-config'],
    queryFn: getLlmConfig,
  });
  const llmConfig = llmConfigQuery.data;

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <p>星图管理员控制面板</p>
        <h1>服务端模型能力管理</h1>
        <span>集中管理业务后端的 LLM 中转、上游密钥与 Agent 运行策略。</span>
      </section>

      <div className="status-grid">
        <StatusCard
          title="后端服务"
          status={healthQuery.data?.status === 'ok' ? '正常' : '待确认'}
          tone={healthQuery.data?.status === 'ok' ? 'success' : 'warning'}
          description={
            healthQuery.error
              ? healthQuery.error.message
              : '通过健康检查确认业务后端当前可用。'
          }
          onRefresh={() => healthQuery.refetch()}
        />
        <StatusCard
          title="LLM 中转"
          status={llmConfig?.enabled ? '已启用' : '未启用'}
          tone={llmConfig?.enabled ? 'success' : 'warning'}
          description={
            llmConfigQuery.error
              ? llmConfigQuery.error.message
              : '已登录用户的 OpenAI-compatible 请求由业务后端统一转发。'
          }
          onRefresh={() => llmConfigQuery.refetch()}
        />
      </div>

      <SectionCard title="能力边界" description="控制台只面向管理员，普通用户不会接触上游模型密钥。">
        <ul className="capability-list">
          <li>前端向业务后端发送标准 OpenAI-compatible 请求。</li>
          <li>业务后端使用全局 API Base 和 API Key 请求上游模型服务。</li>
          <li>Agent 能力由服务端运行时承载，工具权限按后端策略开放。</li>
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
