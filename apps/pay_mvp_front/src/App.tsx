import { FormEvent, useMemo, useState } from 'react';
import {
  createOrder,
  getOrder,
  queryRemoteOrder,
  type CreateOrderResponse,
  type PaymentOrder,
} from './api';

const returnedOutTradeNo = new URLSearchParams(window.location.search).get(
  'out_trade_no'
);

export default function App() {
  const [name, setName] = useState('星图测试订单');
  const [amount, setAmount] = useState('1.00');
  const [payChannel, setPayChannel] = useState('alipay');
  const [created, setCreated] = useState<CreateOrderResponse | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOrder = order || created?.order || null;
  const returnUrl = useMemo(() => window.location.origin, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await createOrder({
        name,
        amount,
        pay_channel: payChannel,
        return_url: returnUrl,
      });
      setCreated(response);
      setOrder(response.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshLocalOrder = async () => {
    if (!activeOrder && !returnedOutTradeNo) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getOrder(
        activeOrder?.out_trade_no || returnedOutTradeNo || ''
      );
      setOrder(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询订单失败');
    } finally {
      setLoading(false);
    }
  };

  const queryRemote = async () => {
    if (!activeOrder && !returnedOutTradeNo) return;
    setLoading(true);
    setError(null);
    try {
      const response = await queryRemoteOrder(
        activeOrder?.out_trade_no || returnedOutTradeNo || ''
      );
      setOrder(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '远程查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="hero__eyebrow">Qingke Pay MVP</p>
        <h1>青科支付独立接入验证</h1>
        <p className="hero__description">
          这个页面只连接新建的支付后端，不接入星图主应用。前端负责创建订单、跳转支付和查询状态；签名、验签、回调入账都在后端完成。
        </p>
      </section>

      {returnedOutTradeNo && (
        <div className="notice">
          已从支付页面返回，订单号：<strong>{returnedOutTradeNo}</strong>。
          页面返回不代表支付成功，请刷新本地状态或查询青科订单状态确认。
        </div>
      )}

      <section className="grid">
        <form className="card form" onSubmit={handleSubmit}>
          <h2>创建测试订单</h2>
          <div className="field">
            <label htmlFor="name">商品名称</label>
            <input
              id="name"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="amount">金额（元）</label>
            <input
              id="amount"
              value={amount}
              inputMode="decimal"
              pattern={'^[0-9]+(\\.[0-9]{1,2})?$'}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="payChannel">支付方式</label>
            <select
              id="payChannel"
              value={payChannel}
              onChange={(event) => setPayChannel(event.target.value)}
            >
              <option value="alipay">支付宝</option>
              <option value="wxpay">微信支付</option>
            </select>
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? '处理中...' : '创建并获取支付链接'}
          </button>
          {error && <div className="error">{error}</div>}
        </form>

        <section className="card">
          <h2>订单状态</h2>
          {activeOrder ? (
            <OrderPanel
              order={activeOrder}
              payType={created?.pay_type || null}
              payInfo={created?.pay_info || null}
              loading={loading}
              onRefresh={refreshLocalOrder}
              onRemoteQuery={queryRemote}
            />
          ) : (
            <p className="empty">
              还没有订单。创建订单后，这里会显示本地订单状态和青科返回的支付信息。
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

interface OrderPanelProps {
  order: PaymentOrder;
  payType: string | null;
  payInfo: string | null;
  loading: boolean;
  onRefresh: () => void;
  onRemoteQuery: () => void;
}

function OrderPanel({
  order,
  payType,
  payInfo,
  loading,
  onRefresh,
  onRemoteQuery,
}: OrderPanelProps) {
  const canOpenPay = Boolean(payInfo && /^https?:\/\//.test(payInfo));

  return (
    <div className="order-box">
      <div className="kv">
        <span>商户订单号</span>
        <code>{order.out_trade_no}</code>
      </div>
      <div className="kv">
        <span>商品</span>
        <strong>{order.name}</strong>
      </div>
      <div className="kv">
        <span>金额</span>
        <strong>¥{order.amount}</strong>
      </div>
      <div className="kv">
        <span>支付方式</span>
        <strong>{order.pay_channel === 'alipay' ? '支付宝' : '微信支付'}</strong>
      </div>
      <div className="kv">
        <span>状态</span>
        <span className={`status status--${order.status}`}>{order.status}</span>
      </div>
      {order.qingke_trade_no && (
        <div className="kv">
          <span>平台订单号</span>
          <code>{order.qingke_trade_no}</code>
        </div>
      )}
      {payType && (
        <div className="kv">
          <span>pay_type</span>
          <code>{payType}</code>
        </div>
      )}
      {payInfo && (
        <div className="kv">
          <span>pay_info</span>
          <code className="pay-info">{payInfo}</code>
        </div>
      )}
      <div className="actions">
        {canOpenPay && (
          <a className="pay-link" href={payInfo || '#'} rel="noreferrer">
            前往支付
          </a>
        )}
        <button className="secondary-button" onClick={onRefresh} disabled={loading}>
          刷新本地状态
        </button>
        <button
          className="secondary-button"
          onClick={onRemoteQuery}
          disabled={loading}
        >
          查询青科状态
        </button>
      </div>
    </div>
  );
}
