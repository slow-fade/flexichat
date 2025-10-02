import { CreateChatCompletionInput, ChatCompletionResponse, ListModelsResponse, OpenRouterChatMessage, OpenRouterModel } from './types';

const DEFAULT_MODELS_URL = 'https://openrouter.ai/api/v1/models';

const isTextPart = (value: unknown): value is { type: string; text?: string } =>
  Boolean(value && typeof value === 'object' && 'type' in (value as Record<string, unknown>));

const normalizeContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }
        if (isTextPart(part) && part.type === 'text' && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
};

const buildHeaders = (apiKey?: string) => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (apiKey) {
    headers.set('Authorization', 'Bearer ' + apiKey);
  }
  const referer = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  headers.set('HTTP-Referer', referer);
  headers.set('X-Title', 'OpenRouter Web UI');
  return headers;
};

export const fetchOpenRouterModels = async (signal?: AbortSignal): Promise<OpenRouterModel[]> => {
  const response = await fetch(DEFAULT_MODELS_URL, {
    method: 'GET',
    headers: buildHeaders(),
    signal
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models: ' + response.status + ' ' + response.statusText);
  }

  const payload = (await response.json()) as ListModelsResponse;
  const models = payload.data ?? [];
  return models.map(model => ({
    id: model.id,
    name: model.name ?? model.id,
    description: model.description,
    context_length: model.context_length
  }));
};

export const createChatCompletion = async (
  input: CreateChatCompletionInput,
  signal?: AbortSignal
): Promise<{ content: string; choice?: NonNullable<ChatCompletionResponse['choices']>[number] }> => {
  const { endpoint, apiKey, model, messages, extras } = input;

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(message => ({
      role: message.role,
      content: message.content
    }))
  };

  if (extras) {
    Object.entries(extras).forEach(([key, value]) => {
      if (value !== undefined) {
        payload[key] = value;
      }
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    let errorDetail = response.status + ' ' + response.statusText;
    try {
      const errorPayload = (await response.json()) as { error?: { message?: string } };
      if (errorPayload?.error?.message) {
        errorDetail = errorPayload.error.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error('OpenRouter request failed: ' + errorDetail);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const [choice] = data.choices ?? [];
  if (!choice?.message) {
    throw new Error('OpenRouter response did not include a message choice.');
  }

  const content = normalizeContent(choice.message.content);
  if (!content) {
    throw new Error('OpenRouter response did not include textual content.');
  }

  return { content, choice };
};

export const buildRequestMessages = (
  options: {
    instructions?: string;
    history: OpenRouterChatMessage[];
    userMessage: OpenRouterChatMessage;
  }
): OpenRouterChatMessage[] => {
  const { instructions, history, userMessage } = options;
  const messages: OpenRouterChatMessage[] = [];

  if (instructions?.trim()) {
    messages.push({ role: 'system', content: instructions.trim() });
  }

  messages.push(...history);
  messages.push(userMessage);

  return messages;
};

export const buildExtrasFromParameters = (
  parameters: Array<{ name: string; value: unknown }>
): Record<string, unknown> => {
  return parameters.reduce<Record<string, unknown>>((acc, parameter) => {
    if (parameter.name && parameter.value !== undefined) {
      acc[parameter.name] = parameter.value;
    }
    return acc;
  }, {});
};
