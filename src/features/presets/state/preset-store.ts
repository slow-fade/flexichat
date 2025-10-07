import { createId } from '../../../lib/id';
import { createLocalStore } from '../../../lib/storage';
import { STORAGE_KEYS } from '../../../lib/storage';
import type { Preset, PresetRequestParameter } from '../types';
import { DEFAULT_API_ENDPOINT } from '../types';

const createDefaultPresets = (): Preset[] => [
  {
    id: createId('preset'),
    name: 'Default (openrouter)',
    model: 'meta-llama/llama-3.3-70b-instruct',
    instructions:
      'You are a helpful assistant. Be concise and accurate, ask clarifying questions when useful, and format code with fenced Markdown.',
    apiKey: '',
    apiEndpoint: DEFAULT_API_ENDPOINT,
    requestParameters: []
  }
];

const defaultPresets = createDefaultPresets();

const isPresetRequestParameter = (value: unknown): value is PresetRequestParameter => {
  if (!value || typeof value !== 'object') return false;
  const parameter = value as PresetRequestParameter;
  return typeof parameter.name === 'string' && 'value' in parameter;
};

const isPreset = (value: unknown): value is Preset => {
  if (!value || typeof value !== 'object') return false;
  const preset = value as Preset;
  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.model === 'string' &&
    typeof preset.instructions === 'string' &&
    typeof preset.apiKey === 'string' &&
    typeof preset.apiEndpoint === 'string' &&
    Array.isArray(preset.requestParameters) &&
    preset.requestParameters.every(isPresetRequestParameter)
  );
};

const isPresetList = (value: unknown): value is Preset[] =>
  Array.isArray(value) && value.every(isPreset);

const presetsStore = createLocalStore(STORAGE_KEYS.presets, defaultPresets, isPresetList);

const activePresetStore = createLocalStore<string | null>(
  STORAGE_KEYS.activePresetId,
  defaultPresets[0] ? defaultPresets[0].id : null,
  (value): value is string | null => typeof value === 'string' || value === null
);

export const loadPresets = () => presetsStore.read();

export const savePresets = (presets: Preset[]) => presetsStore.write(presets);

export const loadActivePresetId = () => activePresetStore.read();

export const saveActivePresetId = (id: string | null) => activePresetStore.write(id);

export const resetPresets = () => {
  presetsStore.clear();
  activePresetStore.clear();
  return {
    presets: loadPresets(),
    activePresetId: loadActivePresetId()
  };
};
