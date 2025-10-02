import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import { cn } from '../../../lib/cn';
import { createId } from '../../../lib/id';
import { tryParseJson } from '../../../lib/json';
import { useOpenRouterModels } from '../../openrouter/hooks/use-openrouter-models';
import type { CreatePresetInput } from '../hooks/use-preset-state';
import type { Preset, PresetRequestParameter } from '../types';
import { DEFAULT_API_ENDPOINT } from '../types';

type PresetPanelProps = {
  presets: Preset[];
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onCreatePreset: (input: CreatePresetInput) => void;
  onUpdatePreset: (presetId: string, patch: Partial<CreatePresetInput>) => void;
  onDeletePreset: (presetId: string) => void;
};

type PresetFormState = {
  name: string;
  model: string;
  instructions: string;
  apiKey: string;
  apiEndpoint: string;
};

type ParameterDraft = {
  id: string;
  name: string;
  value: string;
  error?: string;
};

const DEFAULT_MODEL_ID = 'openrouter/turbo';

const createEmptyDraft = (): ParameterDraft => ({
  id: createId('param'),
  name: '',
  value: ''
});

const createDraftFromParameter = (parameter: PresetRequestParameter): ParameterDraft => ({
  id: createId('param'),
  name: parameter.name,
  value: JSON.stringify(parameter.value, null, 2)
});

const createDefaultForm = (modelId: string): PresetFormState => ({
  name: '',
  model: modelId,
  instructions: '',
  apiKey: '',
  apiEndpoint: DEFAULT_API_ENDPOINT
});

const createFormFromPreset = (preset: Preset, fallbackModelId: string): PresetFormState => ({
  name: preset.name,
  model: preset.model || fallbackModelId,
  instructions: preset.instructions,
  apiKey: preset.apiKey,
  apiEndpoint: preset.apiEndpoint || DEFAULT_API_ENDPOINT
});

const maskApiKey = (value: string) => {
  if (!value) return 'Not set';
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
};

const cloneParameterValue = (value: unknown) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn('Failed to structuredClone parameter value', error);
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to deep clone parameter value', error);
    return value;
  }
};

