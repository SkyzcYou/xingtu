import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, Dialog } from 'tdesign-react';
import {
  createCreditRechargeOrder,
  getAccountCreditBalance,
  getCreditRechargeOrders,
  getCreditRechargePackages,
  queryCreditRechargeOrder,
  type CreateRechargeOrderResponse,
  type PayChannel,
  type PaymentOrder,
  type RechargePackage,
} from '../../services/account-credit-service';
import './credit-recharge-dialog.scss';

export interface CreditRechargeDialogProps {
  visible: boolean;
  compact?: boolean;
  initialBalance?: number | null;
  onClose: () => void;
  onRechargeSuccess?: () => void;
}

const creditFormatter = new Intl.NumberFormat('zh-CN');

const payChannelLabels: Record<PayChannel, string> = {
  alipay: '支付宝',
  wxpay: '微信支付',
};

export function CreditRechargeDialog({
  visible,
  compact = false,
  initialBalance = null,
  onClose,
  onRechargeSuccess,
}: CreditRechargeDialogProps) {
  const [payChannel, setPayChannel] = useState<PayChannel>('alipay');
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [latestOrder, setLatestOrder] = useState<CreateRechargeOrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingPackageId, setCreatingPackageId] = useState<string | null>(null);
  const [queryingOrderNo, setQueryingOrderNo] = useState<string | null>(null);

  const latestPaymentUrl = useMemo(
    () => getSafePaymentUrl(latestOrder?.payType ?? null, latestOrder?.payInfo ?? null),
    [latestOrder]
  );

  const loadDialogData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [balanceResult, packagesResult, ordersResult] = await Promise.all([
        getAccountCreditBalance(signal),
        getCreditRechargePackages(signal),
        getCreditRechargeOrders(signal),
      ]);
      setBalance(balanceResult.balance);
      setPackages(packagesResult.packages);
      setOrders(ordersResult.orders);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : '充值信息加载失败');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const refreshBalanceAndOrders = useCallback(async () => {
    const [balanceResult, ordersResult] = await Promise.all([
      getAccountCreditBalance(),
      getCreditRechargeOrders(),
    ]);
    setBalance(balanceResult.balance);
    setOrders(ordersResult.orders);
  }, []);

  const handleCreateOrder = useCallback(async (item: RechargePackage) => {
    setCreatingPackageId(item.id);
    setActionError(null);
    try {
      const result = await createCreditRechargeOrder({
        packageId: item.id,
        payChannel,
        device: getPaymentDevice(),
        returnUrl: buildProfileReturnUrl(),
      });
      setLatestOrder(result);
      await refreshBalanceAndOrders();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '充值订单创建失败');
    } finally {
      setCreatingPackageId(null);
    }
  }, [payChannel, refreshBalanceAndOrders]);

  const handleQueryOrder = useCallback(async (outTradeNo: string) => {
    setQueryingOrderNo(outTradeNo);
    setActionError(null);
    try {
      const updatedOrder = await queryCreditRechargeOrder(outTradeNo);
      setLatestOrder((current) => (
        current?.order.outTradeNo === outTradeNo
          ? { ...current, order: updatedOrder }
          : current
      ));
      await refreshBalanceAndOrders();
      if (updatedOrder.creditedAt) {
        onRechargeSuccess?.();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '支付状态查询失败');
    } finally {
      setQueryingOrderNo(null);
    }
  }, [onRechargeSuccess, refreshBalanceAndOrders]);

  const handleOpenPayment = useCallback(() => {
    if (!latestPaymentUrl) return;
    window.open(latestPaymentUrl, '_blank', 'noopener,noreferrer');
  }, [latestPaymentUrl]);

  useEffect(() => {
    if (!visible) return undefined;
    setBalance(initialBalance);
    setActionError(null);
    const controller = new AbortController();
    void loadDialogData(controller.signal);
    return () => controller.abort();
  }, [initialBalance, loadDialogData, visible]);

  return (
    <Dialog
      header="积分充值"
      visible={visible}
      onClose={onClose}
      footer={null}
      width={compact ? '92vw' : 680}
      className="credit-recharge-dialog"
    >
      <div className="credit-recharge-dialog__content">
        <section className="credit-recharge-dialog__summary" aria-label="当前积分余额">
          <div>
            <span>当前积分</span>
            <strong>{balance === null ? '--' : creditFormatter.format(balance)}</strong>
          </div>
          <Button variant="outline" size="small" onClick={() => void loadDialogData()} loading={loading}>
            <RefreshCw size={14} />
            刷新
          </Button>
        </section>

        {loadError && (
          <p className="credit-recharge-dialog__notice credit-recharge-dialog__notice--error" role="alert">
            {loadError}
          </p>
        )}

        <section className="credit-recharge-dialog__section" aria-label="支付方式">
          <div className="credit-recharge-dialog__section-title">选择支付方式</div>
          <div className="credit-recharge-dialog__pay-channels">
            {(['alipay', 'wxpay'] as PayChannel[]).map((channel) => (
              <button
                key={channel}
                type="button"
                className={channel === payChannel ? 'is-active' : ''}
                onClick={() => setPayChannel(channel)}
                aria-pressed={channel === payChannel}
              >
                <CreditCard size={16} />
                {payChannelLabels[channel]}
              </button>
            ))}
          </div>
        </section>

        <section className="credit-recharge-dialog__section" aria-label="充值套餐">
          <div className="credit-recharge-dialog__section-title">选择充值套餐</div>
          {loading && packages.length === 0 ? (
            <div className="credit-recharge-dialog__loading">正在加载套餐...</div>
          ) : (
            <div className="credit-recharge-dialog__packages">
              {packages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="credit-recharge-dialog__package"
                  onClick={() => void handleCreateOrder(item)}
                  disabled={Boolean(creatingPackageId)}
                >
                  <span>{item.name}</span>
                  <strong>{item.amount} 元</strong>
                  <em>{creditFormatter.format(item.credits)} 积分</em>
                  {creatingPackageId === item.id && <small>创建中...</small>}
                </button>
              ))}
            </div>
          )}
        </section>

        {latestOrder && (
          <LatestOrderPanel
            order={latestOrder.order}
            payInfo={latestOrder.payInfo}
            paymentUrl={latestPaymentUrl}
            querying={queryingOrderNo === latestOrder.order.outTradeNo}
            onOpenPayment={handleOpenPayment}
            onQuery={() => void handleQueryOrder(latestOrder.order.outTradeNo)}
          />
        )}

        <OrderList
          orders={orders}
          queryingOrderNo={queryingOrderNo}
          onQuery={(outTradeNo) => void handleQueryOrder(outTradeNo)}
        />

        {actionError && (
          <p className="credit-recharge-dialog__notice credit-recharge-dialog__notice--error" role="alert">
            {actionError}
          </p>
        )}
      </div>
    </Dialog>
  );
}

