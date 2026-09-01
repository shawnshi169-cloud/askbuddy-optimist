interface OptionalRowsResponse<T> {
  data: T[] | null;
  error: unknown;
}

export const resolveOptionalRows = <T>(
  result: PromiseSettledResult<OptionalRowsResponse<T>>,
): T[] => {
  if (result.status !== 'fulfilled' || result.value.error) return [];
  return result.value.data || [];
};
