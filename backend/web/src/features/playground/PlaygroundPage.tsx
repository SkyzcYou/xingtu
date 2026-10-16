import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { SectionCard } from '../../components/SectionCard';
import { getLlmConfig } from '../profile/profile.api';
import {
  createPlaygroundHistory,
  type CreatePlaygroundHistoryInput,
  type PlaygroundHistoryRecord,
} from './playground-history.api';
import {
  buildImageHistoryRecord,
  buildTextHistoryRecord,
} from './playground-history.records';
import { PlaygroundHistory } from './PlaygroundHistory';
import {
  defaultImageAspectRatio,
  defaultImageCount,
  defaultImageQuality,
  defaultImageResolutionTier,
  getImagePromptLength,
  getModelListHint,
  imageAspectRatios,
  imageCountOptions,
  imageQualities,
  imageResolutionTiers,
  inferAspectRatioFromLegacySize,
  isImageAspectRatio,
  isImageCount,
  isImageQuality,
  isImageResolutionTier,
  maxImagePromptLength,
  maxReferenceImageCount,
  type ChatMutationInput,
  type ImageAspectRatio,
  type ImageCount,
  type ImageMutationInput,
  type ImageQuality,
  type ImageResolutionTier,
} from './playground-page.types';
import {
  generateImage,
  getGatewayModels,
  sendChatCompletion,
  type PlaygroundImageMode,
  type PlaygroundImageResult,
  type PlaygroundMessage,
} from './playground.api';
import './PlaygroundPage.scss';

type PlaygroundTab = 'chat' | 'image';

