/**
 * Every user-facing string passes through `t()` from day one so translation is a
 * content task later. English only at launch; `t` is an identity with light
 * interpolation.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}
