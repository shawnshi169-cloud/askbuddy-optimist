export const withEditedCity = <T extends { city: string; cityCode: string }>(form: T, city: string): T => ({
  ...form,
  city,
  cityCode: city && city === form.city ? form.cityCode : '',
});

export const cityCodeForSubmit = (form: { city: string; cityCode: string }): string | null =>
  form.city.trim() ? form.cityCode.trim() || null : null;