interface LatestOrderPanelProps {
  order: PaymentOrder;
  payInfo: string | null;
  paymentUrl: string | null;
  querying: boolean;
  onOpenPayment: () => void;
  onQuery: () => void;
}

function LatestOrderPanel({
  order,
  payInfo,
  paymentUrl,
  querying,
  onOpenPayment,
  onQuery,
}: LatestOrderPanelProps) {
  return (
    <section className="credit-recharge-dialog__result" aria-label="最新充值订单">
      <div className="credit-recharge-dialog__result-main">
        <span>最新订单</span>
        <strong>{order.outTradeNo}</strong>
        <p>{order.amount} 元 · {creditFormatter.format(order.creditAmount ?? 0)} 积分 · {getPaymentStatusText(order)}</p>
      </div>
      <div className="credit-recharge-dialog__result-actions">
        {paymentUrl && (
          <Button theme="primary" onClick={onOpenPayment}>
            <ExternalLink size={14} />
            前往支付
          </Button>
        )}
        <Button variant="outline" onClick={onQuery} loading={querying}>
          查询支付状态
        </Button>
      </div>
      {payInfo && !paymentUrl && (
        <pre className="credit-recharge-dialog__pay-info">{payInfo}</pre>
      )}
    </section>
  );
}

interface OrderListProps {
  orders: PaymentOrder[];
  queryingOrderNo: string | null;
  onQuery: (outTradeNo: string) => void;
}

function OrderList({ orders, queryingOrderNo, onQuery }: OrderListProps) {
  const recentOrders = orders.slice(0, 5);
  return (
    <section className="credit-recharge-dialog__section" aria-label="充值订单记录">
      <div className="credit-recharge-dialog__section-title">最近订单</div>
      {recentOrders.length === 0 ? (
        <div className="credit-recharge-dialog__empty">暂无充值订单</div>
      ) : (
        <div className="credit-recharge-dialog__orders">
          {recentOrders.map((order) => (
            <div key={order.outTradeNo} className="credit-recharge-dialog__order">
              <div>
                <strong>{order.name}</strong>
                <span>{order.outTradeNo}</span>
                <small>{order.amount} 元 · {creditFormatter.format(order.creditAmount ?? 0)} 积分 · {formatDateTime(order.createdAt)}</small>
              </div>
              <div className="credit-recharge-dialog__order-side">
                <em className={order.creditedAt ? 'is-paid' : ''}>{getPaymentStatusText(order)}</em>
                <Button
                  size="small"
                  variant="outline"
                  onClick={() => onQuery(order.outTradeNo)}
                  loading={queryingOrderNo === order.outTradeNo}
                >
                  查询
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getSafePaymentUrl(payType: string | null, payInfo: string | null): string | null {
  if (payType !== 'jump' || !payInfo) return null;
  try {
    const url = new URL(payInfo);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function buildProfileReturnUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('profilePanel', '1');
  return url.toString();
}

function getPaymentDevice(): string {
  return window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'pc';
}

function getPaymentStatusText(order: PaymentOrder): string {
  if (order.creditedAt) return '已入账';
  if (order.status === 'paid') return '已支付';
  if (order.status === 'failed') return '失败';
  if (order.status === 'refunded') return '已退款';
  if (order.status === 'frozen') return '已冻结';
  return '待支付';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default CreditRechargeDialog;
