import { useCallback, useEffect, useMemo, useState } from 'react';
import { createId } from '../../../lib/id';
import {
  loadActivePresetId,
  loadPresets,
  resetPresets,
  saveActivePresetId,
  savePresets
} from '../state/preset-store';
import type { Preset, PresetRequestParameter } from '../types';

export type CreatePresetInput = {
  name: string;
  model: string;
  instructions: string;
  apiKey: string;
  apiEndpoint: string;
  requestParameters: PresetRequestParameter[];
};

export const usePresetState = () => {
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(() => loadActivePresetId());

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  useEffect(() => {
    saveActivePresetId(activePresetId);
  }, [activePresetId]);

  useEffect(() => {
    if (activePresetId && !presets.some(preset => preset.id === activePresetId)) {
      setActivePresetId(presets[0] ? presets[0].id : null);
    }
  }, [activePresetId, presets]);

  const activePreset = useMemo(
    () => presets.find(preset => preset.id === activePresetId) || null,
    [presets, activePresetId]
  );

  const selectPreset = useCallback((presetId: string) => {
    setActivePresetId(presetId);
  }, []);

  const createPreset = useCallback((input: CreatePresetInput) => {
    const newPreset: Preset = {
      id: createId('preset'),
      ...input
    };
    setPresets(previous => [newPreset, ...previous]);
    setActivePresetId(newPreset.id);
  }, []);

  const updatePreset = useCallback((presetId: string, patch: Partial<CreatePresetInput>) => {
    setPresets(previous =>
      previous.map(preset =>
        preset.id === presetId
          ? {
              ...preset,
              ...patch,
              requestParameters: patch.requestParameters ?? preset.requestParameters
            }
          : preset
      )
    );
  }, []);

  const removePreset = useCallback((presetId: string) => {
    setPresets(previous => {
      const next = previous.filter(preset => preset.id !== presetId);
      setActivePresetId(current => {
        if (current !== presetId) return current;
        return next[0] ? next[0].id : null;
      });
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const { presets: freshPresets, activePresetId: freshActive } = resetPresets();
    setPresets(freshPresets);
    setActivePresetId(freshActive);
  }, []);

  return {
    presets,
    activePreset,
    activePresetId,
    selectPreset,
    createPreset,
    updatePreset,
    removePreset,
    clearAll
  } as const;
};