export const PresetPanel = ({
  presets,
  activePresetId,
  onSelectPreset,
  onCreatePreset,
  onUpdatePreset,
  onDeletePreset
}: PresetPanelProps) => {
  const { options: modelOptions, isLoading: isLoadingModels, error: modelsError } = useOpenRouterModels();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerMode, setManagerMode] = useState<'view' | 'create'>('view');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PresetFormState>(() =>
    createDefaultForm(modelOptions[0]?.value ?? DEFAULT_MODEL_ID)
  );
  const [parameterDrafts, setParameterDrafts] = useState<ParameterDraft[]>([createEmptyDraft()]);
  const [modelQuery, setModelQuery] = useState('');

  const selectedPreset = useMemo(
    () => presets.find(preset => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  );

  useEffect(() => {
    if (!isManagerOpen) return;
    if (managerMode === 'view') {
      if (!selectedPresetId) {
        const fallbackId = activePresetId ?? (presets[0] ? presets[0].id : null);
        if (fallbackId) {
          setSelectedPresetId(fallbackId);
        }
        return;
      }

      if (!selectedPreset) {
        const fallbackId = presets[0] ? presets[0].id : null;
        if (fallbackId) {
          setSelectedPresetId(fallbackId);
        }
        return;
      }

      const fallbackModel = modelOptions[0]?.value ?? DEFAULT_MODEL_ID;
      setFormState(createFormFromPreset(selectedPreset, fallbackModel));
      setParameterDrafts(
        selectedPreset.requestParameters.length > 0
          ? selectedPreset.requestParameters.map(createDraftFromParameter)
          : [createEmptyDraft()]
      );
      setModelQuery('');
    }
  }, [
    activePresetId,
    isManagerOpen,
    managerMode,
    modelOptions,
    presets,
    selectedPreset,
    selectedPresetId
  ]);

  useEffect(() => {
    if (!isManagerOpen || managerMode !== 'create') return;
    const nextModel = modelOptions[0]?.value ?? DEFAULT_MODEL_ID;
    setFormState(createDefaultForm(nextModel));
    setParameterDrafts([createEmptyDraft()]);
    setModelQuery('');
  }, [isManagerOpen, managerMode, modelOptions]);

  const filteredModelOptions = useMemo(() => {
    const trimmed = modelQuery.trim().toLowerCase();
    const baseOptions = trimmed
      ? modelOptions.filter(option => {
          const label = option.label.toLowerCase();
          const value = option.value.toLowerCase();
          return label.includes(trimmed) || value.includes(trimmed);
        })
      : modelOptions;

    if (formState.model && !baseOptions.some(option => option.value === formState.model)) {
      const selectedOption = modelOptions.find(option => option.value === formState.model);
      if (selectedOption) {
        return [selectedOption, ...baseOptions];
      }
    }

    return baseOptions;
  }, [modelOptions, modelQuery, formState.model]);

  const showModelWarning = Boolean(modelsError && modelOptions.length === 0);

  const handleManagerOpenChange = (open: boolean) => {
    setIsManagerOpen(open);
    if (open) {
      setManagerMode('view');
      setSelectedPresetId(activePresetId ?? (presets[0] ? presets[0].id : null));
    } else {
      setManagerMode('view');
      setSelectedPresetId(null);
      setModelQuery('');
      setFormState(createDefaultForm(modelOptions[0]?.value ?? DEFAULT_MODEL_ID));
      setParameterDrafts([createEmptyDraft()]);
    }
  };

  const handleStartCreate = () => {
    setManagerMode('create');
    setSelectedPresetId(null);
  };

  const handleDraftChange = (id: string, field: 'name' | 'value', nextValue: string) => {
    setParameterDrafts(previous =>
      previous.map(draft =>
        draft.id === id
          ? {
              ...draft,
              [field]: nextValue,
              error: undefined
            }
          : draft
      )
    );
  };

  const handleRemoveDraft = (id: string) => {
    setParameterDrafts(previous => previous.filter(draft => draft.id !== id));
  };

  const handleAddDraft = () => {
    setParameterDrafts(previous => [...previous, createEmptyDraft()]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName || !formState.model) return;

    const nextDrafts = parameterDrafts.map(draft => ({ ...draft, error: undefined }));
    const requestParameters: PresetRequestParameter[] = [];
    let hasErrors = false;

    for (const draft of nextDrafts) {
      const name = draft.name.trim();
      const value = draft.value.trim();

      if (!name && !value) {
        continue;
      }

      if (!name) {
        draft.error = 'Enter a parameter name.';
        hasErrors = true;
        continue;
      }

      if (!value) {
        draft.error = 'Enter a JSON value.';
        hasErrors = true;
        continue;
      }

      const parsed = tryParseJson(value);
      if (!parsed.ok) {
        draft.error = 'Invalid JSON: ' + parsed.error;
        hasErrors = true;
        continue;
      }

      requestParameters.push({ name, value: parsed.value });
    }

    setParameterDrafts(nextDrafts);

    if (hasErrors) {
      return;
    }

    const payload: CreatePresetInput = {
      name: trimmedName,
      model: formState.model,
      instructions: formState.instructions.trim(),
      apiKey: formState.apiKey.trim(),
      apiEndpoint: formState.apiEndpoint.trim() || DEFAULT_API_ENDPOINT,
      requestParameters
    };

    if (managerMode === 'create') {
      onCreatePreset(payload);
      setManagerMode('view');
      setSelectedPresetId(null);
    } else if (selectedPresetId) {
      onUpdatePreset(selectedPresetId, payload);
    }
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Delete the "' + presetName + '" preset? This will remove stored API keys and parameters for it.'
      );
      if (!confirmed) {
        return;
      }
    }

    onDeletePreset(presetId);
    setSelectedPresetId(current => {
      if (current !== presetId) {
        return current;
      }
      const remaining = presets.filter(preset => preset.id !== presetId);
      return remaining[0] ? remaining[0].id : activePresetId;
    });
    setManagerMode(presets.length > 1 ? 'view' : 'create');
  };

  const handleClonePreset = (preset: Preset) => {
    const cloneName = preset.name ? preset.name + ' (copy)' : 'Preset copy';
    const payload: CreatePresetInput = {
      name: cloneName,
      model: preset.model,
      instructions: preset.instructions,
      apiKey: preset.apiKey,
      apiEndpoint: preset.apiEndpoint,
      requestParameters: preset.requestParameters.map(parameter => ({
        name: parameter.name,
        value: cloneParameterValue(parameter.value)
      }))
    };

    onCreatePreset(payload);
    setManagerMode('view');
    setSelectedPresetId(null);
  };

  return (
    <section className="border-b border-neutral-800 px-8 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Presets</h2>
            <p className="text-sm text-neutral-400">Select and manage presets for this session.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <Select
                value={activePresetId ? activePresetId : undefined}
                onValueChange={onSelectPreset}
                disabled={presets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={presets.length === 0 ? 'No presets yet' : 'Select preset'} />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isManagerOpen} onOpenChange={handleManagerOpenChange}>
              <DialogTrigger asChild>
                <Button variant="secondary">Manage presets</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>Manage presets</DialogHeader>
                <DialogDescription>
                  Create, edit, or delete presets. Changes are stored locally in this browser.
                </DialogDescription>
                <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                  <aside className="w-full max-w-xs flex-shrink-0 border border-neutral-800 bg-neutral-950/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-200">Existing presets</p>
                      <Button type="button" variant="secondary" size="icon" onClick={handleStartCreate} aria-label="Create preset">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 h-80 overflow-y-auto space-y-2">
                      {presets.length === 0 && (
                        <p className="text-sm text-neutral-400">No presets yet. Create one to get started.</p>
                      )}
                      {presets.map(preset => (
                        <div
                          key={preset.id}
                          className={cn(
                            'group flex items-center justify-between rounded-md border px-3 py-2 transition',
                            managerMode === 'view' && preset.id === selectedPresetId
                              ? 'border-neutral-600 bg-neutral-800'
                              : 'border-transparent hover:border-neutral-700 hover:bg-neutral-900'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setManagerMode('view');
                              setSelectedPresetId(preset.id);
                            }}
                            className="flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-neutral-100">{preset.name}</p>
                            <p className="text-xs text-neutral-400">{preset.model}</p>
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={event => {
                                event.stopPropagation();
                                handleClonePreset(preset);
                              }}
                              aria-label={'Clone ' + preset.name}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={event => {
                                event.stopPropagation();
                                handleDeletePreset(preset.id, preset.name);
                              }}
                              aria-label={'Delete ' + preset.name}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="flex-1 space-y-5">
                    {managerMode === 'create' ? (
                      <div className="space-y-5">
                        <h3 className="text-base font-semibold text-neutral-100">Create preset</h3>
                        <form className="space-y-5" onSubmit={handleSubmit}>
                          <div className="space-y-2">
                            <Label htmlFor="preset-name">Name</Label>
                            <Input
                              id="preset-name"
                              value={formState.name}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  name: event.target.value
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Model</Label>
                            <Select
                              value={formState.model}
                              onValueChange={value =>
                                setFormState(previous => ({
                                  ...previous,
                                  model: value
                                }))
                              }
                              disabled={modelOptions.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingModels ? 'Loading models…' : 'Select a model'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-80" viewportClassName="p-0 max-h-80 overflow-y-auto">
                                <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900 p-2">
                                  <Input
                                    autoFocus
                                    placeholder="Search models"
                                    value={modelQuery}
                                    onChange={event => setModelQuery(event.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 p-1">
                                  {filteredModelOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                  {filteredModelOptions.length === 0 && (
                                    <p className="px-3 py-2 text-sm text-neutral-400">No models match your search.</p>
                                  )}
                                </div>
                              </SelectContent>
                            </Select>
                            {showModelWarning && (
                              <p className="text-xs text-neutral-500">Unable to refresh models from OpenRouter. Using cached defaults.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-api-endpoint">API endpoint</Label>
                            <Input
                              id="preset-api-endpoint"
                              placeholder={DEFAULT_API_ENDPOINT}
                              value={formState.apiEndpoint}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  apiEndpoint: event.target.value
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-api-key">API key</Label>
                            <Input
                              id="preset-api-key"
                              type="password"
                              placeholder="Store your OpenRouter API key locally"
                              value={formState.apiKey}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  apiKey: event.target.value
                                }))
                              }
                            />
                            <p className="text-xs text-neutral-500">
                              Keys are saved in local storage. Clear the browser state on shared devices.
                            </p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-neutral-100">Custom request parameters</p>
                                <p className="text-xs text-neutral-400">
                                  Name/value pairs added to requests. Values must be valid JSON (for example <code>true</code>, <code>42</code>, <code>"text"</code>, <code>{'{ "foo": 1 }'}</code>).
                                </p>
                              </div>
                              <Button type="button" variant="secondary" size="sm" onClick={handleAddDraft}>
                                <Plus className="mr-1 h-4 w-4" /> Add parameter
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {parameterDrafts.length === 0 && (
                                <p className="rounded-lg border border-dashed border-neutral-700 px-3 py-4 text-sm text-neutral-400">
                                  No custom parameters yet. Use Add parameter to extend the payload.
                                </p>
                              )}
                              {parameterDrafts.map(draft => (
                                <div key={draft.id} className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-900/60 p-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 space-y-1">
                                      <Label
                                        htmlFor={'param-name-' + draft.id}
                                        className="text-xs uppercase tracking-wide text-neutral-400"
                                      >
                                        Name
                                      </Label>
                                      <Input
                                        id={'param-name-' + draft.id}
                                        placeholder="e.g. temperature"
                                        value={draft.name}
                                        onChange={event => handleDraftChange(draft.id, 'name', event.target.value)}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="mt-6 text-neutral-400 hover:text-neutral-200"
                                      onClick={() => handleRemoveDraft(draft.id)}
                                      aria-label="Remove parameter"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={'param-value-' + draft.id}
                                      className="text-xs uppercase tracking-wide text-neutral-400"
                                    >
                                      JSON value
                                    </Label>
                                    <Textarea
                                      id={'param-value-' + draft.id}
                                      className={cn(
                                        draft.error ? 'border-red-500/70 focus-visible:ring-red-500' : undefined
                                      )}
                                      placeholder='Examples: 0.7, true, "analysis", {"foo": "bar"}'
                                      value={draft.value}
                                      rows={3}
                                      onChange={event => handleDraftChange(draft.id, 'value', event.target.value)}
                                    />
                                  </div>
                                  {draft.error && <p className="text-xs text-red-400">{draft.error}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-instructions">Instructions</Label>
                            <Textarea
                              id="preset-instructions"
                              value={formState.instructions}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  instructions: event.target.value
                                }))
                              }
                              placeholder="Encourage concise answers, emphasise next steps, etc."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setManagerMode('view')}>
                              Cancel
                            </Button>
                            <Button type="submit">Save preset</Button>
                          </div>
                        </form>
                      </div>
                    ) : selectedPreset ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-neutral-100">Edit preset</h3>
                            <p className="text-sm text-neutral-400">Active model: {selectedPreset.model}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-500">API key: {maskApiKey(selectedPreset.apiKey)}</p>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              aria-label="Clone preset"
                              onClick={() => handleClonePreset(selectedPreset)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <form className="space-y-5" onSubmit={handleSubmit}>
                          <div className="space-y-2">
                            <Label htmlFor="preset-name-edit">Name</Label>
                            <Input
                              id="preset-name-edit"
                              value={formState.name}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  name: event.target.value
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Model</Label>
                            <Select
                              value={formState.model}
                              onValueChange={value =>
                                setFormState(previous => ({
                                  ...previous,
                                  model: value
                                }))
                              }
                              disabled={modelOptions.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingModels ? 'Loading models…' : 'Select a model'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-80" viewportClassName="p-0 max-h-80 overflow-y-auto">
                                <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900 p-2">
                                  <Input
                                    autoFocus
                                    placeholder="Search models"
                                    value={modelQuery}
                                    onChange={event => setModelQuery(event.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 p-1">
                                  {filteredModelOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                  {filteredModelOptions.length === 0 && (
                                    <p className="px-3 py-2 text-sm text-neutral-400">No models match your search.</p>
                                  )}
                                </div>
                              </SelectContent>
                            </Select>
                            {showModelWarning && (
                              <p className="text-xs text-neutral-500">Unable to refresh models from OpenRouter. Using cached defaults.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-api-endpoint-edit">API endpoint</Label>
                            <Input
                              id="preset-api-endpoint-edit"
                              value={formState.apiEndpoint}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  apiEndpoint: event.target.value
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-api-key-edit">API key</Label>
                            <Input
                              id="preset-api-key-edit"
                              type="password"
                              value={formState.apiKey}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  apiKey: event.target.value
                                }))
                              }
                            />
                            <p className="text-xs text-neutral-500">
                              Keys are saved in local storage. Clear the browser state on shared devices.
                            </p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-neutral-100">Custom request parameters</p>
                                <p className="text-xs text-neutral-400">
                                  Name/value pairs added to requests. Values must be valid JSON (for example <code>true</code>, <code>42</code>, <code>"text"</code>, <code>{'{ "foo": 1 }'}</code>).
                                </p>
                              </div>
                              <Button type="button" variant="secondary" size="sm" onClick={handleAddDraft}>
                                <Plus className="mr-1 h-4 w-4" /> Add parameter
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {parameterDrafts.length === 0 && (
                                <p className="rounded-lg border border-dashed border-neutral-700 px-3 py-4 text-sm text-neutral-400">
                                  No custom parameters yet. Use Add parameter to extend the payload.
                                </p>
                              )}
                              {parameterDrafts.map(draft => (
                                <div key={draft.id} className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-900/60 p-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 space-y-1">
                                      <Label
                                        htmlFor={'param-name-' + draft.id}
                                        className="text-xs uppercase tracking-wide text-neutral-400"
                                      >
                                        Name
                                      </Label>
                                      <Input
                                        id={'param-name-' + draft.id}
                                        placeholder="e.g. temperature"
                                        value={draft.name}
                                        onChange={event => handleDraftChange(draft.id, 'name', event.target.value)}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="mt-6 text-neutral-400 hover:text-neutral-200"
                                      onClick={() => handleRemoveDraft(draft.id)}
                                      aria-label="Remove parameter"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={'param-value-' + draft.id}
                                      className="text-xs uppercase tracking-wide text-neutral-400"
                                    >
                                      JSON value
                                    </Label>
                                    <Textarea
                                      id={'param-value-' + draft.id}
                                      className={cn(
                                        draft.error ? 'border-red-500/70 focus-visible:ring-red-500' : undefined
                                      )}
                                      placeholder='Examples: 0.7, true, "analysis", {"foo": "bar"}'
                                      value={draft.value}
                                      rows={3}
                                      onChange={event => handleDraftChange(draft.id, 'value', event.target.value)}
                                    />
                                  </div>
                                  {draft.error && <p className="text-xs text-red-400">{draft.error}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preset-instructions-edit">Instructions</Label>
                            <Textarea
                              id="preset-instructions-edit"
                              value={formState.instructions}
                              onChange={event =>
                                setFormState(previous => ({
                                  ...previous,
                                  instructions: event.target.value
                                }))
                              }
                              placeholder="Encourage concise answers, emphasise next steps, etc."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="submit">Save changes</Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
                        Select a preset from the list or create a new one.
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  );
};
