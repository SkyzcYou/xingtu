import { Button } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';

export function SettingsPage() {
  return (
    <div className="page-stack">
      <SectionCard title="管理员设置" description="这里用于后续配置管理员权限、操作策略和敏感字段安全策略。">
        <div className="settings-placeholder">
          <h2>管理员配置能力待后端接口补齐</h2>
          <p>
            后续管理员 API 完成后，这里会承载访问控制、API Key 脱敏策略、审计保留周期等后台设置。
          </p>
          <Button disabled>保存管理配置</Button>
        </div>
      </SectionCard>

      <SectionCard title="计划中的扩展项" description="控制面板结构已为这些管理员能力预留页面和数据层。">
        <ul className="capability-list">
          <li>管理员角色与访问控制。</li>
          <li>API Key 展示、编辑、脱敏和加密存储策略。</li>
          <li>账户/Profile 操作审计和异常排查。</li>
          <li>只管理星图内部账号配置，不扩展为通用密钥管理平台。</li>
        </ul>
      </SectionCard>
    </div>
  );
}
