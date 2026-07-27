export function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && v !== undefined && typeof v === "object";
}

export function getValueOrDefault<T extends object, K extends keyof T>(config: Partial<T> | null | undefined, defaults: T, key: K): T[K] {
  const configuredValue = isObject(config) ? (config as Record<string, unknown>)[String(key)] : undefined;
  return configuredValue !== undefined ? configuredValue as T[K] : defaults[key];
}
