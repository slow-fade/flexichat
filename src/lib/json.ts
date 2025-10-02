export type JsonParseResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const tryParseJson = (input: string): JsonParseResult => {
  try {
    const value = JSON.parse(input);
    return {
      ok: true,
      value
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    return {
      ok: false,
      error: message
    };
  }
};
