export function buildQueryParams(
  filters: Record<string, string | number | undefined>,
  keys: string[]
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const key of keys) {
    const value = filters[key];
    if (value !== undefined && value !== '' && value !== 'All') {
      params[key] = value;
    }
  }
  return params;
}
