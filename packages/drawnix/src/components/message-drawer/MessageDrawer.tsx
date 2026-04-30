import React, { useCallback } from 'react';
import { BaseDrawer } from '../side-drawer';
import './message-drawer.scss';

export interface MessageDrawerProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MessageItem {
  id: string;
  title: string;
  content: string;
  time: string;
}

export const MESSAGE_DRAWER_WIDTH_KEY = 'message-drawer-width';

const WECHAT_QR_CODE_URL = './logo/wechat-qr.jpg';
const RED_QR_CODE_URL = './red-qr.png';

const MESSAGES: MessageItem[] = [
  {
    id: 'welcome',
    title: '欢迎使用星图',
    content: '这里会展示产品更新、活动通知和重要提醒。',
    time: '刚刚',
  },
  {
    id: 'updates',
    title: '消息中心已上线',
    content: '产品更新、活动通知和重要提醒会在这里集中展示。',
    time: '今天',
  },
];

export const MessageDrawer: React.FC<MessageDrawerProps> = ({
  isOpen = false,
  onOpenChange,
}) => {
  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

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

      {MESSAGES.length === 0 ? (
        <div className="message-drawer__empty">暂无消息</div>
      ) : (
        <div className="message-drawer__list">
          {MESSAGES.map((message) => (
            <article className="message-drawer__item" key={message.id}>
              <div className="message-drawer__item-header">
                <h3 className="message-drawer__title">{message.title}</h3>
                <span className="message-drawer__time">{message.time}</span>
              </div>
              <p className="message-drawer__content-text">{message.content}</p>
            </article>
          ))}
        </div>
      )}
    </BaseDrawer>
  );
};

export default MessageDrawer;
