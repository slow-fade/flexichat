import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOpenRouterModels } from '../api';
import type { OpenRouterModel } from '../types';

const FALLBACK_MODELS: OpenRouterModel[] = [
  { id: 'openrouter/turbo', name: 'OpenRouter Turbo' },
  { id: 'meta/llama3-70b-instruct', name: 'Meta Llama 3 70B Instruct' },
  { id: 'anthropic/claude-3-opus', name: 'Anthropic Claude 3 Opus' }
];

export type ModelOption = {
  value: string;
  label: string;
};

export const useOpenRouterModels = () => {
  const [models, setModels] = useState<OpenRouterModel[]>(FALLBACK_MODELS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchOpenRouterModels(controller.signal);
      if (fetched.length > 0) {
        setModels(fetched);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unknown error fetching models.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [load]);

  const options = useMemo<ModelOption[]>(
    () => models.map(model => ({ value: model.id, label: model.name || model.id })),
    [models]
  );

  return {
    models,
    options,
    isLoading,
    error,
    reload: load
  } as const;
};
