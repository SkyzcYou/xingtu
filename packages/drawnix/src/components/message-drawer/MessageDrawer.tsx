import React, { useCallback, useEffect } from 'react';
import { BaseDrawer } from '../side-drawer';
import {
  markAllMessageCenterItemsRead,
  markMessageCenterItemRead,
  refreshMessageCenter,
  useMessageCenter,
} from '../../hooks/use-message-center';
import type { MessageCenterItem } from '../../services/message-center-service';
import './message-drawer.scss';

export interface MessageDrawerProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MESSAGE_DRAWER_WIDTH_KEY = 'message-drawer-width';

const WECHAT_QR_CODE_URL = './logo/wechat-qr.jpg';
const RED_QR_CODE_URL = './red-qr.png';

const KIND_LABELS: Record<MessageCenterItem['kind'], string> = {
  update: '更新',
  notice: '通知',
  activity: '活动',
  maintenance: '维护',
};

export const MessageDrawer: React.FC<MessageDrawerProps> = ({
  isOpen = false,
  onOpenChange,
}) => {
  const { messages, unreadCount, loading, error } = useMessageCenter();

  useEffect(() => {
    if (isOpen) {
      void refreshMessageCenter();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleRefresh = useCallback(() => {
    void refreshMessageCenter();
  }, []);

  const handleMarkAllRead = useCallback(() => {
    void markAllMessageCenterItemsRead();
  }, []);

  const handleMessageClick = useCallback((message: MessageCenterItem) => {
    if (!message.readAt) {
      void markMessageCenterItemRead(message.id);
    }
  }, []);

  return (
    <BaseDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="消息中心"
      position="toolbar-right"
      width="narrow"
      defaultWidth={380}
      storageKey={MESSAGE_DRAWER_WIDTH_KEY}
      resizable={true}
      className="message-drawer"
      contentClassName="message-drawer__content"
      data-testid="message-drawer"
    >
      <div className="message-drawer__feedback">
        <div className="message-drawer__feedback-title">用户反馈群</div>
        <div className="message-drawer__feedback-qrcodes">
          <img
            src={WECHAT_QR_CODE_URL}
            alt="用户反馈群二维码"
            className="message-drawer__feedback-qrcode"
          />
          <img
            src={RED_QR_CODE_URL}
            alt="小红书二维码"
            className="message-drawer__feedback-qrcode"
          />
        </div>
        <div className="message-drawer__feedback-desc">
          扫码加入用户反馈群，获取更新通知并反馈建议。
        </div>
      </div>

      <div className="message-drawer__toolbar">
        <span>{unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读消息'}</span>
        <div>
          <button type="button" onClick={handleRefresh}>刷新</button>
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllRead}>全部已读</button>
          )}
        </div>
      </div>

      {loading && messages.length === 0 ? (
        <div className="message-drawer__empty">正在加载消息...</div>
      ) : error ? (
        <div className="message-drawer__empty">
          <span>{error}</span>
          <button type="button" onClick={handleRefresh}>重试</button>
        </div>
      ) : messages.length === 0 ? (
        <div className="message-drawer__empty">暂无消息</div>
      ) : (
        <div className="message-drawer__list">
          {messages.map((message) => (
            <article
              className="message-drawer__item"
              data-unread={!message.readAt}
              key={message.id}
              onClick={() => handleMessageClick(message)}
            >
              <div className="message-drawer__item-header">
                <div>
                  <span className="message-drawer__kind">{KIND_LABELS[message.kind]}</span>
                  <h3 className="message-drawer__title">{message.title}</h3>
                </div>
                <span className="message-drawer__time">{formatMessageTime(message)}</span>
              </div>
              <p className="message-drawer__content-text">{message.content}</p>
              {message.linkUrl && (
                <a
                  className="message-drawer__link"
                  href={message.linkUrl}
                  target={message.linkUrl.startsWith('http') ? '_blank' : undefined}
                  rel={message.linkUrl.startsWith('http') ? 'noreferrer' : undefined}
                  onClick={(event) => event.stopPropagation()}
                >
                  {message.linkLabel || '查看详情'}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </BaseDrawer>
  );
};

function formatMessageTime(message: MessageCenterItem): string {
  const value = message.publishAt || message.createdAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default MessageDrawer;
