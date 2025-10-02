import { beforeEach, describe, expect, it } from 'vitest';
import { clearBrowserState, createLocalStore } from './browser-storage';

type SampleValue = {
  name: string;
};

const isSampleValue = (value: unknown): value is SampleValue =>
  Boolean(value) && typeof value === 'object' && typeof (value as SampleValue).name === 'string';

describe('browser-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns the default value when storage is empty', () => {
    const store = createLocalStore('test-value', { name: 'default' }, isSampleValue);
    expect(store.read()).toEqual({ name: 'default' });
  });

  it('persists and restores values', () => {
    const store = createLocalStore('test-value', { name: 'default' }, isSampleValue);
    store.write({ name: 'persisted' });
    expect(store.read()).toEqual({ name: 'persisted' });
  });

  it('falls back to default when validation fails', () => {
    const store = createLocalStore('test-value', { name: 'default' }, isSampleValue);
    localStorage.setItem('orw-test-value', '"oops"');
    expect(store.read()).toEqual({ name: 'default' });
  });

  it('clears registered keys via clearBrowserState', () => {
    const store = createLocalStore('test-value', { name: 'default' }, isSampleValue);
    store.write({ name: 'persisted' });
    expect(localStorage.getItem('orw-test-value')).not.toBeNull();
    clearBrowserState();
    expect(localStorage.getItem('orw-test-value')).toBeNull();
  });
});