export function PlaygroundPage() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: ['llm-config'],
    queryFn: getLlmConfig,
  });
  const modelsQuery = useQuery({
    queryKey: ['gateway-models'],
    queryFn: getGatewayModels,
    enabled: configQuery.data?.enabled === true,
  });
  const modelOptions = useMemo(() => {
    const upstreamModels = modelsQuery.data ?? [];
    return upstreamModels.length > 0 ? upstreamModels : configQuery.data?.allowedModels ?? [];
  }, [configQuery.data?.allowedModels, modelsQuery.data]);
  const defaultModel = useMemo(() => {
    const config = configQuery.data;
    if (config?.defaultChatModel && modelOptions.includes(config.defaultChatModel)) {
      return config.defaultChatModel;
    }
    return config?.defaultChatModel || modelOptions[0] || '';
  }, [configQuery.data, modelOptions]);
  const defaultImageModel = useMemo(
    () => modelOptions.find((item) => item.toLowerCase().includes('image')) || defaultModel,
    [defaultModel, modelOptions]
  );
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('chat');
  const [model, setModel] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [useSystemPrompt, setUseSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('你是星图的服务端模型网关测试助手，回答要简洁准确。');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [error, setError] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>(defaultImageAspectRatio);
  const [imageResolutionTier, setImageResolutionTier] = useState<ImageResolutionTier>(defaultImageResolutionTier);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(defaultImageQuality);
  const [imageCount, setImageCount] = useState<ImageCount>(defaultImageCount);
  const [imageMode, setImageMode] = useState<PlaygroundImageMode>('sync');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [imageResults, setImageResults] = useState<PlaygroundImageResult[]>([]);
  const [imageError, setImageError] = useState('');
  const [imageElapsedSeconds, setImageElapsedSeconds] = useState(0);
  const [historySyncError, setHistorySyncError] = useState('');
  const [replayNotice, setReplayNotice] = useState('');

  useEffect(() => {
    if (modelOptions.length > 0 && !modelOptions.includes(model)) {
      setModel(defaultModel || modelOptions[0]);
      return;
    }
    if (!model && defaultModel) {
      setModel(defaultModel);
    }
  }, [defaultModel, model, modelOptions]);

  useEffect(() => {
    if (modelOptions.length > 0 && !modelOptions.includes(imageModel)) {
      setImageModel(defaultImageModel || modelOptions[0]);
      return;
    }
    if (!imageModel && defaultImageModel) {
      setImageModel(defaultImageModel);
    }
  }, [defaultImageModel, imageModel, modelOptions]);

  const recordHistory = useCallback((input: CreatePlaygroundHistoryInput | null) => {
    if (!input) return;
    setHistorySyncError('');
    void createPlaygroundHistory(input)
      .then(() => queryClient.invalidateQueries({ queryKey: ['playground-history'] }))
      .catch((historyError: Error) => {
        setHistorySyncError(`任务已完成，但历史同步失败：${historyError.message}`);
      });
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (input: ChatMutationInput) => sendChatCompletion(input),
    onSuccess: (content, input) => {
      setMessages((current) => [...current, { role: 'assistant', content }]);
      setError('');
      recordHistory(buildTextHistoryRecord(input, { content }));
    },
    onError: (err, input) => {
      setError(err.message);
      recordHistory(buildTextHistoryRecord(input, { error: err.message }));
    },
  });

  const imageMutation = useMutation({
    mutationFn: (input: ImageMutationInput) => generateImage(input),
    onSuccess: (results, input) => {
      setImageResults(results);
      setImageError('');
      recordHistory(buildImageHistoryRecord(input, { results }));
    },
    onError: (err, input) => {
      setImageError(err.message);
      recordHistory(buildImageHistoryRecord(input, { error: err.message }));
    },
  });

  useEffect(() => {
    if (!imageMutation.isPending) return;
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setImageElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [imageMutation.isPending]);

  const gatewayEnabled = configQuery.data?.enabled === true;
  const imagePromptLength = getImagePromptLength(imagePrompt);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    const selectedModel = model.trim();
    if (!gatewayEnabled) {
      setError('请先在 LLM 配置中启用中转');
      return;
    }
    if (!selectedModel) {
      setError('请先配置或输入模型名称');
      return;
    }
    if (!prompt) {
      setError('请输入测试消息');
      return;
    }

    const userContent = useSystemPrompt && systemPrompt.trim()
      ? `${systemPrompt.trim()}\n\n用户消息：${prompt}`
      : prompt;
    const nextMessages: PlaygroundMessage[] = [
      ...messages,
      { role: 'user', content: userContent },
    ];
    setMessages((current) => [...current, { role: 'user', content: prompt }]);
    setInput('');
    setError('');
    mutation.mutate({
      model: selectedModel,
      messages: nextMessages,
      prompt,
      useSystemPrompt,
      systemPrompt: useSystemPrompt ? systemPrompt.trim() : '',
      startedAt: Date.now(),
    });
  }

  function handleImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = imagePrompt.trim();
    const selectedModel = imageModel.trim();
    if (!gatewayEnabled) {
      setImageError('请先在 LLM 配置中启用中转');
      return;
    }
    if (!selectedModel) {
      setImageError('请先选择图片模型');
      return;
    }
    if (!prompt) {
      setImageError('请输入生图提示词');
      return;
    }
    if (getImagePromptLength(prompt) > maxImagePromptLength) {
      setImageError(`生图提示词不能超过 ${maxImagePromptLength} 个字符`);
      return;
    }
    if (referenceImages.length > maxReferenceImageCount) {
      setImageError(`参考图最多选择 ${maxReferenceImageCount} 张`);
      return;
    }
    setImageError('');
    setImageElapsedSeconds(0);
    imageMutation.mutate({
      model: selectedModel,
      prompt,
      aspectRatio: imageAspectRatio,
      resolutionTier: imageResolutionTier,
      quality: imageQuality,
      count: imageCount,
      referenceImages,
      mode: imageMode,
      startedAt: Date.now(),
    });
  }

  const handleReplay = useCallback((record: PlaygroundHistoryRecord) => {
    setHistorySyncError('');
    if (record.taskKind === 'text') {
      setActiveTab('chat');
      setModel(record.model);
      setInput(record.prompt);
      setUseSystemPrompt(record.parameters.useSystemPrompt);
      setSystemPrompt(record.parameters.systemPrompt);
      setMessages([]);
      setError('');
      setReplayNotice('文字任务参数已回填，请确认后点击“发送测试”。');
      window.setTimeout(() => document.getElementById('playground-message')?.focus(), 0);
      return;
    }

    const replayAspectRatio = record.parameters.aspectRatio
      || inferAspectRatioFromLegacySize(record.parameters.size);
    setActiveTab('image');
    setImageModel(record.model);
    setImagePrompt(record.prompt);
    setImageAspectRatio(replayAspectRatio);
    setImageResolutionTier(record.parameters.resolutionTier || defaultImageResolutionTier);
    setImageQuality(record.parameters.quality || defaultImageQuality);
    setImageCount(record.parameters.count || defaultImageCount);
    setImageMode(record.parameters.mode);
    setReferenceImages([]);
    setImageResults([]);
    setImageError('');
    setReplayNotice(record.parameters.referenceFileNames.length > 0
      ? `图片任务参数已回填；请重新选择参考图：${record.parameters.referenceFileNames.join('、')}。`
      : '图片任务参数已回填，请确认后点击“生成图片”。');
    window.setTimeout(() => document.getElementById('playground-image-prompt')?.focus(), 0);
  }, []);

  return (
    <div className="page-stack">
      <SectionCard
        title="LLM Playground"
        description="启用中转后，本页会调用业务后端 OpenAI-compatible 接口验证真实链路；未启用时仅展示 LLM 配置中已保存的模型，不能发起中转调用。"
        action={<Tag theme={gatewayEnabled ? 'success' : 'warning'}>{gatewayEnabled ? '中转已启用' : '中转未启用'}</Tag>}
      >
        <div className="playground-meta">
          <div>
            <span>对话 API</span>
            <strong>/v1/chat/completions</strong>
          </div>
          <div>
            <span>图片 API</span>
            <strong>/v1/images/generations · async:true</strong>
          </div>
          <div>
            <span>默认模型</span>
            <strong>{defaultModel || '未配置'}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="能力测试" description="获取模型/测试连接属于管理员配置校验；只有启用中转后，对话、图片和 Agent API 才会正式对客户端开放。">
        {gatewayEnabled !== true && (
          <div className="playground-warning" role="alert">
            当前未启用中转，发送测试会被后端拒绝。请先在 LLM 配置中开启“启用中转”并保存。
          </div>
        )}
        {replayNotice && (
          <div className="playground-replay-notice" role="status">
            <span>{replayNotice}</span>
            <button type="button" onClick={() => setReplayNotice('')}>关闭</button>
          </div>
        )}
        <div className="playground-tabs" role="tablist" aria-label="Playground 测试类型">
          <button
            aria-selected={activeTab === 'chat'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('chat')}
          >
            对话测试
          </button>
          <button
            aria-selected={activeTab === 'image'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('image')}
          >
            生图测试
          </button>
        </div>
        {activeTab === 'chat' ? (
          <div className="playground-layout">
            <form className="playground-form" onSubmit={handleSubmit}>
              <label>
                <span>模型</span>
                <select
                  id="playground-model"
                  name="model"
                  value={model}
                  disabled={modelsQuery.isLoading || modelOptions.length === 0}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {modelOptions.length > 0 ? (
                    modelOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))
                  ) : (
                    <option value="">暂无可选模型</option>
                  )}
                </select>
                <small>{getModelListHint(modelsQuery.isLoading, modelsQuery.error, gatewayEnabled)}</small>
              </label>
              <label>
                <span className="playground-form__checkbox-label">
                  <input
                    checked={useSystemPrompt}
                    type="checkbox"
                    onChange={(event) => setUseSystemPrompt(event.target.checked)}
                  />
                  启用 System Prompt
                </span>
                <textarea
                  id="playground-system-prompt"
                  name="systemPrompt"
                  value={systemPrompt}
                  disabled={!useSystemPrompt}
                  rows={3}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                />
              </label>
              <label>
                <span>用户消息</span>
                <textarea
                  id="playground-message"
                  name="message"
                  value={input}
                  placeholder="输入一条消息测试上下游调用。"
                  rows={5}
                  onChange={(event) => setInput(event.target.value)}
                />
              </label>
              {(error || mutation.error) && <p className="form-error">{error || mutation.error?.message}</p>}
              <div className="playground-actions">
                <Button theme="primary" type="submit" disabled={!gatewayEnabled} loading={mutation.isPending}>
                  发送测试
                </Button>
                <Button variant="outline" type="button" onClick={() => setMessages([])}>
                  清空对话
                </Button>
              </div>
            </form>

            <div className="playground-chat" aria-label="对话记录">
              {messages.length === 0 ? (
                <div className="playground-empty">暂无对话，发送一条消息开始测试。</div>
              ) : (
                messages.map((message, index) => (
                  <article className="playground-message" data-role={message.role} key={`${message.role}-${index}`}>
                    <span>{message.role}</span>
                    <p>{message.content}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="playground-layout">
            <form className="playground-form" onSubmit={handleImageSubmit}>
              <label>
                <span>图片模型</span>
                <select
                  id="playground-image-model"
                  name="imageModel"
                  value={imageModel}
                  disabled={modelsQuery.isLoading || modelOptions.length === 0}
                  onChange={(event) => setImageModel(event.target.value)}
                >
                  {modelOptions.length > 0 ? (
                    modelOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))
                  ) : (
                    <option value="">暂无可选模型</option>
                  )}
                </select>
                <small>同步模式走 /v1/images/generations 或 /v1/images/edits；异步模式文生图用 async:true，参考图/编辑用 multipart async=true 触发后台 job。</small>
              </label>
              <div className="playground-control-grid">
                <label>
                  <span>画面比例</span>
                  <select
                    value={imageAspectRatio}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (isImageAspectRatio(value)) setImageAspectRatio(value);
                    }}
                  >
                    {imageAspectRatios.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>分辨率</span>
                  <select
                    value={imageResolutionTier}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (isImageResolutionTier(value)) setImageResolutionTier(value);
                    }}
                  >
                    {imageResolutionTiers.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>质量</span>
                  <select
                    value={imageQuality}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (isImageQuality(value)) setImageQuality(value);
                    }}
                  >
                    {imageQualities.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>数量</span>
                  <select
                    value={imageCount}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (isImageCount(value)) setImageCount(value);
                    }}
                  >
                    {imageCountOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>调用方式</span>
                <select value={imageMode} onChange={(event) => setImageMode(event.target.value as PlaygroundImageMode)}>
                  <option value="sync">同步：/v1/images/generations 或 /v1/images/edits</option>
                  <option value="async">异步：generations async:true / edits async=true</option>
                </select>
                <small>同步用于复现 OpenAI-compatible API；异步用于验证星图帐号后台 job 链路。</small>
              </label>
              <label>
                <span className="playground-prompt-header">
                  <span>提示词</span>
                  <span className={imagePromptLength > maxImagePromptLength ? 'playground-prompt-counter is-invalid' : 'playground-prompt-counter'}>
                    {imagePromptLength}/{maxImagePromptLength}
                  </span>
                </span>
                <textarea
                  id="playground-image-prompt"
                  name="imagePrompt"
                  value={imagePrompt}
                  placeholder="描述你想生成的画面、主体、风格、镜头和细节。"
                  rows={5}
                  onChange={(event) => setImagePrompt(event.target.value)}
                />
                <small>图片请求会发送 aspect_ratio、output_resolution、image_size、quality、n 与 stream:false；resolution 为视频专用字段，不会在这里发送。</small>
              </label>
              <label>
                <span>参考图</span>
                <input
                  accept="image/*"
                  multiple
                  type="file"
                  onChange={(event) => setReferenceImages(Array.from(event.target.files ?? []))}
                />
                <small>{referenceImages.length > 0 ? `已选择 ${referenceImages.length} 张参考图，最多 ${maxReferenceImageCount} 张。` : '不上传参考图时执行文生图。'}</small>
              </label>
              <div className="playground-cost-hint">
                实际消耗以模型配置和上游计费为准；失败或超时通常不计费。
              </div>
              {(imageError || imageMutation.error) && <p className="form-error">{imageError || imageMutation.error?.message}</p>}
              <div className="playground-actions">
                <Button theme="primary" type="submit" disabled={!gatewayEnabled} loading={imageMutation.isPending}>
                  生成图片
                </Button>
                <Button variant="outline" type="button" onClick={() => setImageResults([])}>
                  清空结果
                </Button>
              </div>
            </form>

            <div className="playground-image-results" aria-label="生图结果">
              {imageMutation.isPending ? (
                <div
                  className="playground-empty playground-loading-status"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  图片生成中，请稍候。 · 已用 {imageElapsedSeconds}s
                </div>
              ) : imageResults.length === 0 ? (
                <div className="playground-empty">暂无图片，提交提示词开始测试。</div>
              ) : (
                imageResults.map((result, index) => (
                  <figure className="playground-image-result" key={`${result.src}-${index}`}>
                    <img alt={`生成结果 ${index + 1}`} src={result.src} />
                    {(result.revisedPrompt || result.jobId) && (
                      <figcaption>
                        {result.jobId && <span>Job: {result.jobId}</span>}
                        {result.revisedPrompt && <span>{result.revisedPrompt}</span>}
                      </figcaption>
                    )}
                  </figure>
                ))
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="历史任务"
        description="仅记录本页发起的文字和生图任务，按登录帐号同步到其他设备。"
      >
        <PlaygroundHistory onReplay={handleReplay} syncError={historySyncError} />
      </SectionCard>
    </div>
  );
}
