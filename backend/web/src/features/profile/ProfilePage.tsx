import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag, Tooltip } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { getLlmConfig, getLlmModels, testLlmConfig, updateLlmConfig, formatDateTime } from './profile.api';
import type { LlmConfig, UpdateLlmConfigInput } from './profile.types';

interface LlmConfigFormState {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  defaultChatModel: string;
  defaultAgentModel: string;
  availableModels: string[];
  selectedModels: string[];
  timeoutSeconds: string;
}

const emptyForm: LlmConfigFormState = {
  baseUrl: '',
  apiKey: '',
  enabled: false,
  defaultChatModel: 'gpt-5.5',
  defaultAgentModel: 'gpt-5.5',
  availableModels: [],
  selectedModels: [],
  timeoutSeconds: '120',
};

export function ProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LlmConfigFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [testResult, setTestResult] = useState('');

  const configQuery = useQuery({
    queryKey: ['llm-config'],
    queryFn: getLlmConfig,
  });

  const config = configQuery.data;

  useEffect(() => {
    if (!config) return;
    setForm({
      baseUrl: config.baseUrl,
      apiKey: '',
      enabled: config.enabled,
      defaultChatModel: config.defaultChatModel,
      defaultAgentModel: config.defaultAgentModel,
      availableModels: config.allowedModels,
      selectedModels: config.allowedModels,
      timeoutSeconds: String(config.timeoutSeconds),
    });
  }, [config]);

  const mutation = useMutation({
    mutationFn: updateLlmConfig,
    onSuccess: () => {
      setFormError('');
      setTestResult('');
      void queryClient.invalidateQueries({ queryKey: ['llm-config'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testLlmConfig,
    onSuccess: (result) => {
      setFormError('');
      setTestResult(`测试通过：${result.model} · HTTP ${result.status} · ${result.latencyMs}ms`);
    },
    onError: (err) => {
      setTestResult('');
      setFormError(err.message);
    },
  });

  const modelsMutation = useMutation({
    mutationFn: getLlmModels,
    onSuccess: (result) => {
      setForm((current) => {
        const selectedModels = current.selectedModels.filter((model) => result.models.includes(model));
        return {
          ...current,
          availableModels: result.models,
          selectedModels: selectedModels.length > 0 ? selectedModels : result.models,
        };
      });
      setFormError('');
      setTestResult(`已获取 ${result.models.length} 个模型`);
    },
    onError: (err) => {
      setTestResult('');
      setFormError(err.message);
    },
  });

  const summary = useMemo(() => buildSummary(config), [config]);
  const chatCompletionsUrl = buildChatCompletionsUrl(form.baseUrl);

  function updateField<K extends keyof LlmConfigFormState>(key: K, value: LlmConfigFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildInput(form, config?.configured ?? false);
    if (typeof input === 'string') {
      setFormError(input);
      return;
    }
    mutation.mutate(input);
  }

  function handleTest() {
    const input = buildInput(form, config?.configured ?? false);
    if (typeof input === 'string') {
      setFormError(input);
      setTestResult('');
      return;
    }
    testMutation.mutate(input);
  }

  function handleFetchModels() {
    const input = buildInput(form, config?.configured ?? false, { allowEmptyModels: true });
    if (typeof input === 'string') {
      setFormError(input);
      setTestResult('');
      return;
    }
    modelsMutation.mutate(input);
  }

  function toggleModel(model: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      selectedModels: checked
        ? Array.from(new Set([...current.selectedModels, model])).sort()
        : current.selectedModels.filter((item) => item !== model),
    }));
  }

  const modelOptions = form.availableModels.length > 0 ? form.availableModels : form.selectedModels;

  return (
    <div className="page-stack">
      <SectionCard
        title="全局 LLM 配置"
        description="配置星图服务端访问上游模型服务所需的 API Base、API Key 与模型策略。普通用户不会接触上游密钥。"
        action={<Button onClick={() => configQuery.refetch()}>刷新</Button>}
      >
        <div className="profile-summary">
          {summary.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="OpenAI-compatible 中转"
        description="/v1/chat/completions 接收标准 OpenAI Chat Completions 请求，服务端使用全局密钥向上游转发并原样返回响应流。"
      >
        <div className="llm-endpoint-grid">
          <EndpointCard method="POST" path="/v1/chat/completions" description="标准 Chat Completions 请求入口，支持 stream=true。" />
          <EndpointCard method="GET" path="/v1/models" description="返回本后端已启用的 OpenAI-compatible 模型列表。" />
        </div>
      </SectionCard>

      <SectionCard title="配置项" description="API Key 留空表示保持当前密钥。保存后页面仍只显示脱敏结果。">
        <form className="llm-config-form" onSubmit={handleSubmit}>
          <label>
            <span>API Base</span>
            <input
              id="llm-base-url"
              name="baseUrl"
              value={form.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => updateField('baseUrl', event.target.value)}
            />
            <small>实际测试地址：{chatCompletionsUrl || '填写 API Base 后显示完整请求地址'}</small>
          </label>
          <label>
            <span>API Key</span>
            <input
              id="llm-api-key"
              name="apiKey"
              value={form.apiKey}
              type="password"
              placeholder={config?.apiKeyMasked || '保存后仅显示脱敏结果'}
              onChange={(event) => updateField('apiKey', event.target.value)}
            />
          </label>
          <label>
            <span>默认聊天模型</span>
            <input
              id="llm-default-chat-model"
              name="defaultChatModel"
              value={form.defaultChatModel}
              placeholder="gpt-5.5"
              onChange={(event) => updateField('defaultChatModel', event.target.value)}
            />
          </label>
          <label>
            <span>默认 Agent 模型</span>
            <input
              id="llm-default-agent-model"
              name="defaultAgentModel"
              value={form.defaultAgentModel}
              placeholder="gpt-5.5"
              onChange={(event) => updateField('defaultAgentModel', event.target.value)}
            />
          </label>
          <label>
            <span>超时时间（秒）</span>
            <input
              id="llm-timeout-seconds"
              name="timeoutSeconds"
              value={form.timeoutSeconds}
              inputMode="numeric"
              min="10"
              max="2000"
              onChange={(event) => updateField('timeoutSeconds', event.target.value)}
            />
            <small>范围 10-2000 秒，超大模型或长上下文请求可适当调高。</small>
          </label>
          <label className="llm-config-form__switch">
            <span className="llm-config-form__label-with-tip">
              启用中转
              <Tooltip content="开启后，/v1/chat/completions 与 /v1/models 会使用服务端保存的 API Base 和 API Key 转发到上游模型服务；关闭后配置仍保留，但普通调用不可用。" placement="top" theme="light">
                <span className="llm-config-form__tip" aria-label="启用中转说明">!</span>
              </Tooltip>
            </span>
            <input
              id="llm-enabled"
              name="enabled"
              checked={form.enabled}
              type="checkbox"
              onChange={(event) => updateField('enabled', event.target.checked)}
            />
          </label>
          <div className="llm-config-form__wide llm-model-picker">
            <div className="llm-model-picker__header">
              <span>模型列表</span>
              <Button type="button" variant="outline" loading={modelsMutation.isPending} onClick={handleFetchModels}>
                获取模型
              </Button>
            </div>
            <details className="llm-model-picker__dropdown">
              <summary>{getModelPickerSummary(form.selectedModels, modelOptions)}</summary>
              <div className="llm-model-picker__menu">
                {modelOptions.length > 0 ? (
                  modelOptions.map((model) => (
                    <label className="llm-model-picker__option" key={model}>
                      <input
                        checked={form.selectedModels.includes(model)}
                        type="checkbox"
                        onChange={(event) => toggleModel(model, event.target.checked)}
                      />
                      <span>{model}</span>
                    </label>
                  ))
                ) : (
                  <p>点击“获取模型”从上游拉取可用模型。</p>
                )}
              </div>
            </details>
            <small>保存时仅勾选的模型会开放给中转和 Playground 使用。</small>
          </div>
          {(formError || mutation.error) && (
            <p className="form-error">{formError || mutation.error?.message}</p>
          )}
          {testResult && <p className="form-success">{testResult}</p>}
          <div className="llm-config-form__actions">
            <Button type="button" variant="outline" loading={testMutation.isPending} onClick={handleTest}>
              测试连接
            </Button>
            <Button theme="primary" type="submit" loading={mutation.isPending}>
              保存配置
            </Button>
            <Tag theme={config?.enabled ? 'success' : 'warning'}>
              {config?.enabled ? '中转已启用' : '中转未启用'}
            </Tag>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const value = baseUrl.trim().replace(/\/+$/, '');
  return value ? `${value}/chat/completions` : '';
}

function buildSummary(config: LlmConfig | undefined) {
  return [
    { label: '配置状态', value: config?.configured ? '已配置' : '未配置' },
    { label: '中转状态', value: config?.enabled ? '已启用' : '未启用' },
    { label: '默认模型', value: config?.defaultChatModel || '未设置' },
    { label: 'Agent 模型', value: config?.defaultAgentModel || '未设置' },
    { label: 'API Key', value: config?.apiKeyMasked || '未设置' },
    { label: '更新时间', value: formatDateTime(config?.updatedAt ?? null) },
  ];
}

function getModelPickerSummary(selectedModels: string[], modelOptions: string[]): string {
  if (modelOptions.length === 0) return '尚未获取模型';
  if (selectedModels.length === 0) return '未选择模型';
  if (selectedModels.length === modelOptions.length) return `已选择全部 ${selectedModels.length} 个模型`;
  return `已选择 ${selectedModels.length} / ${modelOptions.length} 个模型`;
}

function buildInput(
  form: LlmConfigFormState,
  configured: boolean,
  options: { allowEmptyModels?: boolean } = {}
): UpdateLlmConfigInput | string {
  const timeoutSeconds = Number(form.timeoutSeconds);
  if (!form.baseUrl.trim()) return 'API Base 不能为空';
  if (!form.defaultChatModel.trim()) return '默认聊天模型不能为空';
  if (!form.defaultAgentModel.trim()) return '默认 Agent 模型不能为空';
  if (!configured && !form.apiKey.trim()) return '首次配置必须填写 API Key';
  if (!Number.isFinite(timeoutSeconds)) return '超时时间必须是数字';
  if (timeoutSeconds < 10 || timeoutSeconds > 2000) return '超时时间必须在 10-2000 秒之间';
  if (!options.allowEmptyModels && form.availableModels.length > 0 && form.selectedModels.length === 0) {
    return '请至少选择一个模型';
  }

  const input: UpdateLlmConfigInput = {
    baseUrl: form.baseUrl.trim(),
    enabled: form.enabled,
    defaultChatModel: form.defaultChatModel.trim(),
    defaultAgentModel: form.defaultAgentModel.trim(),
    allowedModels: form.selectedModels,
    timeoutSeconds,
  };

  if (form.apiKey.trim()) {
    input.apiKey = form.apiKey.trim();
  }

  return input;
}

function EndpointCard({ method, path, description }: { method: string; path: string; description: string }) {
  return (
    <div className="endpoint-card">
      <Tag theme="primary">{method}</Tag>
      <code>{path}</code>
      <p>{description}</p>
    </div>
  );
}
