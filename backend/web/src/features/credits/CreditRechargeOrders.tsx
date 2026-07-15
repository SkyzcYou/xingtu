import { Button, Tag } from 'tdesign-react';
import { type PaymentOrder } from './credits.types';

interface CreditRechargeOrdersProps {
  orders: PaymentOrder[];
  onQuery: (order: PaymentOrder) => void;
}

export function CreditRechargeOrders({ orders, onQuery }: CreditRechargeOrdersProps) {
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
