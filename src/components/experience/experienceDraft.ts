export const persistExperienceDraft = (
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  key: string,
  serialized: string | null,
): boolean => {
  try {
    if (serialized === null) storage.removeItem(key);
    else storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
};
