import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, Dialog, MessagePlugin } from '../../utils/tdesign';
import {
  createCreditRechargeOrder,
  getAccountCreditBalance,
  getCreditRechargePackages,
  queryCreditRechargeOrder,
  type CreateRechargeOrderResponse,
  type PayChannel,
  type PaymentOrder,
  type RechargePackage,
} from '../../services/account-credit-service';
import { copyToClipboard } from '../../utils/runtime-helpers';
import './credit-recharge-dialog.scss';

export interface CreditRechargeDialogProps {
  visible: boolean;
  compact?: boolean;
  initialBalance?: number | null;
  onClose: () => void;
  onRechargeSuccess?: () => void;
}

type PaymentAction =
  | { kind: 'jump'; url: string }
  | { kind: 'cashier_url'; url: string };

const creditFormatter = new Intl.NumberFormat('zh-CN');
const ORDER_POLL_INTERVAL_MS = 5000;

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
  const [latestOrder, setLatestOrder] = useState<CreateRechargeOrderResponse | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [queryingOrderNo, setQueryingOrderNo] = useState<string | null>(null);
  const successNotifiedOrderNoRef = useRef<string | null>(null);

  const latestPaymentAction = useMemo(
    () => getPaymentAction(latestOrder?.payType ?? null, latestOrder?.payInfo ?? null),
    [latestOrder]
  );
  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );
  const latestOrderPolling = latestOrder ? shouldPollOrder(latestOrder.order) : false;

  const loadDialogData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [balanceResult, packagesResult] = await Promise.all([
        getAccountCreditBalance(signal),
        getCreditRechargePackages(signal),
      ]);
      setBalance(balanceResult.balance);
      setPackages(packagesResult.packages);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : '充值信息加载失败');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    const balanceResult = await getAccountCreditBalance();
    setBalance(balanceResult.balance);
  }, []);

  const notifyRechargeSuccess = useCallback((order: PaymentOrder) => {
    if (!order.creditedAt || successNotifiedOrderNoRef.current === order.outTradeNo) return;
    successNotifiedOrderNoRef.current = order.outTradeNo;
    void MessagePlugin.success('充值已入账');
    onRechargeSuccess?.();
  }, [onRechargeSuccess]);

  const refreshOrderStatus = useCallback(async (
    outTradeNo: string,
    options?: { manual?: boolean; signal?: AbortSignal; silent?: boolean }
  ) => {
    if (options?.manual) {
      setQueryingOrderNo(outTradeNo);
      setActionError(null);
    }

    try {
      const updatedOrder = await queryCreditRechargeOrder(outTradeNo, options?.signal);
      setLatestOrder((current) => (
        current?.order.outTradeNo === outTradeNo
          ? { ...current, order: updatedOrder }
          : current
      ));
      await refreshBalance();
      notifyRechargeSuccess(updatedOrder);
    } catch (error) {
      if (!options?.silent && !options?.signal?.aborted) {
        setActionError(error instanceof Error ? error.message : '支付状态查询失败');
      }
    } finally {
      if (options?.manual) {
        setQueryingOrderNo(null);
      }
    }
  }, [notifyRechargeSuccess, refreshBalance]);

  const handleCreateOrder = useCallback(async () => {
    if (!selectedPackage) {
      setActionError('请先选择充值套餐');
      return;
    }
    setCreatingOrder(true);
    setActionError(null);
    try {
      const result = await createCreditRechargeOrder({
        packageId: selectedPackage.id,
        payChannel,
        device: getPaymentDevice(),
        returnUrl: buildProfileReturnUrl(),
      });
      successNotifiedOrderNoRef.current = null;
      setLatestOrder(result);
      await refreshBalance();
      notifyRechargeSuccess(result.order);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '充值订单创建失败');
    } finally {
      setCreatingOrder(false);
    }
  }, [notifyRechargeSuccess, payChannel, refreshBalance, selectedPackage]);

  const handleQueryOrder = useCallback(async (outTradeNo: string) => {
    await refreshOrderStatus(outTradeNo, { manual: true });
  }, [refreshOrderStatus]);

  const handleOpenPayment = useCallback(() => {
    if (!latestPaymentAction) return;
    window.open(latestPaymentAction.url, '_blank', 'noopener,noreferrer');
  }, [latestPaymentAction]);

  const handleCopyPaymentUrl = useCallback(async () => {
    if (!latestPaymentAction) return;
    try {
      await copyToClipboard(latestPaymentAction.url);
      void MessagePlugin.success('支付链接已复制');
    } catch {
      void MessagePlugin.error('复制失败');
    }
  }, [latestPaymentAction]);

  useEffect(() => {
    if (!visible) return undefined;
    setBalance(initialBalance);
    setActionError(null);
    const controller = new AbortController();
    void loadDialogData(controller.signal);
    return () => controller.abort();
  }, [initialBalance, loadDialogData, visible]);

  useEffect(() => {
    if (!selectedPackageId && packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

  useEffect(() => {
    if (!visible || !latestOrder || !shouldPollOrder(latestOrder.order)) return undefined;

    const outTradeNo = latestOrder.order.outTradeNo;
    const controller = new AbortController();
    let stopped = false;
    let inFlight = false;

    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        await refreshOrderStatus(outTradeNo, {
          signal: controller.signal,
          silent: true,
        });
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [
    latestOrder?.order.creditedAt,
    latestOrder?.order.outTradeNo,
    latestOrder?.order.status,
    latestOrder,
    refreshOrderStatus,
    visible,
  ]);

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

        <section className="credit-recharge-dialog__section" aria-label="充值套餐">
          <div className="credit-recharge-dialog__section-title">1. 选择充值套餐</div>
          {loading && packages.length === 0 ? (
            <div className="credit-recharge-dialog__loading">正在加载套餐...</div>
          ) : (
            <div className="credit-recharge-dialog__packages">
              {packages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedPackageId
                    ? 'credit-recharge-dialog__package is-active'
                    : 'credit-recharge-dialog__package'}
                  onClick={() => setSelectedPackageId(item.id)}
                  aria-pressed={item.id === selectedPackageId}
                >
                  <span>{item.name}</span>
                  <strong>{item.amount} 元</strong>
                  <em>{creditFormatter.format(item.credits)} 积分</em>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="credit-recharge-dialog__section" aria-label="支付方式">
          <div className="credit-recharge-dialog__section-title">2. 选择支付方式</div>
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

        <section className="credit-recharge-dialog__submit" aria-label="提交充值订单">
          <div>
            <span>3. 确认支付</span>
            <strong>
              {selectedPackage
                ? `${selectedPackage.amount} 元 · ${creditFormatter.format(selectedPackage.credits)} 积分`
                : '请选择套餐'}
            </strong>
          </div>
          <Button
            variant="outline"
            className="credit-recharge-dialog__pay-button"
            onClick={() => void handleCreateOrder()}
            loading={creatingOrder}
            disabled={!selectedPackage || loading}
          >
            立即支付
          </Button>
        </section>

        {latestOrder && (
          <LatestOrderPanel
            order={latestOrder.order}
            payInfo={latestOrder.payInfo}
            paymentAction={latestPaymentAction}
            polling={latestOrderPolling}
            querying={queryingOrderNo === latestOrder.order.outTradeNo}
            onCopyPayment={handleCopyPaymentUrl}
            onOpenPayment={handleOpenPayment}
            onQuery={() => void handleQueryOrder(latestOrder.order.outTradeNo)}
          />
        )}

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
  paymentAction: PaymentAction | null;
  polling: boolean;
  querying: boolean;
  onCopyPayment: () => void;
  onOpenPayment: () => void;
  onQuery: () => void;
}

function LatestOrderPanel({
  order,
  payInfo,
  paymentAction,
  polling,
  querying,
  onCopyPayment,
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

      {paymentAction?.kind === 'cashier_url' && (
        <CashierUrlPaymentPanel
          url={paymentAction.url}
          onCopy={onCopyPayment}
          onOpen={onOpenPayment}
        />
      )}

      <div className="credit-recharge-dialog__result-actions">
        {paymentAction?.kind === 'jump' && (
          <Button variant="outline" className="credit-recharge-dialog__pay-button" onClick={onOpenPayment}>
            <ExternalLink size={14} />
            前往支付
          </Button>
        )}
        <Button variant="outline" onClick={onQuery} loading={querying}>
          查询支付状态
        </Button>
      </div>

      {polling && (
        <p className="credit-recharge-dialog__polling-status" role="status" aria-live="polite">
          正在自动查询支付状态...
        </p>
      )}

      {payInfo && !paymentAction && (
        <pre className="credit-recharge-dialog__pay-info">{payInfo}</pre>
      )}
    </section>
  );
}

interface CashierUrlPaymentPanelProps {
  url: string;
  onCopy: () => void;
  onOpen: () => void;
}

function CashierUrlPaymentPanel({ url, onCopy, onOpen }: CashierUrlPaymentPanelProps) {
  const host = useMemo(() => {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }, [url]);

  return (
    <div className="credit-recharge-dialog__qr-payment" aria-label="NoiPay 收银台二维码">
      <div className="credit-recharge-dialog__qr-card">
        <QRCodeSVG
          value={url}
          size={224}
          level="M"
          marginSize={4}
          title="NoiPay 收银台二维码"
        />
      </div>
      <div className="credit-recharge-dialog__qr-help">
        <strong>扫码打开 NoiPay 收银台</strong>
        <p>请使用支付宝或微信扫码完成支付。支付后保持窗口打开，系统会自动更新积分。</p>
        {host && <span>支付域名：{host}</span>}
      </div>
      <div className="credit-recharge-dialog__result-actions credit-recharge-dialog__qr-actions">
        <Button variant="outline" onClick={onCopy}>
          <Copy size={14} />
          复制链接
        </Button>
        <Button variant="outline" className="credit-recharge-dialog__pay-button" onClick={onOpen}>
          <ExternalLink size={14} />
          打开收银台
        </Button>
      </div>
    </div>
  );
}

function getPaymentAction(payType: string | null, payInfo: string | null): PaymentAction | null {
  if ((payType !== 'jump' && payType !== 'cashier_url') || !payInfo) return null;
  try {
    const url = new URL(payInfo);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? { kind: payType, url: url.toString() }
      : null;
  } catch {
    return null;
  }
}

function shouldPollOrder(order: PaymentOrder): boolean {
  if (order.creditedAt) return false;
  return !['failed', 'refunded', 'frozen'].includes(order.status);
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

export default CreditRechargeDialog;
