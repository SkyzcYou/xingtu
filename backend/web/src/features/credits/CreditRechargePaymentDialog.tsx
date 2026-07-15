import { useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Dialog, MessagePlugin } from 'tdesign-react';
import { Copy, ExternalLink } from 'lucide-react';
import { type CreateRechargeOrderResponse, type PaymentOrder } from './credits.types';

interface CreditRechargePaymentDialogProps {
  visible: boolean;
  latestOrder: CreateRechargeOrderResponse | null;
  polling: boolean;
  querying: boolean;
  onClose: () => void;
  onQuery: (outTradeNo: string) => void;
}

type PaymentAction =
  | { kind: 'jump'; url: string }
  | { kind: 'cashier_url'; url: string };

export function CreditRechargePaymentDialog({
  visible,
  latestOrder,
  polling,
  querying,
  onClose,
  onQuery,
}: CreditRechargePaymentDialogProps) {
  const paymentAction = useMemo(
    () => getPaymentAction(latestOrder?.payType ?? null, latestOrder?.payInfo ?? null),
    [latestOrder]
  );
  const order = latestOrder?.order ?? null;

  const handleOpenPayment = useCallback(() => {
    if (!paymentAction) return;
    window.open(paymentAction.url, '_blank', 'noopener,noreferrer');
  }, [paymentAction]);

  const handleCopyPaymentUrl = useCallback(async () => {
    if (!paymentAction) return;
    try {
      await navigator.clipboard.writeText(paymentAction.url);
      void MessagePlugin.success('支付链接已复制');
    } catch {
      void MessagePlugin.error('复制失败');
    }
  }, [paymentAction]);

  const handleQuery = useCallback(() => {
    if (!order) return;
    onQuery(order.outTradeNo);
  }, [onQuery, order]);

  return (
    <Dialog
      header="充值支付"
      visible={visible}
      onClose={onClose}
      footer={null}
      width={520}
      destroyOnClose={false}
    >
      <div className="credits-payment-dialog-content">
        {order ? (
          <>
            <PaymentOrderSummary order={order} />

            {paymentAction ? (
              <CashierUrlPaymentPanel
                action={paymentAction}
                onCopy={handleCopyPaymentUrl}
                onOpen={handleOpenPayment}
              />
            ) : (
              <PayInfoFallback payInfo={latestOrder?.payInfo ?? null} />
            )}

            <div className="credits-payment-actions">
              <Button variant="outline" onClick={handleQuery} loading={querying}>
                查询支付状态
              </Button>
              <Button variant="outline" onClick={onClose}>关闭</Button>
            </div>

            {polling && (
              <p className="credits-payment-polling" role="status" aria-live="polite">
                正在自动查询支付状态...
              </p>
            )}
          </>
        ) : (
          <p className="muted-text">暂无待支付订单</p>
        )}
      </div>
    </Dialog>
  );
}

function PaymentOrderSummary({ order }: { order: PaymentOrder }) {
  return (
    <div className="credits-payment-main">
      <span>订单号</span>
      <strong>{order.outTradeNo}</strong>
      <p>{order.amount} 元 · {order.creditAmount ?? 0} 积分 · {getPaymentStatusText(order)}</p>
    </div>
  );
}

interface CashierUrlPaymentPanelProps {
  action: PaymentAction;
  onCopy: () => void;
  onOpen: () => void;
}

function CashierUrlPaymentPanel({ action, onCopy, onOpen }: CashierUrlPaymentPanelProps) {
  const host = useMemo(() => {
    try {
      return new URL(action.url).host;
    } catch {
      return '';
    }
  }, [action.url]);
  const title = action.kind === 'cashier_url' ? '扫码打开 NoiPay 收银台' : '扫码打开支付页面';

  return (
    <div className="credits-qr-payment" aria-label="支付二维码">
      <div className="credits-qr-card">
        <QRCodeSVG
          value={action.url}
          size={224}
          level="M"
          marginSize={4}
          title="支付二维码"
        />
      </div>
      <div className="credits-qr-help">
        <strong>{title}</strong>
        <p>请使用支付宝或微信扫码完成支付。支付后保持窗口打开，系统会自动更新积分。</p>
        {host && <span>支付域名：{host}</span>}
      </div>
      <div className="credits-payment-actions">
        <Button variant="outline" onClick={onCopy}>
          <Copy size={14} />
          复制链接
        </Button>
        <Button variant="outline" onClick={onOpen}>
          <ExternalLink size={14} />
          打开支付页面
        </Button>
      </div>
    </div>
  );
}

function PayInfoFallback({ payInfo }: { payInfo: string | null }) {
  if (!payInfo) {
    return <p className="muted-text">当前订单未返回支付链接，请稍后查询订单状态。</p>;
  }
  return <pre className="credits-pay-info-fallback">{payInfo}</pre>;
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

function getPaymentStatusText(order: PaymentOrder): string {
  if (order.creditedAt) return '已入账';
  if (order.status === 'paid') return '已支付';
  if (order.status === 'failed') return '失败';
  if (order.status === 'refunded') return '已退款';
  if (order.status === 'frozen') return '已冻结';
  return '待支付';
}
