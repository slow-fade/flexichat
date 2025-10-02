import { createId } from '../../../lib/id';
import { createLocalStore } from '../../../lib/storage';
import { STORAGE_KEYS } from '../../../lib/storage';
import type { Preset, PresetRequestParameter } from '../types';
import { DEFAULT_API_ENDPOINT } from '../types';

const createDefaultPresets = (): Preset[] => [
  {
    id: createId('preset'),
    name: 'Friendly support',
    model: 'openrouter/turbo',
    instructions: 'Respond warmly and guide the user through each step with short actionable tips.',
    apiKey: '',
    apiEndpoint: DEFAULT_API_ENDPOINT,
    requestParameters: []
  },
  {
    id: createId('preset'),
    name: 'Technical deep dive',
    model: 'meta/llama3-70b-instruct',
    instructions: 'Explain implementation details and highlight trade-offs without skipping caveats.',
    apiKey: '',
    apiEndpoint: DEFAULT_API_ENDPOINT,
    requestParameters: [
      {
        name: 'response_format',
        value: {
          type: 'json_object'
        }
      }
    ]
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
