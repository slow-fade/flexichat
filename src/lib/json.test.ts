import { describe, expect, it } from 'vitest';
import { tryParseJson } from './json';

describe('tryParseJson', () => {
  it('parses valid JSON literals', () => {
    const parsed = tryParseJson('{"foo": 1, "bar": true}');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toEqual({ foo: 1, bar: true });
    }
  });

  it('returns an error for invalid JSON', () => {
    const parsed = tryParseJson('{"foo": 1,,}');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.length).toBeGreaterThan(0);
    }
  });
});
