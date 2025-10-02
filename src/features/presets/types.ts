export const DEFAULT_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type PresetRequestParameter = {
  name: string;
  value: unknown;
};

export type Preset = {
  id: string;
  name: string;
  model: string;
  instructions: string;
  apiKey: string;
  apiEndpoint: string;
  requestParameters: PresetRequestParameter[];
};

export const DEFAULT_MODELS = [
  { label: 'OpenRouter Turbo', value: 'openrouter/turbo' },
  { label: 'Meta Llama 3 70B', value: 'meta/llama3-70b-instruct' },
  { label: 'Anthropic Claude 3 Opus', value: 'anthropic/claude-3-opus' }
];
