export function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && v !== void 0 && typeof v === "object";
}

export function getValueOrDefault<T extends object, K extends keyof T>(config: Partial<T> | null | undefined, defaults: T, key: K): T[K] {
  const configuredValue = isObject(config) ? (config as Record<string, unknown>)[String(key)] : undefined;
  return configuredValue !== void 0 ? configuredValue as T[K] : defaults[key];
}
