import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { EmptyState } from '../../components/EmptyState';
import { PageError } from '../../components/PageError';
import { PageLoading } from '../../components/PageLoading';
import { SectionCard } from '../../components/SectionCard';
import {
  adjustCredits,
  createRechargeOrder,
  getCreditAccountDetail,
  getCreditAccounts,
  getCreditBalance,
  getCreditPrices,
  getRechargeOrders,
  getRechargePackages,
  queryPaymentOrder,
  updateCreditPrices,
} from './credits.api';
import {
  creditRequestTypes,
  type CreateRechargeOrderResponse,
  type CreditLedgerEntry,
  type CreditRequestType,
  type PayChannel,
  type PaymentOrder,
  type UpdateCreditPriceInput,
} from './credits.types';
import './CreditsPage.scss';

const requestTypeLabels: Record<CreditRequestType, string> = {
  chat: 'Chat',
  image_generation: '图片生成',
  image_edit: '图片编辑',
  agent: 'Agent',
};

const reasonLabels: Record<string, string> = {
  model_request: '模型调用',
  refund: '失败退款',
  admin_adjustment: '手动调整',
  payment_recharge: '充值入账',
};

export function CreditsPage() {
  const queryClient = useQueryClient();
  const [priceRows, setPriceRows] = useState<UpdateCreditPriceInput[]>([]);
  const [priceError, setPriceError] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [payChannel, setPayChannel] = useState<PayChannel>('alipay');
  const [latestOrder, setLatestOrder] = useState<CreateRechargeOrderResponse | null>(null);
  const [rechargeError, setRechargeError] = useState('');

  const pricesQuery = useQuery({ queryKey: ['credit-prices'], queryFn: getCreditPrices });
  const balanceQuery = useQuery({ queryKey: ['credit-balance'], queryFn: getCreditBalance });
  const packagesQuery = useQuery({ queryKey: ['recharge-packages'], queryFn: getRechargePackages });
  const ordersQuery = useQuery({ queryKey: ['recharge-orders'], queryFn: getRechargeOrders });
  const accountsQuery = useQuery({
    queryKey: ['credit-accounts', accountQuery],
    queryFn: () => getCreditAccounts(accountQuery),
  });
  const detailQuery = useQuery({
    queryKey: ['credit-account', selectedAccountId],
    queryFn: () => getCreditAccountDetail(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  useEffect(() => {
    if (!pricesQuery.data) return;
    setPriceRows(pricesQuery.data.prices.map(({ modelId, requestType, creditsPerRequest, enabled }) => ({
      modelId,
      requestType,
      creditsPerRequest,
      enabled,
    })));
  }, [pricesQuery.data]);

  useEffect(() => {
    if (selectedAccountId || !accountsQuery.data?.accounts.length) return;
    setSelectedAccountId(accountsQuery.data.accounts[0].principalId);
  }, [accountsQuery.data, selectedAccountId]);

  const savePricesMutation = useMutation({
    mutationFn: updateCreditPrices,
    onSuccess: () => {
      setPriceError('');
      void queryClient.invalidateQueries({ queryKey: ['credit-prices'] });
    },
    onError: (error) => setPriceError(error.message),
  });

  const createRechargeMutation = useMutation({
    mutationFn: (packageId: string) => createRechargeOrder({ packageId, payChannel, returnUrl: window.location.href }),
    onSuccess: (result) => {
      setLatestOrder(result);
      setRechargeError('');
      void queryClient.invalidateQueries({ queryKey: ['recharge-orders'] });
    },
    onError: (error) => setRechargeError(error.message),
  });

  const queryOrderMutation = useMutation({
    mutationFn: queryPaymentOrder,
    onSuccess: () => {
      setRechargeError('');
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['recharge-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });
      if (selectedAccountId) {
        void queryClient.invalidateQueries({ queryKey: ['credit-account', selectedAccountId] });
      }
    },
    onError: (error) => setRechargeError(error.message),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ principalId, delta, note }: { principalId: string; delta: number; note?: string }) =>
      adjustCredits(principalId, { delta, note }),
    onSuccess: () => {
      setAdjustDelta('');
      setAdjustNote('');
      setAdjustError('');
      void queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-account', selectedAccountId] });
    },
    onError: (error) => setAdjustError(error.message),
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const selectedDetail = detailQuery.data;
  const totalConfiguredModels = useMemo(() => new Set(priceRows.map((row) => row.modelId).filter(Boolean)).size, [priceRows]);

  if (pricesQuery.isLoading) {
    return <PageLoading text="正在加载积分配置" />;
  }

  if (pricesQuery.error) {
    return <PageError message={pricesQuery.error.message} onRetry={() => pricesQuery.refetch()} />;
  }

  function updatePriceRow(index: number, patch: Partial<UpdateCreditPriceInput>) {
    setPriceRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addPriceRow() {
    setPriceRows((current) => [...current, { modelId: '', requestType: 'chat', creditsPerRequest: 1, enabled: true }]);
  }

  function removePriceRow(index: number) {
    setPriceRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function handleSavePrices() {
    const prices = priceRows.map((row) => ({ ...row, modelId: row.modelId.trim() }));
    if (prices.some((row) => !row.modelId)) {
      setPriceError('模型 ID 不能为空');
      return;
    }
    if (prices.some((row) => row.creditsPerRequest < 0 || !Number.isInteger(row.creditsPerRequest))) {
      setPriceError('积分价格必须是非负整数');
      return;
    }
    savePricesMutation.mutate({ prices });
  }

  function handleAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccountId) return;
    const delta = Number(adjustDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      setAdjustError('调整值必须是非 0 整数');
      return;
    }
    adjustMutation.mutate({ principalId: selectedAccountId, delta, note: adjustNote.trim() || undefined });
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="积分系统"
        description="按模型和请求类型配置每次调用消耗的积分；用户余额不足时，后端会在代理入口拒绝请求。"
        action={<Button onClick={() => pricesQuery.refetch()}>刷新价格</Button>}
      >
        <div className="profile-summary">
          <div><span>当前余额</span><strong>{balanceQuery.data?.balance ?? '未加载'}</strong></div>
          <div><span>价格规则</span><strong>{priceRows.length}</strong></div>
          <div><span>覆盖模型</span><strong>{totalConfiguredModels}</strong></div>
        </div>
      </SectionCard>

      <SectionCard title="我的积分充值" description="选择固定套餐创建支付订单，支付成功后自动写入积分流水。">
        <div className="credits-toolbar">
          <select value={payChannel} onChange={(event) => setPayChannel(event.target.value as PayChannel)}>
            <option value="alipay">支付宝</option>
            <option value="wxpay">微信支付</option>
          </select>
          <Button onClick={() => balanceQuery.refetch()}>刷新余额</Button>
        </div>
        <div className="credits-package-grid">
          {(packagesQuery.data?.packages ?? []).map((item) => (
            <button key={item.id} className="credits-package-card" onClick={() => createRechargeMutation.mutate(item.id)}>
              <strong>{item.name}</strong>
              <span>{item.amount} 元</span>
              <em>{item.credits} 积分</em>
            </button>
          ))}
        </div>
        {latestOrder && (
          <div className="credits-pay-result">
            <strong>订单 {latestOrder.order.outTradeNo}</strong>
            <span>{latestOrder.order.amount} 元 · {latestOrder.order.creditAmount ?? 0} 积分 · {latestOrder.order.status}</span>
            {latestOrder.payInfo && <code>{latestOrder.payInfo}</code>}
            <Button onClick={() => queryOrderMutation.mutate(latestOrder.order.outTradeNo)} loading={queryOrderMutation.isPending}>查询支付状态</Button>
          </div>
        )}
        {rechargeError && <p className="form-error">{rechargeError}</p>}
        <RechargeOrders orders={ordersQuery.data?.orders ?? []} onQuery={(order) => queryOrderMutation.mutate(order.outTradeNo)} />
      </SectionCard>

      <SectionCard
        title="模型按次价格"
        description="未配置价格或已停用的模型会拒绝请求，避免绕过计费。"
        action={<Button theme="primary" onClick={handleSavePrices} loading={savePricesMutation.isPending}>保存价格</Button>}
      >
        <div className="credits-toolbar">
          <Button variant="outline" onClick={addPriceRow}>新增规则</Button>
          {priceError && <p className="form-error">{priceError}</p>}
        </div>
        {priceRows.length === 0 ? (
          <EmptyState title="暂无价格规则" description="添加模型价格后，用户请求才会被允许扣费转发。" />
        ) : (
          <table className="credits-table">
            <thead><tr><th>模型 ID</th><th>请求类型</th><th>每次积分</th><th>启用</th><th>操作</th></tr></thead>
            <tbody>
              {priceRows.map((row, index) => (
                <tr key={`${row.modelId}-${row.requestType}-${index}`}>
                  <td><input value={row.modelId} onChange={(event) => updatePriceRow(index, { modelId: event.target.value })} /></td>
                  <td>
                    <select value={row.requestType} onChange={(event) => updatePriceRow(index, { requestType: event.target.value as CreditRequestType })}>
                      {creditRequestTypes.map((type) => <option key={type} value={type}>{requestTypeLabels[type]}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0" value={row.creditsPerRequest} onChange={(event) => updatePriceRow(index, { creditsPerRequest: Number(event.target.value) })} /></td>
                  <td><input type="checkbox" checked={row.enabled} onChange={(event) => updatePriceRow(index, { enabled: event.target.checked })} /></td>
                  <td><Button variant="text" onClick={() => removePriceRow(index)}>删除</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <div className="credits-grid">
        <SectionCard title="用户积分" description="搜索已登录过的 IAM 用户，并查看或调整余额。">
          <div className="credits-toolbar">
            <input className="credits-search" placeholder="搜索 subject、昵称或邮箱" value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} />
            <Button onClick={() => accountsQuery.refetch()}>搜索</Button>
          </div>
          {accountsQuery.isLoading ? <PageLoading text="正在加载用户" /> : null}
          {accountsQuery.error ? <PageError message={accountsQuery.error.message} onRetry={() => accountsQuery.refetch()} /> : null}
          {!accountsQuery.isLoading && accounts.length === 0 ? (
            <EmptyState title="暂无用户" description="用户完成一次鉴权请求后会自动出现在这里。" />
          ) : (
            <div className="credits-account-list">
              {accounts.map((account) => (
                <button key={account.principalId} className="credits-account-item" data-active={account.principalId === selectedAccountId} onClick={() => setSelectedAccountId(account.principalId)}>
                  <strong>{account.displayName || account.email || account.trustSubject}</strong>
                  <span>{account.email || account.trustSubject}</span>
                  <span>余额：{account.balance}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="余额与流水" description="管理员调整余额会写入不可变流水。">
          {!selectedAccountId ? (
            <EmptyState title="未选择用户" description="请先从左侧选择一个用户。" />
          ) : detailQuery.isLoading ? (
            <PageLoading text="正在加载流水" />
          ) : detailQuery.error ? (
            <PageError message={detailQuery.error.message} onRetry={() => detailQuery.refetch()} />
          ) : selectedDetail ? (
            <>
              <div className="credits-balance">{selectedDetail.account.balance}</div>
              <p className="muted-text">最近登录：{formatDateTime(selectedDetail.account.lastLoginAt)}</p>
              <form className="credits-adjust-form" onSubmit={handleAdjust}>
                <input type="number" placeholder="调整值，例如 100 或 -10" value={adjustDelta} onChange={(event) => setAdjustDelta(event.target.value)} />
                <input placeholder="备注" value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} />
                <Button theme="primary" type="submit" loading={adjustMutation.isPending}>调整</Button>
              </form>
              {adjustError && <p className="form-error">{adjustError}</p>}
              <div className="credits-ledger-list">
                {selectedDetail.ledger.map((entry) => <LedgerItem key={entry.id} entry={entry} />)}
              </div>
            </>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}

function RechargeOrders({ orders, onQuery }: { orders: PaymentOrder[]; onQuery: (order: PaymentOrder) => void }) {
  if (orders.length === 0) return null;
  return (
    <div className="credits-order-list">
      {orders.map((order) => (
        <div key={order.outTradeNo} className="credits-order-item">
          <strong>{order.outTradeNo}</strong>
          <span>{order.name} · {order.amount} 元 · {order.creditAmount ?? 0} 积分</span>
          <Tag>{order.status}{order.creditedAt ? ' · 已入账' : ''}</Tag>
          <Button variant="text" onClick={() => onQuery(order)}>查询</Button>
        </div>
      ))}
    </div>
  );
}

function LedgerItem({ entry }: { entry: CreditLedgerEntry }) {
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
