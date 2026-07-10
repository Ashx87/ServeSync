/**
 * Normalizes an Express 5 route param (string | string[] | undefined)
 * to a non-empty string, or null when absent/malformed.
 */
export const requireStringParam = (
  value: string | string[] | undefined
): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};
