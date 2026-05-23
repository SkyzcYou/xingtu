import { useQuery } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { getHealth } from '../profile/profile.api';

export function SyncPage() {
  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: getHealth,
  });

  return (
    <div className="page-stack">
      <SectionCard title="同步与审计" description="管理员视角下，这里用于观察账户配置同步、变更记录和异常。">
        <div className="sync-steps">
          <SyncStep
            title="后端连接"
            status={healthQuery.data?.status === 'ok' ? '正常' : '待确认'}
            done={healthQuery.data?.status === 'ok'}
            detail={healthQuery.error?.message || '检查 /health 接口。'}
          />
          <SyncStep
            title="配置变更审计"
            status="待接入"
            done={false}
            detail="后端需要提供管理员审计日志接口，用于查看 API Profile 创建、更新、启停和默认配置切换。"
          />
          <SyncStep
            title="跨设备同步观察"
            status="待接入"
            done={false}
            detail="后端需要记录账户配置的最近同步时间、来源设备和结果，供管理员排查问题。"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="手动刷新"
        description="当前只能刷新后端健康状态；审计和同步数据等待管理员 API。"
        action={
          <Button variant="outline" onClick={() => healthQuery.refetch()}>
            重新检查
          </Button>
        }
      >
        <p className="muted-text">
          普通用户的配置使用范围仅在星图主应用内；这里是后台观察和管理入口。
        </p>
      </SectionCard>
    </div>
  );
}

interface SyncStepProps {
  title: string;
  status: string;
  done: boolean;
  detail: string;
}

function SyncStep({ title, status, done, detail }: SyncStepProps) {
  return (
    <div className="sync-step">
      <div className="sync-step__marker" data-done={done} />
      <div>
        <header>
          <strong>{title}</strong>
          <Tag theme={done ? 'success' : 'warning'}>{status}</Tag>
        </header>
        <p>{detail}</p>
      </div>
    </div>
  );
}
