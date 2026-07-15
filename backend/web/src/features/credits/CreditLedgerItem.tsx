import { Tag } from 'tdesign-react';
import { type CreditLedgerEntry } from './credits.types';

const reasonLabels: Record<string, string> = {
  model_request: '模型调用',
  refund: '失败退款',
  admin_adjustment: '手动调整',
  payment_recharge: '充值入账',
  new_user_bonus: '新用户赠送',
};

export function CreditLedgerItem({ entry }: { entry: CreditLedgerEntry }) {
  return (
    <div className="credits-ledger-item">
      <strong className={entry.delta >= 0 ? 'credits-delta-positive' : 'credits-delta-negative'}>
        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
      </strong>
      <div>
        <Tag>{reasonLabels[entry.reason] ?? entry.reason}</Tag>
        <div className="credits-ledger-meta">{ledgerMeta(entry)} · 余额 {entry.balanceAfter}</div>
      </div>
      <span className="credits-ledger-meta">{formatDateTime(entry.createdAt)}</span>
    </div>
  );
}

function ledgerMeta(entry: CreditLedgerEntry): string {
  if (entry.reason === 'payment_recharge') {
    const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata as Record<string, unknown> : {};
    return `${String(metadata.packageId ?? '充值套餐')} · ${String(metadata.outTradeNo ?? entry.requestId ?? '')}`;
  }
  if (entry.reason === 'new_user_bonus') {
    return '一次性新用户奖励';
  }
  return entry.modelId || '手动调整';
}

function formatDateTime(value: string | null): string {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
